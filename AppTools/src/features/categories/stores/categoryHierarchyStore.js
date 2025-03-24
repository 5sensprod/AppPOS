// src/features/categories/stores/categoryHierarchyStore.js
import { create } from 'zustand';
import websocketService from '../../../services/websocketService';
import apiService from '../../../services/api';

// Store pour les catégories hiérarchiques avec gestion des WebSockets
export const useCategoryHierarchyStore = create((set, get) => {
  // Fonction pour gérer les abonnements WebSocket
  const setupWebSocketListeners = () => {
    // Éviter les abonnements multiples
    if (get().listenersInitialized) return;

    console.log('[HIERARCHY] Initialisation des écouteurs WebSocket');

    // S'abonner au canal categories
    websocketService.subscribe('categories');

    // Gestionnaire pour l'événement de création
    const handleCreated = (data) => {
      console.log('[HIERARCHY] Événement categories.created reçu', data);
      get().fetchHierarchicalCategories();
    };

    // Gestionnaire pour l'événement de mise à jour
    const handleUpdated = (data) => {
      console.log('[HIERARCHY] Événement categories.updated reçu', data);
      get().fetchHierarchicalCategories();
    };

    // Gestionnaire pour l'événement de suppression
    const handleDeleted = (data) => {
      console.log('[HIERARCHY] Événement categories.deleted reçu', data);
      get().fetchHierarchicalCategories();
    };

    // Gestionnaire pour l'événement de changement d'arborescence
    const handleTreeChanged = (data) => {
      console.log('[HIERARCHY] Événement categories.tree.changed reçu', data);
      get().fetchHierarchicalCategories();
    };

    // S'abonner aux événements standards
    websocketService.on('categories.created', handleCreated);
    websocketService.on('categories.updated', handleUpdated);
    websocketService.on('categories.deleted', handleDeleted);
    websocketService.on('categories.tree.changed', handleTreeChanged);

    // Stocker les références aux gestionnaires pour le nettoyage
    set({
      listenersInitialized: true,
      eventHandlers: {
        created: handleCreated,
        updated: handleUpdated,
        deleted: handleDeleted,
        treeChanged: handleTreeChanged,
      },
    });
  };

  return {
    // État
    hierarchicalCategories: [],
    loading: false,
    error: null,
    lastUpdate: null,
    listenersInitialized: false,
    eventHandlers: {},

    // Actions
    fetchHierarchicalCategories: async () => {
      set({ loading: true, error: null });
      try {
        console.log('[HIERARCHY] Chargement des catégories hiérarchiques');
        const response = await apiService.get('/api/categories/hierarchical');
        set({
          hierarchicalCategories: response.data.data,
          loading: false,
          lastUpdate: Date.now(),
        });
        console.log('[HIERARCHY] Catégories hiérarchiques chargées:', response.data.data.length);
        return response.data.data;
      } catch (error) {
        console.error('[HIERARCHY] Erreur lors du chargement des catégories:', error);
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

      console.log('[HIERARCHY] Nettoyage des écouteurs WebSocket');
      const { eventHandlers } = get();

      websocketService.off('categories.created', eventHandlers.created);
      websocketService.off('categories.updated', eventHandlers.updated);
      websocketService.off('categories.deleted', eventHandlers.deleted);
      websocketService.off('categories.tree.changed', eventHandlers.treeChanged);

      set({
        listenersInitialized: false,
        eventHandlers: {},
      });
    },
  };
});
