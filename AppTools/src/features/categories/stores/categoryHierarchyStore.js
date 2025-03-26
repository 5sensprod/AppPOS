// src/features/categories/stores/categoryHierarchyStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { create } from 'zustand';
import websocketService from '../../../services/websocketService';
import apiService from '../../../services/api';

// Configuration spécifique pour le store hiérarchique
const HIERARCHY_CONFIG = {
  entityName: 'categoryHierarchy', // Un nom distinct pour éviter les conflits
  apiEndpoint: '/api/categories/hierarchical', // Point d'API spécifique
  syncEnabled: false, // Pas besoin de synchronisation individuelle
  imagesEnabled: false, // Pas de gestion d'images à ce niveau
};

// Créer un store personnalisé avec une meilleure gestion des écouteurs WebSocket
const useCategoryHierarchyStore = create((set, get) => {
  return {
    items: [],
    loading: false,
    error: null,
    listenersInitialized: false,

    fetchItems: async () => {
      set({ loading: true, error: null });
      try {
        console.log('[CATEGORY_HIERARCHY] Chargement de la hiérarchie des catégories');
        const response = await apiService.get(HIERARCHY_CONFIG.apiEndpoint);
        set({
          items: response.data.data,
          loading: false,
          lastUpdate: Date.now(),
        });
        return response.data.data;
      } catch (error) {
        console.error('[CATEGORY_HIERARCHY] Erreur de chargement:', error);
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    // Méthode améliorée pour initialiser les écouteurs WebSocket
    initWebSocketListeners: () => {
      // Éviter les initialisation multiples
      if (get().listenersInitialized) {
        console.log('[CATEGORY_HIERARCHY] Les écouteurs sont déjà initialisés');
        return get().cleanup;
      }

      console.log('[CATEGORY_HIERARCHY] Initialisation des écouteurs WebSocket');

      // S'abonner au canal des catégories
      websocketService.subscribe('categories');

      // Écouteur pour l'événement categories.tree.changed
      const handleTreeChanged = (data) => {
        console.log('[CATEGORY_HIERARCHY] Événement categories.tree.changed reçu ✅', data);
        get().fetchItems();
      };

      // Écouteurs pour les événements CRUD standards
      const handleCreated = (data) => {
        console.log('[CATEGORY_HIERARCHY] Événement categories.created reçu ✅', data);
        get().fetchItems();
      };

      const handleUpdated = (data) => {
        console.log('[CATEGORY_HIERARCHY] Événement categories.updated reçu ✅', data);
        get().fetchItems();
      };

      const handleDeleted = (data) => {
        console.log('[CATEGORY_HIERARCHY] Événement categories.deleted reçu ✅', data);
        get().fetchItems();
      };

      // S'abonner aux événements
      websocketService.on('categories.tree.changed', handleTreeChanged);
      websocketService.on('categories.created', handleCreated);
      websocketService.on('categories.updated', handleUpdated);
      websocketService.on('categories.deleted', handleDeleted);

      // Ajouter un écouteur pour la reconnexion
      const handleReconnect = () => {
        console.log('[CATEGORY_HIERARCHY] WebSocket reconnecté, réabonnement');
        websocketService.subscribe('categories');
      };

      websocketService.on('connect', handleReconnect);

      // Marquer comme initialisé
      set({ listenersInitialized: true });

      // Fonction de nettoyage pour déconnecter les écouteurs
      const cleanup = () => {
        console.log('[CATEGORY_HIERARCHY] Nettoyage des écouteurs WebSocket');
        websocketService.off('categories.tree.changed', handleTreeChanged);
        websocketService.off('categories.created', handleCreated);
        websocketService.off('categories.updated', handleUpdated);
        websocketService.off('categories.deleted', handleDeleted);
        websocketService.off('connect', handleReconnect);
        set({ listenersInitialized: false });
      };

      // Stocker les gestionnaires pour le nettoyage
      set({
        eventHandlers: {
          treeChanged: handleTreeChanged,
          created: handleCreated,
          updated: handleUpdated,
          deleted: handleDeleted,
          reconnect: handleReconnect,
        },
        cleanup: cleanup,
      });

      return cleanup;
    },

    // Méthode de nettoyage pour déconnecter tous les écouteurs
    cleanup: () => {
      console.log('[CATEGORY_HIERARCHY] Aucun écouteur à nettoyer (pas encore initialisé)');
    },

    // Méthode pour déboguer les écouteurs WebSocket
    debugListeners: () => {
      console.log('[CATEGORY_HIERARCHY] État des écouteurs WebSocket:');
      console.log('- Initialisé:', get().listenersInitialized);
      const events = [
        'categories.tree.changed',
        'categories.created',
        'categories.updated',
        'categories.deleted',
      ];
      events.forEach((event) => {
        const count = websocketService.eventHandlers[event]?.length || 0;
        console.log(`- Écouteurs pour '${event}': ${count}`);
      });
    },
  };
});

// Fonction utilitaire pour accéder directement aux données hiérarchiques
export function useHierarchicalCategories() {
  const store = useCategoryHierarchyStore();

  return {
    hierarchicalCategories: store.items,
    loading: store.loading,
    error: store.error,
    fetchHierarchicalCategories: store.fetchItems,
    initWebSocketListeners: store.initWebSocketListeners,
    debugListeners: store.debugListeners,
  };
}

// Exporter le store pour d'autres utilisations
export { useCategoryHierarchyStore };
