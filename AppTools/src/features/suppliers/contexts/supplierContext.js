// src/features/suppliers/contexts/supplierContext.js
import { createEntityContext } from '../../../factories/createEntityContext';

// Configuration de l'entité Supplier
const SUPPLIER_CONFIG = {
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  syncEnabled: false,
  imagesEnabled: true,
};

// Créer le contexte avec la factory
export const {
  supplierContext: SupplierContext,
  SupplierProvider,
  useSupplier,
  useSupplierExtras,
} = createEntityContext(SUPPLIER_CONFIG);
