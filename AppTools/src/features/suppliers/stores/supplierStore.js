import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import { createCacheReducers } from '../../../utils/createCacheReducers';
import { withCacheSupport } from '../../../utils/withCacheSupport';
import apiService from '../../../services/api';
import { ENTITY_CONFIG as SUPPLIER_CONFIG } from '../constants';

// ✅ REDUCERS GÉNÉRIQUES + gestion images
const customReducers = {
  ...createCacheReducers('supplier'),
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

const customActions = {
  SET_CACHE_TIMESTAMP: 'SET_CACHE_TIMESTAMP',
  CLEAR_CACHE: 'CLEAR_CACHE',
  WEBSOCKET_UPDATE: 'WEBSOCKET_UPDATE',
  WEBSOCKET_CREATE: 'WEBSOCKET_CREATE',
  WEBSOCKET_DELETE: 'WEBSOCKET_DELETE',
  UPLOAD_IMAGE: 'UPLOAD_IMAGE',
  DELETE_IMAGE: 'DELETE_IMAGE',
};

// Store avec factory
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

// ✅ STORE WEBSOCKET SIMPLIFIÉ
export const useSupplierDataStore = createWebSocketStore({
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  apiService,
  additionalChannels: [],
  additionalEvents: [
    {
      event: 'suppliers.updated',
      handler: (get) => (data) => {
        get().dispatch?.({ type: 'WEBSOCKET_UPDATE', payload: data.data || data });
      },
    },
    {
      event: 'suppliers.created',
      handler: (get) => (data) => {
        get().dispatch?.({ type: 'WEBSOCKET_CREATE', payload: data.data || data });
      },
    },
    {
      event: 'suppliers.deleted',
      handler: (get) => (data) => {
        get().dispatch?.({ type: 'WEBSOCKET_DELETE', payload: data });
      },
    },
  ],
  // ✅ MÉTHODES CACHE GÉNÉRIQUES
  customMethods: withCacheSupport('supplier', '/api/suppliers'),
});

// ✅ WRAPPER SIMPLIFIÉ
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

// ✅ GESTION IMAGES SIMPLIFIÉE
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
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      wsStore.dispatch({
        type: 'UPLOAD_IMAGE',
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
        type: 'DELETE_IMAGE',
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
