// src/features/suppliers/components/SupplierTable.jsx
import React from 'react';
import { useSupplier } from '../contexts/supplierContext';
import { EntityTable } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';
import { useFetchOnce } from '../../../hooks/useFetchOnce';

function SupplierTable(props) {
  const { suppliers, loading, error, fetchSuppliers, deleteSupplier, syncSupplier, isCacheStale } =
    useSupplier();

  // Utilisation du hook personnalisé pour charger les données une seule fois
  useFetchOnce(fetchSuppliers, suppliers, isCacheStale, {
    debug: true,
    name: 'fournisseurs',
  });

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
        pageSize: 10,
        showPageSizeOptions: true,
        pageSizeOptions: [5, 10, 25, 50],
      }}
      defaultSort={ENTITY_CONFIG.defaultSort}
      {...props}
    />
  );
}

export default SupplierTable;
