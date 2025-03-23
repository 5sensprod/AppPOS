// src/features/categories/stores/categoryHierarchyStore.js
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import apiService from '../../../services/api';

// Store pour les catégories hiérarchiques avec gestion des WebSockets
export const useCategoryHierarchyStore = createWebSocketStore({
  entityName: 'category',
  apiEndpoint: '/api/categories/hierarchical',
  apiService,
  // Noms personnalisés pour maintenir la compatibilité
  dataPropertyName: 'hierarchicalCategories',
  fetchMethodName: 'fetchHierarchicalCategories',
  additionalChannels: [],
  additionalEvents: [
    {
      event: 'categories.tree.changed',
      handler: (get) => (data) => {
        console.log('[HIERARCHY] Événement categories.tree.changed reçu', data);
        get().fetchHierarchicalCategories();
      },
    },
  ],
});
