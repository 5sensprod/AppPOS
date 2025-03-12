// src/features/products/contexts/productContext.js
import { createEntityContext } from '../../../factories/createEntityContext';
import { ENTITY_CONFIG } from '../constants';
import apiService from '../../../services/api';

// Actions personnalisées spécifiques aux produits
const customActions = {
  UPDATE_STOCK: 'UPDATE_STOCK',
  SET_MAIN_IMAGE: 'SET_MAIN_IMAGE',
  UPLOAD_IMAGE: 'UPLOAD_IMAGE',
  UPLOAD_GALLERY_IMAGE: 'UPLOAD_GALLERY_IMAGE',
  DELETE_IMAGE: 'DELETE_IMAGE',
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
  UPLOAD_IMAGE: (state, action) => {
    return {
      ...state,
      items: state.items.map((item) =>
        item._id === action.payload.id ? { ...item, image: action.payload.image } : item
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
  DELETE_IMAGE: (state, action) => {
    return {
      ...state,
      items: state.items.map((item) =>
        item._id === action.payload.id ? { ...item, image: null } : item
      ),
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

// Créer le contexte avec la factory
console.log('ENTITY_CONFIG:', ENTITY_CONFIG);
export const {
  productContext: ProductContext,
  ProductProvider,
  useProduct,
} = createEntityContext({
  ...ENTITY_CONFIG,
  customActions,
  customReducers,
});

// Fonction pour exposer des méthodes supplémentaires
export function useProductExtras() {
  const context = useProduct();
  const { dispatch } = context;

  // Mettre à jour le stock d'un produit
  const updateStock = async (productId, newStock) => {
    if (dispatch) {
      try {
        const response = await apiService.put(`/api/products/${productId}`, {
          stock: newStock,
        });
        dispatch({
          type: customActions.UPDATE_STOCK,
          payload: { id: productId, stock: newStock },
        });
        return response.data;
      } catch (error) {
        console.error('Erreur lors de la mise à jour du stock:', error);
        throw error;
      }
    }
  };

  // Définir l'image principale d'un produit
  const setMainImage = async (productId, imageIndex) => {
    if (dispatch) {
      try {
        const response = await apiService.put(`/api/products/${productId}/main-image`, {
          imageIndex,
        });
        dispatch({
          type: customActions.SET_MAIN_IMAGE,
          payload: { id: productId, data: response.data.data },
        });
        return response.data;
      } catch (error) {
        console.error("Erreur lors de la définition de l'image principale:", error);
        throw error;
      }
    }
  };

  // Télécharger une image pour un produit
  const uploadImage = async (productId, imageFile) => {
    if (dispatch) {
      try {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await apiService.post(`/api/products/${productId}/image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        dispatch({
          type: customActions.UPLOAD_IMAGE,
          payload: { id: productId, image: response.data.data.image },
        });

        return response.data;
      } catch (error) {
        console.error("Erreur lors du téléchargement de l'image:", error);
        throw error;
      }
    }
  };

  // Télécharger une image pour la galerie d'un produit
  const uploadGalleryImage = async (productId, imageFile) => {
    if (dispatch) {
      try {
        const formData = new FormData();
        // Utilisez le même nom de champ que Postman
        formData.append('images', imageFile);

        const response = await apiService.post(`/api/products/${productId}/image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('Réponse upload:', response.data);

        dispatch({
          type: customActions.UPLOAD_GALLERY_IMAGE,
          payload: { id: productId, image: response.data.data.image },
        });

        return response.data;
      } catch (error) {
        console.error("Erreur lors du téléchargement de l'image de galerie:", error);
        throw error;
      }
    }
  };

  // Supprimer l'image d'un produit
  const deleteImage = async (productId) => {
    if (dispatch) {
      try {
        await apiService.delete(`/api/products/${productId}/image`);

        dispatch({
          type: customActions.DELETE_IMAGE,
          payload: { id: productId },
        });

        return true;
      } catch (error) {
        console.error("Erreur lors de la suppression de l'image:", error);
        throw error;
      }
    }
  };

  // Supprimer une image de la galerie d'un produit
  const deleteGalleryImage = async (productId, imageIndex) => {
    if (dispatch) {
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

        dispatch({
          type: customActions.DELETE_GALLERY_IMAGE,
          payload: { id: productId, imageIndex },
        });

        return true;
      } catch (error) {
        console.error("Erreur lors de la suppression de l'image de galerie:", error);
        throw error;
      }
    }
  };

  return {
    ...context,
    updateStock,
    setMainImage,
    uploadImage,
    uploadGalleryImage,
    deleteImage,
    deleteGalleryImage,
  };
}
