// src/features/suppliers/components/SupplierTable.jsx
import React from 'react';
import {
  useSupplier,
  useSupplierExtras,
  useSupplierHierarchyStore,
  useSupplierTablePreferences,
} from '../stores/supplierStore';
import { useEntityWithPreferences } from '@/hooks/useEntityWithPreferences';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';

function SupplierTable(props) {
  const { deleteSupplier } = useSupplier();
  const { syncSupplier } = useSupplierExtras();

  const {
    entities: suppliers,
    tablePreferences,
    isLoading,
    error,
    handleDeleteEntity,
    handleSyncEntity,
    handlePreferencesChange,
    handleResetFilters,
  } = useEntityWithPreferences({
    entityType: 'supplier',
    entityStore: {
      data: useSupplierHierarchyStore().suppliers,
      loading: useSupplierHierarchyStore().loading,
      fetchEntities: useSupplierHierarchyStore().fetchSuppliers,
      initWebSocket: useSupplierHierarchyStore().initWebSocket,
    },
    preferencesStore: useSupplierTablePreferences(),
    deleteEntityFn: async (id) => await deleteSupplier(id),
    syncEntityFn: async (id) => await syncSupplier(id),
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
