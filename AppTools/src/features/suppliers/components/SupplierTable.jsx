// src/features/suppliers/components/SupplierTable.jsx
import React, { useEffect } from 'react';
import { useSupplier } from '../stores/supplierStore'; // Import depuis le store Zustand
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '../../../hooks/useEntityTable';

function SupplierTable(props) {
  const { suppliers, fetchSuppliers, deleteSupplier, syncSupplier, initWebSocketListeners } =
    useSupplier();

  // Initialiser les écouteurs WebSocket au montage du composant
  useEffect(() => {
    const cleanup = initWebSocketListeners();
    return cleanup;
  }, [initWebSocketListeners]);

  // Utilisation du hook useEntityTable avec gestion automatique des événements standard
  const { loading, error, handleDeleteEntity, handleSyncEntity } = useEntityTable({
    entityType: 'supplier',
    fetchEntities: fetchSuppliers,
    deleteEntity: deleteSupplier,
    syncEntity: syncSupplier,
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
      onDelete={handleDeleteEntity}
      onSync={handleSyncEntity}
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
