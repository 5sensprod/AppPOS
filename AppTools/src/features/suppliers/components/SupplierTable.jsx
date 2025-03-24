import React from 'react';
import {
  useSupplier,
  useSupplierDataStore,
  useSupplierTablePreferences,
} from '../stores/supplierStore';
import { useEntityTableWithPreferences } from '@/hooks/useEntityTableWithPreferences';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';

function SupplierTable(props) {
  const { deleteSupplier } = useSupplier();

  // Utiliser le hook personnalisé pour la gestion des préférences
  const {
    entities: suppliers,
    tablePreferences,
    isLoading,
    error,
    handleDeleteEntity,
    handlePreferencesChange,
    handleResetFilters,
  } = useEntityTableWithPreferences({
    entityType: 'supplier',
    entityStore: {
      data: useSupplierDataStore().suppliers,
      loading: useSupplierDataStore().loading,
      fetchEntities: useSupplierDataStore().fetchSuppliers,
      initWebSocket: useSupplierDataStore().initWebSocket,
    },
    preferencesStore: useSupplierTablePreferences(),
    deleteEntityFn: async (id) => await deleteSupplier(id),
    syncEntityFn: null, // Les fournisseurs n'ont pas de synchronisation
  });

  // Configuration des filtres
  const filters = ENTITY_CONFIG.filters || [];

  return (
    <div className="space-y-4">
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
        searchFields={['name']}
        onDelete={handleDeleteEntity}
        onSync={null} // Pas de synchronisation pour les fournisseurs
        syncEnabled={ENTITY_CONFIG.syncEnabled}
        actions={['view', 'edit', 'delete']} // Retrait de 'sync' car non applicable
        batchActions={['delete']} // Retrait de 'sync' car non applicable
        pagination={{
          enabled: true,
          pageSize: tablePreferences.pagination.pageSize,
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
