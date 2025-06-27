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
      handler: (get) => (data) => {
        console.log('[SUPPLIERS] WebSocket: Fournisseur mis à jour', data);
        get().dispatch?.({
          type: 'WEBSOCKET_UPDATE',
          payload: data.data || data,
        });
      },
    },
    {
      event: 'suppliers.created',
      handler: (get) => (data) => {
        console.log('[SUPPLIERS] WebSocket: Nouveau fournisseur créé', data);
        get().dispatch?.({
          type: 'WEBSOCKET_CREATE',
          payload: data.data || data,
        });
      },
    },
    {
      event: 'suppliers.deleted',
      handler: (get) => (data) => {
        console.log('[SUPPLIERS] WebSocket: Fournisseur supprimé', data);
        get().dispatch?.({
          type: 'WEBSOCKET_DELETE',
          payload: data,
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
