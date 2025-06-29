import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import apiService from '../../../services/api';
import { ENTITY_CONFIG as BRAND_CONFIG } from '../constants';

// Actions personnalisées
const customActions = {
  SET_CACHE_TIMESTAMP: 'SET_CACHE_TIMESTAMP',
  CLEAR_CACHE: 'CLEAR_CACHE',
  WEBSOCKET_UPDATE: 'WEBSOCKET_UPDATE',
  WEBSOCKET_CREATE: 'WEBSOCKET_CREATE',
  WEBSOCKET_DELETE: 'WEBSOCKET_DELETE',
  UPLOAD_IMAGE: 'UPLOAD_IMAGE',
  DELETE_IMAGE: 'DELETE_IMAGE',
};

// Reducers personnalisés
const customReducers = {
  SET_CACHE_TIMESTAMP: (state, action) => ({
    ...state,
    lastFetched: action.payload.timestamp,
  }),
  CLEAR_CACHE: (state) => ({
    ...state,
    items: [],
    lastFetched: null,
    lastUpdated: null,
  }),
  WEBSOCKET_UPDATE: (state, action) => {
    console.log('🔄 WebSocket: Mise à jour marque reçue', action.payload);
    return {
      ...state,
      brands: state.brands.map((brand) =>
        brand._id === action.payload._id ? { ...brand, ...action.payload } : brand
      ),
      lastUpdated: Date.now(),
    };
  },
  WEBSOCKET_CREATE: (state, action) => {
    console.log('🆕 WebSocket: Nouvelle marque reçue', action.payload);
    const existingIndex = state.brands.findIndex((b) => b._id === action.payload._id);
    if (existingIndex >= 0) {
      return {
        ...state,
        brands: state.brands.map((brand) =>
          brand._id === action.payload._id ? { ...brand, ...action.payload } : brand
        ),
        lastUpdated: Date.now(),
      };
    } else {
      return {
        ...state,
        brands: [...state.brands, action.payload],
        lastUpdated: Date.now(),
      };
    }
  },
  WEBSOCKET_DELETE: (state, action) => {
    console.log('🗑️ WebSocket: Suppression marque reçue', action.payload);
    const brandId = action.payload.entityId || action.payload.id || action.payload;
    return {
      ...state,
      brands: state.brands.filter((brand) => brand._id !== brandId),
      lastUpdated: Date.now(),
    };
  },
  // ✅ NOUVEAUX REDUCERS POUR LES IMAGES
  UPLOAD_IMAGE: (state, action) => {
    const { id, image } = action.payload;
    return {
      ...state,
      brands: state.brands.map((brand) => (brand._id === id ? { ...brand, image } : brand)),
      lastUpdated: Date.now(),
    };
  },
  DELETE_IMAGE: (state, action) => {
    const { id } = action.payload;
    return {
      ...state,
      brands: state.brands.map((brand) => (brand._id === id ? { ...brand, image: null } : brand)),
      lastUpdated: Date.now(),
    };
  },
  // ✅ ÉTATS DE CHARGEMENT
  FETCH_START: (state) => ({
    ...state,
    loading: true,
    error: null,
  }),
  FETCH_ERROR: (state, action) => ({
    ...state,
    loading: false,
    error: action.payload,
  }),
};

// Configuration cache (10 minutes pour les marques - très stable)
const CACHE_DURATION = 10 * 60 * 1000;

// Créer le store avec la factory
const { useBrand: useBrandBase, useEntityStore: useBrandStore } = createEntityStore({
  ...BRAND_CONFIG,
  customActions,
  customReducers,
  initialState: {
    ...BRAND_CONFIG.initialState,
    lastFetched: null,
    lastUpdated: null,
  },
});

