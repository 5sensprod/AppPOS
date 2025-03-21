// src/features/categories/contexts/categoryContext.js
import { createEntityContext } from '../../../factories/createEntityContext';
import apiService from '../../../services/api';
import { createEntityImageHandlers } from '../../../factories/createEntityImageHandlers';

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

  const { uploadImage, deleteImage } = createEntityImageHandlers(
    'category',
    '/api/categories',
    dispatch,
    customActions
  );

  const getHierarchicalCategories = async () => {
    try {
      const response = await apiService.get('/api/categories/hierarchical');
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors du chargement des catégories hiérarchiques:', error);
      throw error;
    }
  };

  return {
    ...context,
    uploadImage,
    deleteImage,
    getHierarchicalCategories,
  };
}
