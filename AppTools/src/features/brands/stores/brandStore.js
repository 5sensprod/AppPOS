// src/features/brands/stores/brandStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { create } from 'zustand';
import websocketService from '../../../services/websocketService';
import apiService from '../../../services/api';

// Configuration de l'entité Brand
const BRAND_CONFIG = {
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  syncEnabled: true,
  imagesEnabled: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

// Créer le store avec la factory
const { useBrand: useBrandBase, useEntityStore: useBrandStore } = createEntityStore(BRAND_CONFIG);

// Store Zustand dédié pour la gestion des marques avec WebSocket
export const useBrandHierarchyStore = create((set, get) => {
  // Fonction pour gérer les abonnements WebSocket
  const setupWebSocketListeners = () => {
    // Éviter les abonnements multiples
    if (get().listenersInitialized) return;

    console.log('[BRANDS] Initialisation des écouteurs WebSocket');

    // S'abonner au canal brands
    websocketService.subscribe('brands');

    // Gestionnaire pour l'événement de création
    const handleCreated = (data) => {
      console.log('[BRANDS] Événement brands.created reçu', data);
      get().fetchBrands();
    };

    // Gestionnaire pour l'événement de mise à jour
    const handleUpdated = (data) => {
      console.log('[BRANDS] Événement brands.updated reçu', data);
      get().fetchBrands();
    };

    // Gestionnaire amélioré pour l'événement de suppression
    const handleDeleted = (data) => {
      console.log('[BRANDS] Événement brands.deleted reçu ✨', data);
      console.log(
        '[BRANDS] Type de données reçues:',
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

      console.log(`[BRANDS] Marque supprimée avec ID: ${deletedId}`);
      get().fetchBrands();
    };

    // Gestionnaire global pour entity.deleted
    const handleEntityDeleted = (data) => {
      if (data && data.entityType === 'brands') {
        console.log('[BRANDS] Événement entity.deleted pour brands reçu ✨', data);
        get().fetchBrands();
      }
    };

    // S'abonner aux événements
    websocketService.on('brands.created', handleCreated);
    websocketService.on('brands.updated', handleUpdated);
    websocketService.on('brands.deleted', handleDeleted);
    websocketService.on('entity.deleted', handleEntityDeleted);

    // Stocker les références aux gestionnaires pour le nettoyage
    set({
      listenersInitialized: true,
      eventHandlers: {
        created: handleCreated,
        updated: handleUpdated,
        deleted: handleDeleted,
        entityDeleted: handleEntityDeleted,
      },
    });
  };

  return {
    // État
    brands: [],
    loading: false,
    error: null,
    lastUpdate: null,
    listenersInitialized: false,
    eventHandlers: {},

    // Actions
    fetchBrands: async () => {
      set({ loading: true, error: null });
      try {
        console.log('[BRANDS] Chargement des marques');
        const response = await apiService.get('/api/brands');
        set({
          brands: response.data.data,
          loading: false,
          lastUpdate: Date.now(),
        });
        console.log('[BRANDS] Marques chargées:', response.data.data.length);
        return response.data.data;
      } catch (error) {
        console.error('[BRANDS] Erreur lors du chargement des marques:', error);
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

      console.log('[BRANDS] Nettoyage des écouteurs WebSocket');
      const { eventHandlers } = get();

      websocketService.off('brands.created', eventHandlers.created);
      websocketService.off('brands.updated', eventHandlers.updated);
      websocketService.off('brands.deleted', eventHandlers.deleted);
      websocketService.off('entity.deleted', eventHandlers.entityDeleted);

      set({
        listenersInitialized: false,
        eventHandlers: {},
      });
    },

    // Fonction de débogage pour afficher tous les écouteurs actifs
    debugListeners: () => {
      const events = ['brands.created', 'brands.updated', 'brands.deleted', 'entity.deleted'];

      events.forEach((event) => {
        const count = websocketService.eventHandlers[event]?.length || 0;
        console.log(`[BRANDS-DEBUG] Écouteurs pour '${event}': ${count}`);
      });
    },
  };
});

// Étendre useBrand avec WebSocket (pour rétro-compatibilité)
export function useBrand() {
  const brandStore = useBrandBase();

  return {
    ...brandStore,
    // Cette méthode est conservée pour rétro-compatibilité
    // mais ne sera plus utilisée activement dans le nouveau modèle
    initWebSocketListeners: () => {
      console.log(
        '[BRAND-LEGACY] initWebSocketListeners appelé - utiliser useBrandHierarchyStore.initWebSocket() à la place'
      );
      return () => {};
    },
  };
}

// Réexporter useBrandStore pour maintenir la compatibilité
export { useBrandStore };

// Fonction pour exposer des méthodes supplémentaires spécifiques aux marques
export function useBrandExtras() {
  const { syncBrand } = useBrandBase();

  return {
    ...useBrand(),
    syncBrand,
    // Vous pouvez ajouter ici d'autres fonctionnalités spécifiques aux marques si besoin
  };
}
