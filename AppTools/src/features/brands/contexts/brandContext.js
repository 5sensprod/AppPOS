// src/features/brands/contexts/brandContext.js
import { createEntityContext } from '../../../factories/createEntityContext';
import apiService from '../../../services/api';

// Configuration de l'entité Brand
const BRAND_CONFIG = {
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  syncEnabled: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

// Actions personnalisées pour les marques
const customActions = {
  UPLOAD_IMAGE: 'UPLOAD_IMAGE',
  DELETE_IMAGE: 'DELETE_IMAGE',
};

// Reducers personnalisés pour les marques
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
  brandContext: BrandContext,
  BrandProvider,
  useBrand,
} = createEntityContext({
  ...BRAND_CONFIG,
  customActions,
  customReducers,
});

// Fonction pour exposer des méthodes supplémentaires liées aux marques
export function useBrandExtras() {
  const context = useBrand();
  const { dispatch } = context;

  // Télécharger une image pour une marque
  const uploadImage = async (brandId, imageFile) => {
    if (dispatch) {
      try {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await apiService.post(`/api/brands/${brandId}/image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        dispatch({
          type: customActions.UPLOAD_IMAGE,
          payload: { id: brandId, image: response.data.data.image },
        });

        return response.data;
      } catch (error) {
        console.error("Erreur lors du téléchargement de l'image:", error);
        throw error;
      }
    }
  };

  // Supprimer l'image d'une marque
  const deleteImage = async (brandId) => {
    if (dispatch) {
      try {
        await apiService.delete(`/api/brands/${brandId}/image`);

        dispatch({
          type: customActions.DELETE_IMAGE,
          payload: { id: brandId },
        });

        return true;
      } catch (error) {
        console.error("Erreur lors de la suppression de l'image:", error);
        throw error;
      }
    }
  };

  return {
    ...context,
    uploadImage,
    deleteImage,
  };
}