// Store WebSocket avec cache
export const useBrandDataStore = createWebSocketStore({
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  apiService,
  additionalChannels: [],
  additionalEvents: [
    // ✅ ÉVÉNEMENT SPÉCIFIQUE AUX BRANDS
    {
      event: 'brands.updated',
      handler: (get) => (eventData) => {
        console.log('[BRANDS] WebSocket: Mise à jour directe brand', eventData);

        // ✅ VÉRIFICATION DES DONNÉES
        if (!eventData || (!eventData._id && !eventData.entityId)) {
          console.warn('[BRANDS] Événement WebSocket sans ID:', eventData);
          return;
        }

        // ✅ GÉRER LE CAS OÙ data = 1 (nombre de docs modifiés)
        if (eventData.data === 1 || typeof eventData.data === 'number') {
          console.log('[BRANDS] Données numériques reçues, fetch individuel nécessaire');
          const brandId = eventData.entityId || eventData._id;
          if (brandId) {
            // Utiliser la méthode fetchSingleItem de createWebSocketStore
            const { fetchSingleItem } = get();
            if (fetchSingleItem) {
              fetchSingleItem(brandId).catch((err) => {
                console.error('[BRANDS] Erreur fetch individuel:', err);
              });
            }
          }
          return;
        }

        // ✅ EXTRACTION DES DONNÉES
        let brandData;
        if (eventData._id) {
          brandData = eventData;
        } else if (eventData.data && eventData.data._id) {
          brandData = eventData.data;
        } else if (eventData.entityId && eventData.data && typeof eventData.data === 'object') {
          brandData = { ...eventData.data, _id: eventData.entityId };
        } else {
          console.warn('[BRANDS] Format WebSocket non reconnu:', eventData);
          return;
        }

        // ✅ UTILISER LA MÊME APPROCHE QUE LES CATÉGORIES
        const currentState = get();
        const currentBrands = currentState.brands || [];
        const updatedBrands = currentBrands.map((brand) =>
          brand._id === brandData._id ? { ...brand, ...brandData } : brand
        );

        if (updatedBrands.some((b) => b._id === brandData._id)) {
          // ✅ UTILISER useBrandDataStore.setState directement
          useBrandDataStore.setState({
            brands: updatedBrands,
            lastUpdate: Date.now(),
          });
          console.log(`✅ [BRANDS] Brand mis à jour: ${brandData._id}`);
        } else {
          console.log(`⚠️ [BRANDS] Brand ${brandData._id} non trouvé dans le store local`);
        }
      },
    },
    {
      event: 'entity.updated',
      handler: (get) => (eventData) => {
        // Vérifier que c'est bien pour les brands
        if (eventData.entityType !== 'brands') return;

        console.log('[BRANDS] WebSocket: Marque mise à jour (entité générique)', eventData);

        // ✅ GÉRER LE CAS data = 1
        if (eventData.data === 1 || typeof eventData.data === 'number') {
          console.log('[BRANDS] Données numériques reçues (entity.updated), fetch individuel');
          const brandId = eventData.id || eventData.entityId;
          if (brandId) {
            const { fetchSingleItem } = get();
            if (fetchSingleItem) {
              fetchSingleItem(brandId).catch((err) => {
                console.error('[BRANDS] Erreur fetch individuel (entity):', err);
              });
            }
          }
          return;
        }

        let brandData;
        if (eventData.data && eventData.id) {
          brandData = { ...eventData.data, _id: eventData.id };
        } else {
          console.warn('[BRANDS] Format de données WebSocket non reconnu:', eventData);
          return;
        }

        const currentBrands = get().brands || [];
        const updatedBrands = currentBrands.map((brand) =>
          brand._id === brandData._id ? { ...brand, ...brandData } : brand
        );

        // ✅ CORRECTION SET()
        const { set } = get();
        set({
          brands: updatedBrands,
          lastUpdate: Date.now(),
        });
      },
    },
    {
      event: 'entity.created',
      handler: (get) => (eventData) => {
        if (eventData.entityType !== 'brands') return;

        console.log('[BRANDS] WebSocket: Nouvelle marque créée', eventData);

        let brandData;
        if (eventData.data && eventData.data._id) {
          brandData = eventData.data;
        } else {
          console.warn('[BRANDS] Format de données WebSocket non reconnu:', eventData);
          return;
        }

        const currentBrands = get().brands || [];
        const exists = currentBrands.some((b) => b._id === brandData._id);

        if (!exists) {
          const { set } = get();
          set({
            brands: [...currentBrands, brandData],
            lastUpdate: Date.now(),
          });
        }
      },
    },
    {
      event: 'entity.deleted',
      handler: (get) => (eventData) => {
        if (eventData.entityType !== 'brands') return;

        console.log('[BRANDS] WebSocket: Marque supprimée', eventData);

        const brandId = eventData.id || eventData.entityId;
        const currentBrands = get().brands || [];
        const filteredBrands = currentBrands.filter((brand) => brand._id !== brandId);

        const { set } = get();
        set({
          brands: filteredBrands,
          lastUpdate: Date.now(),
        });
      },
    },
  ],
  customMethods: (set, get) => ({
    dispatch: (action) => {
      const state = get();
      const reducer = customReducers[action.type];
      if (reducer) {
        set(reducer(state, action));
      } else {
        console.warn(`[BRANDS] Action non trouvée: ${action.type}`);
      }
    },

    fetchBrands: async (forceRefresh = false, params = {}) => {
      const state = get();
      const now = Date.now();

      // Vérifier cache (seulement si pas de params spécifiques)
      if (
        !forceRefresh &&
        Object.keys(params).length === 0 &&
        state.brands?.length > 0 &&
        state.lastFetched &&
        now - state.lastFetched < CACHE_DURATION
      ) {
        console.log('📦 Utilisation du cache des marques');
        return state.brands;
      }

      try {
        set({ loading: true, error: null });
        console.log("🔄 Fetch des marques depuis l'API...");

        const { page = 1, limit = 100, sort = 'name', order = 'asc', ...filters } = params;

        const queryParams = new URLSearchParams({
          page,
          limit,
          sort,
          order,
          ...filters,
        });

        const url = `${BRAND_CONFIG.apiEndpoint}?${queryParams.toString()}`;
        const response = await apiService.get(url);
        const brands = response.data.data || response.data;

        set({
          brands,
          loading: false,
          error: null,
          lastFetched: now,
        });

        console.log(`✅ ${brands.length} marques chargées et mises en cache`);
        return brands;
      } catch (error) {
        console.error('❌ Erreur lors du fetch des marques:', error);
        set({
          error: error.response?.data?.message || error.message || 'Erreur de chargement',
          loading: false,
        });
        throw error;
      }
    },

    refreshBrands: async () => {
      console.log('🔄 Refresh forcé des marques...');
      return get().fetchBrands(true);
    },

    isCacheValid: () => {
      const state = get();
      const now = Date.now();
      return state.lastFetched && now - state.lastFetched < CACHE_DURATION;
    },

    clearCache: () => {
      console.log('🗑️ Cache des marques nettoyé');
      set({
        brands: [],
        lastFetched: null,
        lastUpdated: null,
      });
    },

    invalidateCache: () => {
      console.log('❌ Cache des marques invalidé');
      set({
        lastFetched: null,
      });
    },
  }),
});

