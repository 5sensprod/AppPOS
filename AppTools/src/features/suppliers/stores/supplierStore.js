// src/features/suppliers/stores/supplierStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import apiService from '../../../services/api';

// Configuration de l'entité Supplier
const SUPPLIER_CONFIG = {
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  syncEnabled: false,
  imagesEnabled: true,
};

// Créer le store avec la factory
const { useSupplier: useSupplierBase, useEntityStore: useSupplierStore } =
  createEntityStore(SUPPLIER_CONFIG);

// Store Zustand dédié pour la gestion des fournisseurs avec WebSocket
export const useSupplierDataStore = createWebSocketStore({
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  apiService,
  additionalChannels: [],
  additionalEvents: [],
});

// Étendre useSupplier avec l'initialisation directe WebSocket
export function useSupplier() {
  const supplierStore = useSupplierBase();
  return {
    ...supplierStore,
    // Utiliser directement les méthodes du store WebSocket
    initWebSocketListeners: () => {
      const cleanup = useSupplierDataStore.getState().initWebSocket();
      return cleanup;
    },
  };
}

// Réexporter useSupplierStore pour maintenir la compatibilité
export { useSupplierStore };

// Fonction pour exposer des méthodes supplémentaires spécifiques aux fournisseurs
export function useSupplierExtras() {
  return {
    ...useSupplier(),
    // Vous pouvez ajouter ici des fonctionnalités spécifiques aux fournisseurs si besoin
  };
}
