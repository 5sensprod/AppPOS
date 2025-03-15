// src/features/categories/contexts/categoryContext.js
import { createEntityContext } from '../../../factories/createEntityContext';
import apiService from '../../../services/api';

// Configuration de l'entité Category - ATTENTION: le nom est crucial
const CATEGORY_CONFIG = {
  entityName: 'category', // Ceci génère fetchCategorys et non fetchCategories
  apiEndpoint: '/api/categories',
  syncEnabled: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

// Actions personnalisées pour les catégories
const customActions = {
  UPLOAD_IMAGE: 'UPLOAD_IMAGE',
  DELETE_IMAGE: 'DELETE_IMAGE',
};

// Reducers personnalisés pour les catégories
const customReducers = {
  UPLOAD_IMAGE: (state, action) => {
    return {
      ...state,
      items: state.items.map((item) =>
        item._id === action.payload.id ? { ...item, image: action.payload.image } : item
      ),
      itemsById: {
        ...state.itemsById,
        [action.payload.id]: {
          ...state.itemsById[action.payload.id],
          image: action.payload.image,
        },
      },
      loading: false,
    };
  },
  DELETE_IMAGE: (state, action) => {
    return {
      ...state,
      items: state.items.map((item) =>
        item._id === action.payload.id ? { ...item, image: null } : item
      ),
      itemsById: {
        ...state.itemsById,
        [action.payload.id]: {
          ...state.itemsById[action.payload.id],
          image: null,
        },
      },
      loading: false,
    };
  },
};

// Créer le contexte avec la factory
export const {
  categoryContext: CategoryContext,
  CategoryProvider,
  useCategory,
} = createEntityContext({
  ...CATEGORY_CONFIG,
  customActions,
  customReducers,
});

// Fonction pour exposer des méthodes supplémentaires liées aux catégories
export function useCategoryExtras() {
  const context = useCategory();
  const { dispatch } = context;

  // Télécharger une image pour une catégorie
  const uploadImage = async (categoryId, imageFile) => {
    if (dispatch) {
      try {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await apiService.post(`/api/categories/${categoryId}/image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        dispatch({
          type: customActions.UPLOAD_IMAGE,
          payload: { id: categoryId, image: response.data.data.image },
        });

        return response.data;
      } catch (error) {
        console.error("Erreur lors du téléchargement de l'image:", error);
        throw error;
      }
    }
  };

  // Supprimer l'image d'une catégorie
  const deleteImage = async (categoryId) => {
    if (dispatch) {
      try {
        await apiService.delete(`/api/categories/${categoryId}/image`);

        dispatch({
          type: customActions.DELETE_IMAGE,
          payload: { id: categoryId },
        });

        return true;
      } catch (error) {
        console.error("Erreur lors de la suppression de l'image:", error);
        throw error;
      }
    }
  };

  // Synchroniser une catégorie avec WooCommerce
  const syncCategory = async (categoryId) => {
    try {
      const response = await apiService.post(`/api/categories/${categoryId}/sync`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la synchronisation de la catégorie:', error);
      throw error;
    }
  };

  return {
    ...context,
    uploadImage,
    deleteImage,
    syncCategory,
  };
}
