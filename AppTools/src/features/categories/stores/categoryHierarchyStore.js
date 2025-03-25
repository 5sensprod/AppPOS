// src/features/categories/stores/categoryHierarchyStore.js
import { create } from 'zustand';
import websocketService from '../../../services/websocketService';
import apiService from '../../../services/api';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';

// Utilisation de la factory createWebSocketStore pour simplifier le code
export const useCategoryHierarchyStore = createWebSocketStore({
  entityName: 'category',
  apiEndpoint: '/api/categories/hierarchical',
  dataPropertyName: 'hierarchicalCategories',
  fetchMethodName: 'fetchHierarchicalCategories',
  apiService,
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
