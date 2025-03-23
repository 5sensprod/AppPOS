// src/features/suppliers/stores/supplierStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import { create } from 'zustand';
import websocketService from '../../../services/websocketService';
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
export const useSupplierDataStore = create((set, get) => {
  // Fonction pour gérer les abonnements WebSocket
  const setupWebSocketListeners = () => {
    // Éviter les abonnements multiples
    if (get().listenersInitialized) return;

    console.log('[SUPPLIERS] Initialisation des écouteurs WebSocket');

    // S'abonner au canal suppliers
    websocketService.subscribe('suppliers');

    // Gestionnaire pour l'événement de création
    const handleCreated = (data) => {
      console.log('[SUPPLIERS] Événement suppliers.created reçu', data);
      get().fetchSuppliers();
    };

    // Gestionnaire pour l'événement de mise à jour
    const handleUpdated = (data) => {
      console.log('[SUPPLIERS] Événement suppliers.updated reçu', data);
      get().fetchSuppliers();
    };

    // Gestionnaire amélioré pour l'événement de suppression
    const handleDeleted = (data) => {
      console.log('[SUPPLIERS] Événement suppliers.deleted reçu ✨', data);
      console.log(
        '[SUPPLIERS] Type de données reçues:',
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

      console.log(`[SUPPLIERS] Fournisseur supprimé avec ID: ${deletedId}`);
      get().fetchSuppliers();
    };

    // Gestionnaire global pour entity.deleted
    const handleEntityDeleted = (data) => {
      if (data && data.entityType === 'suppliers') {
        console.log('[SUPPLIERS] Événement entity.deleted pour suppliers reçu ✨', data);
        get().fetchSuppliers();
      }
    };

    // S'abonner aux événements
    websocketService.on('suppliers.created', handleCreated);
    websocketService.on('suppliers.updated', handleUpdated);
    websocketService.on('suppliers.deleted', handleDeleted);
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
    suppliers: [],
    loading: false,
    error: null,
    lastUpdate: null,
    listenersInitialized: false,
    eventHandlers: {},

    // Actions
    fetchSuppliers: async () => {
      set({ loading: true, error: null });
      try {
        console.log('[SUPPLIERS] Chargement des fournisseurs');
        const response = await apiService.get('/api/suppliers');
        set({
          suppliers: response.data.data,
          loading: false,
          lastUpdate: Date.now(),
        });
        console.log('[SUPPLIERS] Fournisseurs chargés:', response.data.data.length);
        return response.data.data;
      } catch (error) {
        console.error('[SUPPLIERS] Erreur lors du chargement des fournisseurs:', error);
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

      console.log('[SUPPLIERS] Nettoyage des écouteurs WebSocket');
      const { eventHandlers } = get();

      websocketService.off('suppliers.created', eventHandlers.created);
      websocketService.off('suppliers.updated', eventHandlers.updated);
      websocketService.off('suppliers.deleted', eventHandlers.deleted);
      websocketService.off('entity.deleted', eventHandlers.entityDeleted);

      set({
        listenersInitialized: false,
        eventHandlers: {},
      });
    },

    // Fonction de débogage pour afficher tous les écouteurs actifs
    debugListeners: () => {
      const events = [
        'suppliers.created',
        'suppliers.updated',
        'suppliers.deleted',
        'entity.deleted',
      ];

      events.forEach((event) => {
        const count = websocketService.eventHandlers[event]?.length || 0;
        console.log(`[SUPPLIERS-DEBUG] Écouteurs pour '${event}': ${count}`);
      });
    },
  };
});

// Étendre useSupplier avec WebSocket (pour rétro-compatibilité)
export function useSupplier() {
  const supplierStore = useSupplierBase();

  return {
    ...supplierStore,
    // Cette méthode est conservée pour rétro-compatibilité
    // mais ne sera plus utilisée activement dans le nouveau modèle
    initWebSocketListeners: () => {
      console.log(
        '[SUPPLIER-LEGACY] initWebSocketListeners appelé - utiliser useSupplierDataStore.initWebSocket() à la place'
      );
      return () => {};
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
