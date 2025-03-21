// src/features/brands/contexts/brandContext.js
import { createEntityContext } from '../../../factories/createEntityContext';
import { createEntityImageHandlers } from '../../../factories/createEntityImageHandlers';

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

  const { uploadImage, deleteImage } = createEntityImageHandlers(
    'brand',
    '/api/brands',
    dispatch,
    customActions
  );

  return {
    ...context,
    uploadImage,
    deleteImage,
  };
}
