//AppTools\src\features\suppliers\stores\supplierStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import apiService from '../../../services/api';
import { ENTITY_CONFIG as SUPPLIER_CONFIG } from '../constants';

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
    console.log('🔄 WebSocket: Mise à jour fournisseur reçue', action.payload);
    return {
      ...state,
      suppliers: state.suppliers.map((supplier) =>
        supplier._id === action.payload._id ? { ...supplier, ...action.payload } : supplier
      ),
      lastUpdated: Date.now(),
    };
  },
  WEBSOCKET_CREATE: (state, action) => {
    console.log('🆕 WebSocket: Nouveau fournisseur reçu', action.payload);
    const existingIndex = state.suppliers.findIndex((s) => s._id === action.payload._id);
    if (existingIndex >= 0) {
      return {
        ...state,
        suppliers: state.suppliers.map((supplier) =>
          supplier._id === action.payload._id ? { ...supplier, ...action.payload } : supplier
        ),
        lastUpdated: Date.now(),
      };
    } else {
      return {
        ...state,
        suppliers: [...state.suppliers, action.payload],
        lastUpdated: Date.now(),
      };
    }
  },
  WEBSOCKET_DELETE: (state, action) => {
    console.log('🗑️ WebSocket: Suppression fournisseur reçue', action.payload);
    const supplierId = action.payload.entityId || action.payload.id || action.payload;
    return {
      ...state,
      suppliers: state.suppliers.filter((supplier) => supplier._id !== supplierId),
      lastUpdated: Date.now(),
    };
  },
  UPLOAD_IMAGE: (state, action) => {
    const { id, image } = action.payload;
    return {
      ...state,
      suppliers: state.suppliers.map((supplier) =>
        supplier._id === id ? { ...supplier, image } : supplier
      ),
      lastUpdated: Date.now(),
    };
  },
  DELETE_IMAGE: (state, action) => {
    const { id } = action.payload;
    return {
      ...state,
      suppliers: state.suppliers.map((supplier) =>
        supplier._id === id ? { ...supplier, image: null } : supplier
      ),
      lastUpdated: Date.now(),
    };
  },
};

// Configuration cache (8 minutes pour les fournisseurs - moyennement stable)
const CACHE_DURATION = 8 * 60 * 1000;

// Créer le store avec la factory
const { useSupplier: useSupplierBase, useEntityStore: useSupplierStore } = createEntityStore({
  ...SUPPLIER_CONFIG,
  customActions,
  customReducers,
  initialState: {
    ...SUPPLIER_CONFIG.initialState,
    lastFetched: null,
    lastUpdated: null,
  },
});

