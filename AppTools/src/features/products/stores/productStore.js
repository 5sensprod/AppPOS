// src/features/products/stores/productStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { ENTITY_CONFIG } from '../constants';
import apiService from '../../../services/api';
import { create } from 'zustand';
import websocketService from '../../../services/websocketService';

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

// Créer le store avec la factory
const { useProduct: useProductBase, useEntityStore: useProductStore } = createEntityStore({
  ...ENTITY_CONFIG,
  customActions,
  customReducers,
});

// Store Zustand dédié pour la gestion des produits avec WebSocket
export const useProductDataStore = create((set, get) => {
  // Fonction pour gérer les abonnements WebSocket
  const setupWebSocketListeners = () => {
    // Éviter les abonnements multiples
    if (get().listenersInitialized) return;

    console.log('[PRODUCTS] Initialisation des écouteurs WebSocket');

    // S'abonner au canal products
    websocketService.subscribe('products');

    // Gestionnaire pour l'événement de création
    const handleCreated = (data) => {
      console.log('[PRODUCTS] Événement products.created reçu', data);
      get().fetchProducts();
    };

    // Gestionnaire pour l'événement de mise à jour
    const handleUpdated = (data) => {
      console.log('[PRODUCTS] Événement products.updated reçu', data);
      get().fetchProducts();
    };

    // Gestionnaire amélioré pour l'événement de suppression
    const handleDeleted = (data) => {
      console.log('[PRODUCTS] Événement products.deleted reçu ✨', data);
      console.log(
        '[PRODUCTS] Type de données reçues:',
        typeof data,
        'Contenu:',
        JSON.stringify(data)
      );

      // Vérifier le format des données pour s'adapter
      let deletedId;
      if (data && data.entityId) {
        deletedId = data.entityId;
      } else if (data && data.id) {
        deletedId = data.id;
      } else if (typeof data === 'string') {
        deletedId = data;
      }

      console.log(`[PRODUCTS] Produit supprimé avec ID: ${deletedId}`);
      get().fetchProducts();
    };

    // Gestionnaire pour l'événement de changement d'arborescence des catégories
    const handleCategoryTreeChanged = (data) => {
      console.log('[PRODUCTS] Événement categories.tree.changed reçu', data);
      // Ajouter un délai court pour s'assurer que le serveur a terminé ses mises à jour
      setTimeout(() => {
        get().fetchProducts();
      }, 500);
    };

    // Gestionnaire global pour entity.deleted
    const handleEntityDeleted = (data) => {
      if (data && data.entityType === 'products') {
        console.log('[PRODUCTS] Événement entity.deleted pour products reçu ✨', data);
        get().fetchProducts();
      }
    };

    // S'abonner aux événements
    websocketService.on('products.created', handleCreated);
    websocketService.on('products.updated', handleUpdated);
    websocketService.on('products.deleted', handleDeleted);
    websocketService.on('entity.deleted', handleEntityDeleted);

    // S'abonner à l'événement de changement d'arborescence des catégories
    websocketService.on('categories.tree.changed', handleCategoryTreeChanged);
    websocketService.subscribe('categories'); // S'abonner aussi au canal des catégories

    // Stocker les références aux gestionnaires pour le nettoyage
    set({
      listenersInitialized: true,
      eventHandlers: {
        created: handleCreated,
        updated: handleUpdated,
        deleted: handleDeleted,
        entityDeleted: handleEntityDeleted,
        categoryTreeChanged: handleCategoryTreeChanged,
      },
    });
  };

  return {
    // État
    products: [],
    loading: false,
    error: null,
    lastUpdate: null,
    listenersInitialized: false,
    eventHandlers: {},

    // Actions
    fetchProducts: async () => {
      set({ loading: true, error: null });
      try {
        console.log('[PRODUCTS] Chargement des produits');
        const response = await apiService.get('/api/products');
        set({
          products: response.data.data,
          loading: false,
          lastUpdate: Date.now(),
        });
        console.log('[PRODUCTS] Produits chargés:', response.data.data.length);
        return response.data.data;
      } catch (error) {
        console.error('[PRODUCTS] Erreur lors du chargement des produits:', error);
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    // Initialiser les écouteurs WebSocket
    initWebSocket: () => {
      setupWebSocketListeners();
    },

    // Nettoyage (à appeler lors du démontage de l'application si nécessaire)
    cleanup: () => {
      if (!get().listenersInitialized) return;

      console.log('[PRODUCTS] Nettoyage des écouteurs WebSocket');
      const { eventHandlers } = get();

      websocketService.off('products.created', eventHandlers.created);
      websocketService.off('products.updated', eventHandlers.updated);
      websocketService.off('products.deleted', eventHandlers.deleted);
      websocketService.off('entity.deleted', eventHandlers.entityDeleted);
      websocketService.off('categories.tree.changed', eventHandlers.categoryTreeChanged);

      set({
        listenersInitialized: false,
        eventHandlers: {},
      });
    },

    // Fonction de débogage pour afficher tous les écouteurs actifs
    debugListeners: () => {
      const events = [
        'products.created',
        'products.updated',
        'products.deleted',
        'entity.deleted',
        'categories.tree.changed',
      ];

      events.forEach((event) => {
        const count = websocketService.eventHandlers[event]?.length || 0;
        console.log(`[PRODUCTS-DEBUG] Écouteurs pour '${event}': ${count}`);
      });
    },
  };
});

// Étendre useProduct avec WebSocket (pour rétro-compatibilité)
export function useProduct() {
  const productStore = useProductBase();

  return {
    ...productStore,
    // Cette méthode est conservée pour rétro-compatibilité
    // mais ne sera plus utilisée activement dans le nouveau modèle
    initWebSocketListeners: () => {
      console.log(
        '[PRODUCT-LEGACY] initWebSocketListeners appelé - utiliser useProductDataStore.initWebSocket() à la place'
      );
      return () => {};
    },
  };
}

// Réexporter useProductStore pour maintenir la compatibilité
export { useProductStore };

// Fonction pour exposer des méthodes supplémentaires spécifiques aux produits
export function useProductExtras() {
  const store = useProductStore();

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

  // Retourne toutes les fonctionnalités standard du useProduct + les extras
  return {
    ...useProduct(),
    setMainImage,
    uploadGalleryImage,
    deleteGalleryImage,
  };
}
