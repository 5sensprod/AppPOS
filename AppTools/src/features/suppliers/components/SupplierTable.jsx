// src/features/suppliers/components/SupplierTable.jsx
import React, { useEffect } from 'react';
import { useSupplier } from '../stores/supplierStore';
import { useSupplierDataStore } from '../stores/supplierStore';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '../../../hooks/useEntityTable';

function SupplierTable(props) {
  const { deleteSupplier } = useSupplier();

  // Utiliser le store dédié (non-hiérarchique)
  const {
    suppliers,
    loading: suppliersLoading,
    fetchSuppliers,
    initWebSocket,
  } = useSupplierDataStore();

  // Initialiser les WebSockets et charger les données si nécessaire
  useEffect(() => {
    // Initialiser les écouteurs WebSocket
    initWebSocket();

    // Charger les fournisseurs seulement s'ils ne sont pas déjà chargés
    if (suppliers.length === 0) {
      fetchSuppliers();
    }
  }, [initWebSocket, fetchSuppliers, suppliers.length]);

  // Utilisation du hook useEntityTable sans les abonnements WebSocket
  const {
    loading: operationLoading,
    error,
    handleDeleteEntity,
  } = useEntityTable({
    entityType: 'supplier',
    fetchEntities: fetchSuppliers,
    deleteEntity: async (id) => {
      await deleteSupplier(id);
      // Le refresh se fera automatiquement via les événements WebSocket
    },
    syncEntity: null, // Les fournisseurs n'ont pas de synchronisation (syncEnabled: false)
  });

  // Combinaison de l'état de chargement du store et des opérations
  const isLoading = suppliersLoading || operationLoading;

  // Configuration des filtres
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
      onSync={null} // Pas de synchronisation pour les fournisseurs
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      actions={['view', 'edit', 'delete']} // Retrait de 'sync' car non applicable
      batchActions={['delete']} // Retrait de 'sync' car non applicable
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
