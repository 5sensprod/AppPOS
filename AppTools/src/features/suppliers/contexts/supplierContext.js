// src/features/suppliers/contexts/supplierContext.js
import { createEntityContext } from '../../../factories/createEntityContext';

const { SupplierProvider, useSupplier } = createEntityContext({
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  syncEnabled: false,
});

export { SupplierProvider, useSupplier };