// Store WebSocket avec cache
export const useSupplierDataStore = createWebSocketStore({
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  apiService,
  additionalChannels: [],
  additionalEvents: [
    {
      event: 'suppliers.updated',
      handler: (get) => (eventData) => {
        console.log('[SUPPLIERS] WebSocket: Mise à jour directe supplier', eventData);

        // ✅ VÉRIFICATION DES DONNÉES
        if (!eventData || (!eventData._id && !eventData.entityId)) {
          console.warn('[SUPPLIERS] Événement WebSocket sans ID:', eventData);
          return;
        }

        // ✅ GÉRER LE CAS OÙ data = 1 (nombre de docs modifiés)
        if (eventData.data === 1 || typeof eventData.data === 'number') {
          console.log('[SUPPLIERS] Données numériques reçues, fetch individuel nécessaire');
          const supplierId = eventData.entityId || eventData._id;
          if (supplierId) {
            const { fetchSingleItem } = get();
            if (fetchSingleItem) {
              fetchSingleItem(supplierId).catch((err) => {
                console.error('[SUPPLIERS] Erreur fetch individuel:', err);
              });
            }
          }
          return;
        }

        // Extraire les données du supplier
        let supplierData;
        if (eventData._id) {
          supplierData = eventData;
        } else if (eventData.data && eventData.data._id) {
          supplierData = eventData.data;
        } else if (eventData.entityId && eventData.data && typeof eventData.data === 'object') {
          supplierData = { ...eventData.data, _id: eventData.entityId };
        } else {
          console.warn('[SUPPLIERS] Format WebSocket non reconnu:', eventData);
          return;
        }

        // ✅ UTILISER LA MÊME APPROCHE QUE LES CATÉGORIES
        const currentState = get();
        const currentSuppliers = currentState.suppliers || [];
        const updatedSuppliers = currentSuppliers.map((supplier) =>
          supplier._id === supplierData._id ? { ...supplier, ...supplierData } : supplier
        );

        if (updatedSuppliers.some((s) => s._id === supplierData._id)) {
          // ✅ UTILISER useSupplierDataStore.setState directement
          useSupplierDataStore.setState({
            suppliers: updatedSuppliers,
            lastUpdate: Date.now(),
          });
          console.log(`✅ [SUPPLIERS] Supplier mis à jour: ${supplierData._id}`);
        } else {
          console.log(`⚠️ [SUPPLIERS] Supplier ${supplierData._id} non trouvé dans le store local`);
        }
      },
    },
    {
      event: 'entity.updated',
      handler: (get) => (eventData) => {
        if (eventData.entityType !== 'suppliers') return;

        console.log('[SUPPLIERS] WebSocket: Fournisseur mis à jour (entité générique)', eventData);

        // ✅ GÉRER LE CAS data = 1
        if (eventData.data === 1 || typeof eventData.data === 'number') {
          console.log('[SUPPLIERS] Données numériques reçues (entity.updated), fetch individuel');
          const supplierId = eventData.id || eventData.entityId;
          if (supplierId) {
            const { fetchSingleItem } = get();
            if (fetchSingleItem) {
              fetchSingleItem(supplierId).catch((err) => {
                console.error('[SUPPLIERS] Erreur fetch individuel (entity):', err);
              });
            }
          }
          return;
        }

        let supplierData;
        if (eventData.data && eventData.id) {
          supplierData = { ...eventData.data, _id: eventData.id };
        } else {
          console.warn('[SUPPLIERS] Format de données WebSocket non reconnu:', eventData);
          return;
        }

        const currentState = get();
        const currentSuppliers = currentState.suppliers || [];
        const updatedSuppliers = currentSuppliers.map((supplier) =>
          supplier._id === supplierData._id ? { ...supplier, ...supplierData } : supplier
        );

        // ✅ UTILISER useSupplierDataStore.setState
        useSupplierDataStore.setState({
          suppliers: updatedSuppliers,
          lastUpdate: Date.now(),
        });
      },
    },
    {
      event: 'entity.created',
      handler: (get) => (eventData) => {
        if (eventData.entityType !== 'suppliers') return;

        console.log('[SUPPLIERS] WebSocket: Nouveau fournisseur créé', eventData);

        let supplierData;
        if (eventData.data && eventData.data._id) {
          supplierData = eventData.data;
        } else {
          console.warn('[SUPPLIERS] Format de données WebSocket non reconnu:', eventData);
          return;
        }

        const currentState = get();
        const currentSuppliers = currentState.suppliers || [];
        const exists = currentSuppliers.some((s) => s._id === supplierData._id);

        if (!exists) {
          useSupplierDataStore.setState({
            suppliers: [...currentSuppliers, supplierData],
            lastUpdate: Date.now(),
          });
        }
      },
    },
    {
      event: 'entity.deleted',
      handler: (get) => (eventData) => {
        if (eventData.entityType !== 'suppliers') return;

        console.log('[SUPPLIERS] WebSocket: Fournisseur supprimé', eventData);

        const supplierId = eventData.id || eventData.entityId;
        const currentState = get();
        const currentSuppliers = currentState.suppliers || [];
        const filteredSuppliers = currentSuppliers.filter(
          (supplier) => supplier._id !== supplierId
        );

        useSupplierDataStore.setState({
          suppliers: filteredSuppliers,
          lastUpdate: Date.now(),
        });
      },
    },
    {
      event: 'suppliers.tree.changed',
      handler: (get) => (eventData) => {
        console.log('[SUPPLIERS] Tree changed → invalidation cache');
        const { clearCache } = get();
        clearCache();
        // Optionnel : refetch automatique
        setTimeout(() => {
          const { fetchSuppliers } = get();
          fetchSuppliers(true);
        }, 500);
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
        console.warn(`[SUPPLIERS] Action non trouvée: ${action.type}`);
      }
    },

    fetchSuppliers: async (forceRefresh = false) => {
      const state = get();
      const now = Date.now();

      // Vérifier cache
      if (
        !forceRefresh &&
        state.suppliers?.length > 0 &&
        state.lastFetched &&
        now - state.lastFetched < CACHE_DURATION
      ) {
        console.log('📦 Utilisation du cache des fournisseurs');
        return state.suppliers;
      }

      try {
        set({ loading: true, error: null });
        console.log("🔄 Fetch des fournisseurs depuis l'API...");

        const response = await apiService.get('/api/suppliers');
        const suppliers = response.data.data || [];

        set({
          suppliers,
          loading: false,
          error: null,
          lastFetched: now,
        });

        console.log(`✅ ${suppliers.length} fournisseurs chargés et mis en cache`);
        return suppliers;
      } catch (error) {
        console.error('❌ Erreur lors du fetch des fournisseurs:', error);
        set({
          error: error.response?.data?.message || error.message || 'Erreur de chargement',
          loading: false,
        });
        throw error;
      }
    },

    refreshSuppliers: async () => {
      console.log('🔄 Refresh forcé des fournisseurs...');
      return get().fetchSuppliers(true);
    },

    isCacheValid: () => {
      const state = get();
      const now = Date.now();
      return state.lastFetched && now - state.lastFetched < CACHE_DURATION;
    },

    clearCache: () => {
      console.log('🗑️ Cache des fournisseurs nettoyé');
      set({
        suppliers: [],
        lastFetched: null,
        lastUpdated: null,
      });
    },

    invalidateCache: () => {
      console.log('❌ Cache des fournisseurs invalidé');
      set({
        lastFetched: null,
      });
    },
  }),
});

