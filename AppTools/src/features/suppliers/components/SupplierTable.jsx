// src/features/suppliers/components/SupplierTable.jsx
import React, { useEffect } from 'react';
import { useSupplier } from '../contexts/supplierContext';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import { useEntityEvents } from '../../../hooks/useEntityEvents';

function SupplierTable(props) {
  const { suppliers, loading, error, fetchSuppliers, deleteSupplier, syncSupplier } = useSupplier();

  // Chargement direct des données au montage du composant
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Utilisation du hook useEntityEvents pour écouter les événements WebSocket
  useEntityEvents('supplier', {
    onCreated: () => {
      console.log('[WS-DEBUG] Nouveau fournisseur créé, actualisation de la liste');
      fetchSuppliers();
    },
    onUpdated: () => {
      console.log('[WS-DEBUG] Fournisseur mis à jour, actualisation de la liste');
      fetchSuppliers();
    },
    onDeleted: () => {
      console.log('[WS-DEBUG] Fournisseur supprimé, actualisation de la liste');
      fetchSuppliers();
    },
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