// Wrapper useBrand avec WebSocket intégré
export function useBrand() {
  const brandStore = useBrandBase();

  return {
    ...brandStore,
    initWebSocketListeners: () => {
      const wsStore = useBrandDataStore.getState();
      const cleanup = wsStore.initWebSocket();
      console.log('🔌 WebSocket listeners initialisés pour les marques');
      return cleanup;
    },
    fetchBrands: async (params = {}) => {
      const wsStore = useBrandDataStore.getState();
      return wsStore.fetchBrands(false, params);
    },
  };
}

export { useBrandStore };

// ✅ FONCTION ENRICHIE AVEC GESTION D'IMAGES
export function useBrandExtras() {
  const brandStore = useBrand();

  const uploadImage = async (brandId, file) => {
    const wsStore = useBrandDataStore.getState();

    try {
      wsStore.dispatch({ type: 'FETCH_START' });

      const formData = new FormData();
      formData.append('image', file);

      const response = await apiService.post(
        `${BRAND_CONFIG.apiEndpoint}/${brandId}/image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      wsStore.dispatch({
        type: customActions.UPLOAD_IMAGE,
        payload: { id: brandId, image: response.data.data?.image },
      });

      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'upload d'image:", error);
      wsStore.dispatch({ type: 'FETCH_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteImage = async (brandId) => {
    const wsStore = useBrandDataStore.getState();

    try {
      wsStore.dispatch({ type: 'FETCH_START' });

      const response = await apiService.delete(`${BRAND_CONFIG.apiEndpoint}/${brandId}/image`);

      wsStore.dispatch({
        type: customActions.DELETE_IMAGE,
        payload: { id: brandId },
      });

      return response.data;
    } catch (error) {
      console.error("Erreur lors de la suppression d'image:", error);
      wsStore.dispatch({ type: 'FETCH_ERROR', payload: error.message });
      throw error;
    }
  };

  return {
    ...brandStore,
    uploadImage,
    deleteImage,
    syncBrand: brandStore.syncBrand,
  };
}
