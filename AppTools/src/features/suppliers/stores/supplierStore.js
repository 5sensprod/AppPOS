import { createEntityStore } from '../../../factories/createEntityStore';
import { createWebSocketStore } from '../../../factories/createWebSocketStore';
import apiService from '../../../services/api';
import { ENTITY_CONFIG as SUPPLIER_CONFIG } from '../constants';

// Créer le store avec la factory - PATTERN IDENTIQUE
const { useSupplier: useSupplierBase, useEntityStore: useSupplierStore } =
  createEntityStore(SUPPLIER_CONFIG);

// Store Zustand dédié pour la gestion des fournisseurs avec WebSocket - SIMPLIFIÉ
export const useSupplierDataStore = createWebSocketStore({
  entityName: SUPPLIER_CONFIG.entityName,
  apiEndpoint: SUPPLIER_CONFIG.apiEndpoint,
  apiService,
  // SUPPRESSION des méthodes customMethods qui causent des problèmes
});

// Étendre useSupplier avec l'initialisation directe WebSocket - PATTERN IDENTIQUE
export function useSupplier() {
  const supplierStore = useSupplierBase();
  return {
    ...supplierStore,
    initWebSocketListeners: () => {
      const cleanup = useSupplierDataStore.getState().initWebSocket();
      return cleanup;
    },
  };
}

// Réexporter useSupplierStore pour maintenir la compatibilité
export { useSupplierStore };

// Fonction pour exposer des méthodes supplémentaires - SIMPLIFIÉ comme products
export function useSupplierExtras() {
  const supplierStore = useSupplier();

  const uploadImage = async (supplierId, file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiService.post(
        `${SUPPLIER_CONFIG.apiEndpoint}/${supplierId}/image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'upload d'image:", error);
      throw error;
    }
  };

  const deleteImage = async (supplierId) => {
    try {
      const response = await apiService.delete(
        `${SUPPLIER_CONFIG.apiEndpoint}/${supplierId}/image`
      );
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la suppression d'image:", error);
      throw error;
    }
  };

  return {
    ...supplierStore,
    uploadImage,
    deleteImage,
  };
}
