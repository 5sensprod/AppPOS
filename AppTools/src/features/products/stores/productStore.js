import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import { createCacheReducers } from '../../../utils/createCacheReducers';
import { withCacheSupport } from '../../../utils/withCacheSupport';
import apiService from '../../../services/api';
import { ENTITY_CONFIG } from '../constants';

// ✅ REDUCERS GÉNÉRIQUES + custom produits
const customReducers = {
  ...createCacheReducers('product'),
  UPDATE_STOCK: (state, action) => ({
    ...state,
    items: state.items.map((item) =>
      item._id === action.payload.id ? { ...item, stock: action.payload.stock } : item
    ),
    loading: false,
    lastUpdated: Date.now(),
  }),
  SET_MAIN_IMAGE: (state, action) => ({
    ...state,
    items: state.items.map((item) =>
      item._id === action.payload.id ? { ...item, ...action.payload.data } : item
    ),
    loading: false,
    lastUpdated: Date.now(),
  }),
  UPLOAD_GALLERY_IMAGE: (state, action) => ({
    ...state,
    items: state.items.map((item) => {
      if (item._id === action.payload.id) {
        const gallery_images = item.gallery_images || [];
        return { ...item, gallery_images: [...gallery_images, action.payload.image] };
      }
      return item;
    }),
    loading: false,
    lastUpdated: Date.now(),
  }),
  DELETE_GALLERY_IMAGE: (state, action) => ({
    ...state,
    items: state.items.map((item) => {
      if (item._id === action.payload.id) {
        const gallery_images = item.gallery_images || [];
        return {
          ...item,
          gallery_images: gallery_images.filter(
            (img, index) => index !== action.payload.imageIndex
          ),
        };
      }
      return item;
    }),
    loading: false,
    lastUpdated: Date.now(),
  }),
  SYNC_PRODUCT: (state, action) => ({
    ...state,
    items: state.items.map((item) =>
      item._id === action.payload.id ? { ...item, ...action.payload.data } : item
    ),
    loading: false,
    lastUpdated: Date.now(),
  }),
};

const customActions = {
  UPDATE_STOCK: 'UPDATE_STOCK',
  SET_MAIN_IMAGE: 'SET_MAIN_IMAGE',
  UPLOAD_GALLERY_IMAGE: 'UPLOAD_GALLERY_IMAGE',
  DELETE_GALLERY_IMAGE: 'DELETE_GALLERY_IMAGE',
  SYNC_PRODUCT: 'SYNC_PRODUCT',
  SET_CACHE_TIMESTAMP: 'SET_CACHE_TIMESTAMP',
  CLEAR_CACHE: 'CLEAR_CACHE',
  WEBSOCKET_UPDATE: 'WEBSOCKET_UPDATE',
  WEBSOCKET_CREATE: 'WEBSOCKET_CREATE',
  WEBSOCKET_DELETE: 'WEBSOCKET_DELETE',
};

// Store avec factory
const { useProduct: useProductBase, useEntityStore: useProductStore } = createEntityStore({
  ...ENTITY_CONFIG,
  customActions,
  customReducers,
  initialState: {
    ...ENTITY_CONFIG.initialState,
    lastFetched: null,
    lastUpdated: null,
  },
});

// ✅ STORE WEBSOCKET SIMPLIFIÉ
export const useProductDataStore = createWebSocketStore({
  entityName: 'product',
  apiEndpoint: '/api/products',
  apiService,
  additionalChannels: ['categories'],
  additionalEvents: [
    {
      event: 'categories.tree.changed',
      handler: (get) => (data) => {
        console.log('[PRODUCTS] Événement categories.tree.changed reçu', data);
        get().clearCache();
        setTimeout(() => get().fetchProducts(true), 500);
      },
    },
    {
      event: 'products.updated',
      handler: (get) => (data) => {
        get().dispatch?.({ type: 'WEBSOCKET_UPDATE', payload: data.data || data });
      },
    },
    {
      event: 'products.created',
      handler: (get) => (data) => {
        get().dispatch?.({ type: 'WEBSOCKET_CREATE', payload: data.data || data });
      },
    },
    {
      event: 'products.deleted',
      handler: (get) => (data) => {
        get().dispatch?.({ type: 'WEBSOCKET_DELETE', payload: data });
      },
    },
  ],
  // ✅ MÉTHODES CACHE GÉNÉRIQUES + custom produits
  customMethods: withCacheSupport('product', '/api/products', (set, get) => ({
    updateProductsStatus: async (productIds, newStatus) => {
      try {
        set({ loading: true, error: null });

        const response = await apiService.post('/api/products/batch-status', {
          productIds,
          status: newStatus,
        });

        if (response.data.success) {
          set((state) => {
            const updatedProducts = state.products.map((product) => {
              if (productIds.includes(product._id)) {
                return {
                  ...product,
                  status: newStatus,
                  pending_sync: product.woo_id ? true : product.pending_sync,
                };
              }
              return product;
            });

            return {
              ...state,
              products: updatedProducts,
              loading: false,
              lastUpdated: Date.now(),
            };
          });
        } else {
          set({ error: response.data.message || 'Échec de mise à jour du statut', loading: false });
        }

        return response.data;
      } catch (error) {
        console.error('Erreur lors de la mise à jour du statut des produits:', error);
        set({
          error:
            error.response?.data?.message || error.message || 'Erreur de mise à jour du statut',
          loading: false,
        });
        throw error;
      }
    },
  })),
});

