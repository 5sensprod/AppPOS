//AppTools\src\features\suppliers\components\SupplierTable.jsx
import React, { useEffect } from 'react';
import { useSupplier, useSupplierDataStore } from '../stores/supplierStore';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '../../../hooks/useEntityTable';
import { usePaginationStore } from '../../../stores/usePaginationStore';

function SupplierTable(props) {
  const { deleteSupplier } = useSupplier();
  const {
    suppliers,
    loading: suppliersLoading,
    fetchSuppliers,
    initWebSocket,
  } = useSupplierDataStore();

  // Utiliser directement le store de pagination
  const { getPaginationParams } = usePaginationStore();
  const { pageSize: persistedPageSize } = getPaginationParams('supplier');

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
    entityType: 'fournisseur',
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

  return (
    <EntityTable
      data={suppliers || []}
      isLoading={isLoading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="fournisseur"
      entityNamePlural="fournisseurs"
      baseRoute="/products/suppliers"
      searchFields={['name']}
      onDelete={handleDeleteEntity}
      syncEnabled={syncEnabled}
      actions={['view', 'edit', 'delete', 'sync']}
      batchActions={['delete', 'sync']}
      showActions={false}
      onSync={handleSyncEntity}
      pagination={{
        enabled: true,
        pageSize: persistedPageSize || 5, // Utiliser la taille persitante ou la valeur par défaut
        showPageSizeOptions: true,
        pageSizeOptions: [5, 10, 25, 50],
      }}
      defaultSort={ENTITY_CONFIG.defaultSort}
      // Passer l'identifiant d'entité pour la pagination
      paginationEntityId="supplier"
      {...props}
    />
  );
}

export default SupplierTable;
