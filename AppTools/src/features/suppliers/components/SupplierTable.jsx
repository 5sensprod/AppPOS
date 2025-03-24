// src/features/suppliers/components/SupplierTable.jsx
import React, { useEffect } from 'react';
import {
  useSupplier,
  useSupplierExtras,
  useSupplierHierarchyStore,
  useSupplierTablePreferences,
} from '../stores/supplierStore';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '@/hooks/useEntityTable';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

function SupplierTable(props) {
  const { deleteSupplier } = useSupplier();
  const { syncSupplier } = useSupplierExtras();

  // Utiliser le store hiérarchique
  const {
    suppliers,
    loading: suppliersLoading,
    fetchSuppliers,
    initWebSocket,
  } = useSupplierHierarchyStore();

  // Utiliser les préférences de table
  const {
    preferences: tablePreferences,
    updatePreference: updateTablePreference,
    resetSection: resetPreferenceSection,
  } = useSupplierTablePreferences();

  // Restaurer la position de défilement
  useScrollRestoration(tablePreferences, 'supplier');

  // Initialiser les WebSockets et charger les données si nécessaire
  useEffect(() => {
    initWebSocket();
    if (suppliers.length === 0) {
      fetchSuppliers();
    }
  }, [initWebSocket, fetchSuppliers, suppliers.length]);

  // Utilisation du hook useEntityTable sans les abonnements WebSocket
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
    syncEntity: async (id) => {
      await syncSupplier(id);
    },
  });

  // Combinaison de l'état de chargement du store et des opérations
  const isLoading = suppliersLoading || operationLoading;

  // Configuration des filtres si nécessaire
  const filters = ENTITY_CONFIG.filters || [];

  // Gestionnaire pour mettre à jour les préférences de table
  const handlePreferencesChange = (section, value) => {
    updateTablePreference(section, value);
  };

  // Réinitialiser les filtres si nécessaire
  const handleResetFilters = () => {
    resetPreferenceSection('search');
  };

  return (
    <div className="space-y-4">
      {/* Bouton pour réinitialiser les filtres si des filtres sont actifs */}
      {Object.keys(tablePreferences.search.activeFilters).length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleResetFilters}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      <EntityTable
        data={suppliers || []}
        isLoading={isLoading}
        error={error}
        columns={ENTITY_CONFIG.columns}
        entityName="fournisseur"
        entityNamePlural="fournisseurs"
        baseRoute="/products/suppliers"
        filters={filters}
        searchFields={['name', 'description', 'contactName', 'email']}
        onDelete={handleDeleteEntity}
        onSync={handleSyncEntity}
        syncEnabled={ENTITY_CONFIG.syncEnabled}
        actions={['view', 'edit', 'delete', 'sync']}
        batchActions={['delete', 'sync']}
        pagination={{
          enabled: true,
          pageSize: ENTITY_CONFIG.defaultPageSize || 10,
          showPageSizeOptions: true,
          pageSizeOptions: [5, 10, 25, 50],
        }}
        defaultSort={ENTITY_CONFIG.defaultSort}
        tablePreferences={tablePreferences}
        onPreferencesChange={handlePreferencesChange}
        {...props}
      />
    </div>
  );
}

export default SupplierTable;
