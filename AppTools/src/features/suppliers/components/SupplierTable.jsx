// src/features/suppliers/components/SupplierTable.jsx
import React, { useEffect } from 'react';
import { useSupplier } from '../contexts/supplierContext';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';

function SupplierTable(props) {
  const { suppliers, loading, error, fetchSuppliers, deleteSupplier, syncSupplier } = useSupplier();

  // Chargement direct des données au montage du composant
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Configuration des filtres
  const filters = [];

  return (
    <EntityTable
      data={suppliers || []}
      isLoading={loading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="fournisseur"
      entityNamePlural="fournisseurs"
      baseRoute="/products/suppliers"
      filters={filters}
      searchFields={['name']}
      onDelete={deleteSupplier}
      onSync={syncSupplier}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      actions={['view', 'edit', 'delete', 'sync']}
      batchActions={['delete', 'sync']}
      pagination={{
        enabled: true,
        pageSize: 5,
        showPageSizeOptions: true,
        pageSizeOptions: [5, 10, 25, 50],
      }}
      defaultSort={ENTITY_CONFIG.defaultSort}
      {...props}
    />
  );
}

export default SupplierTable;
