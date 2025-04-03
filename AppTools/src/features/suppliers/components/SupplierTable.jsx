import React, { useEffect } from 'react';
import { useSupplier } from '../stores/supplierStore';
import { useSupplierDataStore } from '../stores/supplierStore';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '../../../hooks/useEntityTable';

function SupplierTable(props) {
  const { deleteSupplier } = useSupplier();
  const {
    suppliers,
    loading: suppliersLoading,
    fetchSuppliers,
    initWebSocket,
  } = useSupplierDataStore();

  const { sync: syncEnabled } = ENTITY_CONFIG.features;

  useEffect(() => {
    if (syncEnabled) {
      initWebSocket();
    }

    if (suppliers.length === 0) {
      fetchSuppliers();
    }
  }, [initWebSocket, fetchSuppliers, suppliers.length, syncEnabled]);

  const {
    loading: operationLoading,
    error,
    handleDeleteEntity,
    handleSyncEntity,
  } = useEntityTable({
    entityType: 'supplier',
    fetchEntities: fetchSuppliers,
    deleteEntity: async (id) => {
      await deleteSupplier(id);
    },
    syncEntity: syncEnabled
      ? async (id) => {
          /* À implémenter si un jour le sync est dispo */
        }
      : undefined,
  });

  const isLoading = suppliersLoading || operationLoading;

  const filters = [];

  return (
    <EntityTable
      data={suppliers || []}
      isLoading={isLoading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="fournisseur"
      entityNamePlural="fournisseurs"
      baseRoute="/products/suppliers"
      filters={filters}
      searchFields={['name']}
      onDelete={handleDeleteEntity}
      onSync={syncEnabled ? handleSyncEntity : undefined}
      syncEnabled={syncEnabled}
      actions={['view', 'edit', 'delete', ...(syncEnabled ? ['sync'] : [])]}
      batchActions={['delete', ...(syncEnabled ? ['sync'] : [])]}
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
