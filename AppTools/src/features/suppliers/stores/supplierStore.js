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
  const supplierStore = useSupplier();

  const uploadImage = async (supplierId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

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

  const addBrandToSupplier = async (supplierId, brandId) => {
    try {
      const response = await apiService.post(
        `${SUPPLIER_CONFIG.apiEndpoint}/${supplierId}/brands`,
        { brand_id: brandId }
      );
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'ajout de la marque au fournisseur:", error);
      throw error;
    }
  };

  const removeBrandFromSupplier = async (supplierId, brandId) => {
    try {
      const response = await apiService.delete(
        `${SUPPLIER_CONFIG.apiEndpoint}/${supplierId}/brands/${brandId}`
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression de la marque du fournisseur:', error);
      throw error;
    }
  };

  return {
    ...supplierStore,
    uploadImage,
    deleteImage,
    addBrandToSupplier,
    removeBrandFromSupplier,
  };
}
