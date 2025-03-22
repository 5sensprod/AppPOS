// src/features/suppliers/stores/supplierStore.js
import { createEntityStore } from '../../../factories/createEntityStore';

// Configuration de l'entité Supplier
const SUPPLIER_CONFIG = {
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  syncEnabled: false,
  imagesEnabled: true,
};

// Créer le store avec la factory
export const { useSupplier, useEntityStore: useSupplierStore } = createEntityStore(SUPPLIER_CONFIG);

// Fonction pour exposer des méthodes supplémentaires spécifiques aux fournisseurs
export function useSupplierExtras() {
  // Dans ce cas simple, nous retournons simplement les fonctionnalités de base
  return {
    ...useSupplier(),
    // Vous pouvez ajouter ici des fonctionnalités spécifiques aux fournisseurs si besoin
  };
}
