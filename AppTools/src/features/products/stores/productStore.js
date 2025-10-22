// src/features/products/stores/productStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import { ENTITY_CONFIG } from '../constants';
import apiService from '../../../services/api';

// Actions personnalisées spécifiques aux produits
const customActions = {
  UPDATE_STOCK: 'UPDATE_STOCK',
  SET_MAIN_IMAGE: 'SET_MAIN_IMAGE',
  UPLOAD_GALLERY_IMAGE: 'UPLOAD_GALLERY_IMAGE',
  DELETE_GALLERY_IMAGE: 'DELETE_GALLERY_IMAGE',
  SYNC_PRODUCT: 'SYNC_PRODUCT',
  UNSYNC_PRODUCT: 'UNSYNC_PRODUCT',
  // ✅ ACTIONS POUR LE CACHE AVEC WEBSOCKET
  SET_CACHE_TIMESTAMP: 'SET_CACHE_TIMESTAMP',
  CLEAR_CACHE: 'CLEAR_CACHE',
  WEBSOCKET_UPDATE: 'WEBSOCKET_UPDATE',
  WEBSOCKET_CREATE: 'WEBSOCKET_CREATE',
  WEBSOCKET_DELETE: 'WEBSOCKET_DELETE',
};

// Reducers personnalisés spécifiques aux produits
const customReducers = {
  UPDATE_STOCK: (state, action) => {
    return {
      ...state,
      items: state.items.map((item) =>
        item._id === action.payload.id ? { ...item, stock: action.payload.stock } : item
      ),
      loading: false,
      lastUpdated: Date.now(),
    };
  },
  SET_MAIN_IMAGE: (state, action) => {
    return {
      ...state,
      items: state.items.map((item) =>
        item._id === action.payload.id ? { ...item, ...action.payload.data } : item
      ),
      loading: false,
      lastUpdated: Date.now(),
    };
  },
  UPLOAD_GALLERY_IMAGE: (state, action) => {
    return {
      ...state,
      items: state.items.map((item) => {
        if (item._id === action.payload.id) {
          const gallery_images = item.gallery_images || [];
          return {
            ...item,
            gallery_images: [...gallery_images, action.payload.image],
          };
        }
        return item;
      }),
      loading: false,
      lastUpdated: Date.now(),
    };
  },
  DELETE_GALLERY_IMAGE: (state, action) => {
    return {
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
    };
  },
  SYNC_PRODUCT: (state, action) => {
    return {
      ...state,
      items: state.items.map((item) =>
        item._id === action.payload.id ? { ...item, ...action.payload.data } : item
      ),
      loading: false,
      lastUpdated: Date.now(),
    };
  },

  UNSYNC_PRODUCT: (state, action) => {
    return {
      ...state,
      items: state.items.map((item) =>
        item._id === action.payload.id
          ? {
              ...item,
              woo_id: null,
              last_sync: null,
              woo_status: null,
              pending_sync: false,
              website_url: null,
              sync_errors: null,
            }
          : item
      ),
      loading: false,
      lastUpdated: Date.now(),
    };
  },

  // ✅ REDUCERS POUR LE CACHE
  SET_CACHE_TIMESTAMP: (state, action) => {
    return {
      ...state,
      lastFetched: action.payload.timestamp,
    };
  },
  CLEAR_CACHE: (state) => {
    return {
      ...state,
      items: [],
      lastFetched: null,
      lastUpdated: null,
    };
  },
  // ✅ REDUCERS WEBSOCKET QUI MAINTIENNENT LE CACHE
  WEBSOCKET_UPDATE: (state, action) => {
    console.log('🔄 WebSocket: Mise à jour produit reçue', action.payload);
    return {
      ...state,
      products: state.products.map((product) =>
        product._id === action.payload._id ? { ...product, ...action.payload } : product
      ),
      lastUpdated: Date.now(), // ✅ Marquer comme mis à jour sans invalider le cache
    };
  },
  WEBSOCKET_CREATE: (state, action) => {
    console.log('🆕 WebSocket: Nouveau produit reçu', action.payload);
    // Vérifier si le produit existe déjà
    const existingIndex = state.products.findIndex((p) => p._id === action.payload._id);
    if (existingIndex >= 0) {
      // Mettre à jour le produit existant
      return {
        ...state,
        products: state.products.map((product) =>
          product._id === action.payload._id ? { ...product, ...action.payload } : product
        ),
        lastUpdated: Date.now(),
      };
    } else {
      // Ajouter le nouveau produit
      return {
        ...state,
        products: [...state.products, action.payload],
        lastUpdated: Date.now(),
      };
    }
  },
  WEBSOCKET_DELETE: (state, action) => {
    console.log('🗑️ WebSocket: Suppression produit reçue', action.payload);
    const productId = action.payload.entityId || action.payload.id || action.payload;
    return {
      ...state,
      products: state.products.filter((product) => product._id !== productId),
      lastUpdated: Date.now(),
    };
  },
};

// ✅ CONFIGURATION DU CACHE (5 minutes par défaut)
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Créer le store avec la factory
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

