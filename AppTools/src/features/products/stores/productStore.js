// src/features/products/stores/productStore.js
import { createEntityTableStore } from '../../../factories/createEntityTableStore';
import apiService from '../../../services/api';
import { ENTITY_CONFIG } from '../constants';

// Actions personnalisées spécifiques aux produits
const customActions = {
  UPDATE_STOCK: 'UPDATE_STOCK',
  SET_MAIN_IMAGE: 'SET_MAIN_IMAGE',
  UPLOAD_GALLERY_IMAGE: 'UPLOAD_GALLERY_IMAGE',
  DELETE_GALLERY_IMAGE: 'DELETE_GALLERY_IMAGE',
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
    };
  },
  SET_MAIN_IMAGE: (state, action) => {
    return {
      ...state,
      items: state.items.map((item) =>
        item._id === action.payload.id ? { ...item, ...action.payload.data } : item
      ),
      loading: false,
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
    };
  },
};

// Créer le store complet avec notre nouvelle factory
const {
  useProduct,
  useEntityStore: useProductStore,
  useProductDataStore, // Ce nom est maintenant exporté correctement par la factory
  useProductHierarchyStore,
  useProductExtras,
  useProductTablePreferences,
  useProductTablePreferencesStore,
} = createEntityTableStore({
  entityName: 'product',
  apiEndpoint: '/api/products',
  syncEnabled: true,
  imagesEnabled: true,
  cacheDuration: ENTITY_CONFIG.cacheDuration || 5 * 60 * 1000,
  defaultTablePreferences: {
    pageSize: ENTITY_CONFIG.defaultPageSize || 10,
    sort: ENTITY_CONFIG.defaultSort || { field: 'name', direction: 'asc' },
  },
  customActions,
  customReducers,
  additionalWebSocketChannels: ['categories'],
  additionalWebSocketEvents: [
    {
      event: 'categories.tree.changed',
      handler: (get) => (data) => {
        console.log('[PRODUCTS] Événement categories.tree.changed reçu', data);
        // Ajouter un délai court pour s'assurer que le serveur a terminé ses mises à jour
        setTimeout(() => {
          get().fetchProducts();
        }, 500);
      },
    },
  ],
});

// Exporter les hooks générés par la factory
export {
  useProduct,
  useProductStore,
  useProductDataStore, // Export explicite pour compatibilité
  useProductHierarchyStore,
  useProductTablePreferences,
  useProductTablePreferencesStore,
};

// Fonction pour exposer des méthodes supplémentaires spécifiques aux produits
export function useProductExtrasEnhanced() {
  const store = useProductStore();
  const baseExtras = useProductExtras();

  // Définir l'image principale d'un produit
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

  // Télécharger une image pour la galerie d'un produit
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

  // Supprimer une image de la galerie d'un produit
  const deleteGalleryImage = async (productId, imageIndex) => {
    store.dispatch({ type: 'FETCH_START' });
    try {
      // Obtenir le produit actuel
      const response = await apiService.get(`/api/products/${productId}`);
      const product = response.data.data;

      // Vérifier que l'image existe
      if (!product.gallery_images || !product.gallery_images[imageIndex]) {
        throw new Error('Image non trouvée');
      }

      // Extraire l'ID de l'image
      const imageId = product.gallery_images[imageIndex]._id;

      // Supprimer l'image avec son ID réel
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

  // Retourne toutes les fonctionnalités standard du useProductExtras + les extras spécifiques
  return {
    ...baseExtras,
    setMainImage,
    uploadGalleryImage,
    deleteGalleryImage,
  };
}

// Exporter aussi les méthodes extras améliorées
export { useProductExtras };
