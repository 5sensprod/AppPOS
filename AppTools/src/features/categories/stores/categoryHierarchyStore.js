// src/features/categories/stores/categoryHierarchyStore.js
import { create } from 'zustand';
import websocketService from '../../../services/websocketService';
import apiService from '../../../services/api';

// Variable globale pour suivre l'état d'initialisation et éviter les doubles abonnements
let listenersInitialized = false;
let eventHandlers = {};

// Store pour les catégories hiérarchiques avec gestion des WebSockets
export const useCategoryHierarchyStore = create((set, get) => {
  // Fonction pour gérer les abonnements WebSocket
  const setupWebSocketListeners = () => {
    // Éviter les abonnements multiples
    if (listenersInitialized) {
      console.log('[HIERARCHY] WebSocket déjà initialisé, réutilisation des écouteurs existants');
      return () => {}; // Retourner une fonction de nettoyage vide si déjà initialisé
    }

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
    eventHandlers = {
      created: handleCreated,
      updated: handleUpdated,
      deleted: handleDeleted,
      treeChanged: handleTreeChanged,
    };

    // Marquer comme initialisé
    listenersInitialized = true;

    // Debug
    console.log('[HIERARCHY] Écouteurs WebSocket initialisés');

    // Fonction de nettoyage
    return () => {
      if (!listenersInitialized) return;

      console.log('[HIERARCHY] Nettoyage des écouteurs WebSocket');

      websocketService.off('categories.created', eventHandlers.created);
      websocketService.off('categories.updated', eventHandlers.updated);
      websocketService.off('categories.deleted', eventHandlers.deleted);
      websocketService.off('categories.tree.changed', eventHandlers.treeChanged);

      // Réinitialiser
      eventHandlers = {};
      listenersInitialized = false;
    };
  };

  return {
    // État
    hierarchicalCategories: [],
    loading: false,
    error: null,
    lastUpdate: null,

    // Actions
    fetchHierarchicalCategories: async (force = false) => {
      // Éviter les appels inutiles si les données sont récentes et non forcées
      const state = get();
      const isDataStale = !state.lastUpdate || Date.now() - state.lastUpdate > 60000; // 1 minute

      if (!force && !isDataStale && state.hierarchicalCategories.length > 0) {
        console.log('[HIERARCHY] Utilisation des données en cache');
        return state.hierarchicalCategories;
      }

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
      console.log('[HIERARCHY] Appel à initWebSocket()');
      return setupWebSocketListeners();
    },

    // Méthode pour vérifier si les WebSockets sont initialisés
    isWebSocketInitialized: () => {
      return listenersInitialized;
    },
  };
});
