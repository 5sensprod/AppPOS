// src/features/suppliers/components/SupplierTable.jsx
import React, { useEffect } from 'react';
import { useSupplier } from '../contexts/supplierContext';
import { EntityTable } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';

function SupplierTable() {
  const { suppliers, loading, error, fetchSuppliers, deleteSupplier } = useSupplier();

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return (
    <EntityTable
      data={suppliers || []}
      isLoading={loading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="fournisseur"
      entityNamePlural="fournisseurs"
      baseRoute="/products/suppliers"
      searchFields={['name', 'supplier_code', 'customer_code', 'contact.name', 'contact.email']}
      onDelete={deleteSupplier}
      actions={['view', 'edit', 'delete']}
      batchActions={['delete']}
      pagination={{
        enabled: true,
        pageSize: 10,
        showPageSizeOptions: true,
        pageSizeOptions: [5, 10, 25, 50],
      }}
      defaultSort={ENTITY_CONFIG.defaultSort}
    />
  );
}

export default SupplierTable;
