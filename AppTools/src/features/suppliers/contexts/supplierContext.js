// src/features/suppliers/contexts/supplierContext.js
import { createEntityContext } from '../../../factories/createEntityContext';
import { createEntityImageHandlers } from '../../../factories/createEntityImageHandlers';

// Configuration de l'entité Supplier
const SUPPLIER_CONFIG = {
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  syncEnabled: false,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

// Actions personnalisées pour les fournisseurs
const customActions = {
  UPLOAD_IMAGE: 'UPLOAD_IMAGE',
  DELETE_IMAGE: 'DELETE_IMAGE',
};

// Reducers personnalisés pour les fournisseurs
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
  supplierContext: SupplierContext,
  SupplierProvider,
  useSupplier,
} = createEntityContext({
  ...SUPPLIER_CONFIG,
  customActions,
  customReducers,
});

// Fonction pour exposer des méthodes supplémentaires liées aux fournisseurs
export function useSupplierExtras() {
  const context = useSupplier();
  const { dispatch } = context;

  const { uploadImage, deleteImage } = createEntityImageHandlers(
    'supplier',
    '/api/suppliers',
    dispatch,
    customActions
  );

  return {
    ...context,
    uploadImage,
    deleteImage,
  };
}