// Wrapper useSupplier avec WebSocket intégré
export function useSupplier() {
  const supplierStore = useSupplierBase();

  return {
    ...supplierStore,
    initWebSocketListeners: () => {
      const wsStore = useSupplierDataStore.getState();
      const cleanup = wsStore.initWebSocket();
      console.log('🔌 WebSocket listeners initialisés pour les fournisseurs');
      return cleanup;
    },
  };
}

export { useSupplierStore };

export function useSupplierExtras() {
  const supplierStore = useSupplier();

  const uploadImage = async (supplierId, file) => {
    const wsStore = useSupplierDataStore.getState();

    try {
      wsStore.dispatch({ type: 'FETCH_START' });

      const formData = new FormData();
      formData.append('image', file);

      const response = await apiService.post(
        `${SUPPLIER_CONFIG.apiEndpoint}/${supplierId}/image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      wsStore.dispatch({
        type: customActions.UPLOAD_IMAGE,
        payload: { id: supplierId, image: response.data.data?.image },
      });

      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'upload d'image:", error);
      wsStore.dispatch({ type: 'FETCH_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteImage = async (supplierId) => {
    const wsStore = useSupplierDataStore.getState();

    try {
      wsStore.dispatch({ type: 'FETCH_START' });

      const response = await apiService.delete(
        `${SUPPLIER_CONFIG.apiEndpoint}/${supplierId}/image`
      );

      wsStore.dispatch({
        type: customActions.DELETE_IMAGE,
        payload: { id: supplierId },
      });

      return response.data;
    } catch (error) {
      console.error("Erreur lors de la suppression d'image:", error);
      wsStore.dispatch({ type: 'FETCH_ERROR', payload: error.message });
      throw error;
    }
  };

  return {
    ...supplierStore,
    uploadImage,
    deleteImage,
  };
}