// Créer le store WebSocket avec la factory
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
        // ✅ Invalider le cache quand les catégories changent
        get().clearCache();
        setTimeout(() => {
          get().fetchProducts(true); // Force refresh
        }, 500);
      },
    },
    // ✅ GESTION EXPLICITE DES ÉVÉNEMENTS WEBSOCKET PRODUITS
    {
      event: 'products.updated',
      handler: (get) => (data) => {
        console.log('[PRODUCTS] WebSocket: Produit mis à jour', data);
        get().dispatch?.({
          type: 'WEBSOCKET_UPDATE',
          payload: data.data || data,
        });
      },
    },
    {
      event: 'products.created',
      handler: (get) => (data) => {
        console.log('[PRODUCTS] WebSocket: Nouveau produit créé', data);
        get().dispatch?.({
          type: 'WEBSOCKET_CREATE',
          payload: data.data || data,
        });
      },
    },
    {
      event: 'products.deleted',
      handler: (get) => (data) => {
        console.log('[PRODUCTS] WebSocket: Produit supprimé', data);
        get().dispatch?.({
          type: 'WEBSOCKET_DELETE',
          payload: data,
        });
      },
    },
  ],
  customMethods: (set, get) => ({
    // ✅ DISPATCH POUR LES REDUCERS PERSONNALISÉS
    dispatch: (action) => {
      const state = get();
      const reducer = customReducers[action.type];
      if (reducer) {
        set(reducer(state, action));
      } else {
        console.warn(`[PRODUCTS] Action non trouvée: ${action.type}`);
      }
    },

    // ✅ FETCHPRODUCTS OPTIMISÉ AVEC CACHE ET WEBSOCKET
    fetchProducts: async (forceRefresh = false) => {
      const state = get();
      const now = Date.now();

      // ✅ VÉRIFIER SI LE CACHE EST ENCORE VALIDE
      if (
        !forceRefresh &&
        state.products?.length > 0 &&
        state.lastFetched &&
        now - state.lastFetched < CACHE_DURATION
      ) {
        console.log('📦 Utilisation du cache des produits (encore frais)');
        return state.products;
      }

      try {
        set({ loading: true, error: null });
        console.log("🔄 Fetch des produits depuis l'API...");

        const response = await apiService.get('/api/products');
        const products = response.data.data || [];

        set({
          products,
          loading: false,
          error: null,
          lastFetched: now, // ✅ Marquer le timestamp du fetch
        });

        console.log(`✅ ${products.length} produits chargés et mis en cache`);
        return products;
      } catch (error) {
        console.error('❌ Erreur lors du fetch des produits:', error);
        set({
          error: error.response?.data?.message || error.message || 'Erreur de chargement',
          loading: false,
        });
        throw error;
      }
    },

    // ✅ REFRESH FORCÉ
    refreshProducts: async () => {
      console.log('🔄 Refresh forcé des produits...');
      return get().fetchProducts(true);
    },

    // ✅ VÉRIFICATION DE LA VALIDITÉ DU CACHE
    isCacheValid: () => {
      const state = get();
      const now = Date.now();
      return state.lastFetched && now - state.lastFetched < CACHE_DURATION;
    },

    // ✅ NETTOYAGE DU CACHE
    clearCache: () => {
      console.log('🗑️ Cache des produits nettoyé');
      set({
        products: [],
        lastFetched: null,
        lastUpdated: null,
      });
    },

    // ✅ MÉTHODE POUR INVALIDER LE CACHE (utile après certaines opérations)
    invalidateCache: () => {
      console.log('❌ Cache des produits invalidé');
      set({
        lastFetched: null, // Invalider sans vider les données
      });
    },

    updateProductsStatus: async (productIds, newStatus) => {
      try {
        set({ loading: true, error: null });

        const response = await apiService.post('/api/products/batch-status', {
          productIds,
          status: newStatus,
        });

        if (response.data.success) {
          // ✅ MISE À JOUR LOCALE + CACHE MAINTENU
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
              lastUpdated: Date.now(), // ✅ Maintenir le cache mais marquer la MAJ
            };
          });
        } else {
          set({
            error: response.data.message || 'Échec de mise à jour du statut',
            loading: false,
          });
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
  }),
});

// ✅ WRAPPER POUR useProduct AVEC WEBSOCKET INTÉGRÉ
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
  const duplicateProduct = async (productId) => {
    console.log(`Duplication du produit #${productId}`);

    try {
      const response = await apiService.post(`/api/products/${productId}/duplicate`);
      console.log('Produit dupliqué avec succès:', response.data);

      // Le nouveau produit sera automatiquement ajouté via WebSocket
      // Ou on peut forcer un refresh du cache
      const dataStore = useProductDataStore.getState();
      dataStore.invalidateCache();

      return response.data.data; // Retourne { original, duplicated }
    } catch (error) {
      console.error(`Erreur lors de la duplication du produit #${productId}:`, error);
      throw error;
    }
  };

  const unsyncProduct = async (productId) => {
    console.log(`🗑️ Désynchronisation du produit #${productId}`);
    store.dispatch({ type: 'FETCH_START' });

    try {
      const response = await apiService.post(`/api/sync/products/${productId}/unsync`);
      console.log(`✅ Produit désynchronisé avec succès:`, response.data);

      store.dispatch({
        type: customActions.UNSYNC_PRODUCT,
        payload: { id: productId },
      });

      return response.data;
    } catch (error) {
      console.error(`❌ Erreur lors de la désynchronisation du produit #${productId}:`, error);
      store.dispatch({ type: 'FETCH_ERROR', payload: error.message });
      throw error;
    }
  };

  return {
    ...productStore,
    syncProduct,
    unsyncProduct,
    duplicateProduct,
    // ✅ INITIALISATION WEBSOCKET SIMPLIFIÉE
    initWebSocketListeners: () => {
      const wsStore = useProductDataStore.getState();
      const cleanup = wsStore.initWebSocket();
      console.log('🔌 WebSocket listeners initialisés pour les produits');
      return cleanup;
    },
  };
}

export { useProductStore };

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
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