// ✅ WRAPPER AVEC SYNC SPÉCIFIQUE
export function useProduct() {
  const productStore = useProductBase();
  const store = useProductStore();

  const syncProduct = async (productId) => {
    console.log(`🔄 Synchronisation du produit #${productId}`);
    store.dispatch({ type: 'FETCH_START' });

    try {
      const response = await apiService.post(`/api/products/${productId}/sync`);
      console.log(`✅ Produit synchronisé avec succès:`, response.data);

      store.dispatch({
        type: customActions.SYNC_PRODUCT,
        payload: { id: productId, data: response.data.data || {} },
      });

      return response.data;
    } catch (error) {
      console.error(`❌ Erreur lors de la synchronisation du produit #${productId}:`, error);
      store.dispatch({ type: 'FETCH_ERROR', payload: error.message });
      throw error;
    }
  };

  return {
    ...productStore,
    syncProduct,
    initWebSocketListeners: () => {
      const wsStore = useProductDataStore.getState();
      const cleanup = wsStore.initWebSocket();
      console.log('🔌 WebSocket listeners initialisés pour les produits');
      return cleanup;
    },
  };
}

export { useProductStore };

// ✅ GESTION IMAGES/EXTRAS SIMPLIFIÉE
export function useProductExtras() {
  const store = useProductStore();
  const { syncProduct } = useProduct();

  const setMainImage = async (productId, imageIndex) => {
    store.dispatch({ type: 'FETCH_START' });
    try {
      const response = await apiService.put(`/api/products/${productId}/main-image`, {
        imageIndex,
      });
      store.dispatch({
        type: customActions.SET_MAIN_IMAGE,
        payload: { id: productId, data: response.data.data },
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la définition de l'image principale:", error);
      store.dispatch({ type: 'FETCH_ERROR', payload: error.message });
      throw error;
    }
  };

  const uploadGalleryImage = async (productId, imageFile) => {
    store.dispatch({ type: 'FETCH_START' });
    try {
      const formData = new FormData();
      formData.append('images', imageFile);

      const response = await apiService.post(`/api/products/${productId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      store.dispatch({
        type: customActions.UPLOAD_GALLERY_IMAGE,
        payload: { id: productId, image: response.data.data.image },
      });

      return response.data;
    } catch (error) {
      console.error("Erreur lors du téléchargement de l'image de galerie:", error);
      store.dispatch({ type: 'FETCH_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteGalleryImage = async (productId, imageIndex) => {
    store.dispatch({ type: 'FETCH_START' });
    try {
      const response = await apiService.get(`/api/products/${productId}`);
      const product = response.data.data;

      if (!product.gallery_images || !product.gallery_images[imageIndex]) {
        throw new Error('Image non trouvée');
      }

      const imageId = product.gallery_images[imageIndex]._id;
      await apiService.delete(`/api/products/${productId}/gallery/${imageId}`);

      store.dispatch({
        type: customActions.DELETE_GALLERY_IMAGE,
        payload: { id: productId, imageIndex },
      });

      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image de galerie:", error);
      store.dispatch({ type: 'FETCH_ERROR', payload: error.message });
      throw error;
    }
  };

  return {
    ...useProduct(),
    syncProduct,
    setMainImage,
    uploadGalleryImage,
    deleteGalleryImage,
  };
}
