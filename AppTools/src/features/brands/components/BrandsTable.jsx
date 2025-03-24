// src/features/brands/components/BrandsTable.jsx
import React from 'react';
import {
  useBrand,
  useBrandExtras,
  useBrandDataStore,
  useBrandTablePreferences,
} from '../stores/brandStore';
import { useEntityTableWithPreferences } from '@/hooks/useEntityTableWithPreferences';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';

function BrandsTable(props) {
  const { deleteBrand } = useBrand();
  const { syncBrand } = useBrandExtras();

  const {
    entities: brands,
    tablePreferences,
    isLoading,
    error,
    handleDeleteEntity,
    handleSyncEntity,
    handlePreferencesChange,
    handleResetFilters,
  } = useEntityTableWithPreferences({
    entityType: 'brand',
    entityStore: {
      data: useBrandDataStore().brands,
      loading: useBrandDataStore().loading,
      fetchEntities: useBrandDataStore().fetchBrands,
      initWebSocket: useBrandDataStore().initWebSocket,
    },
    preferencesStore: useBrandTablePreferences(),
    deleteEntityFn: async (id) => await deleteBrand(id),
    syncEntityFn: async (id) => await syncBrand(id),
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
        data={brands || []}
        isLoading={isLoading}
        error={error}
        columns={ENTITY_CONFIG.columns}
        entityName="marque"
        entityNamePlural="marques"
        baseRoute="/products/brands"
        filters={filters}
        searchFields={['name', 'description']}
        onDelete={handleDeleteEntity}
        onSync={handleSyncEntity}
        syncEnabled={ENTITY_CONFIG.syncEnabled}
        actions={['view', 'edit', 'delete', 'sync']}
        batchActions={['delete', 'sync']}
        pagination={{
          enabled: true,
          pageSize: ENTITY_CONFIG.defaultPageSize || 5,
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

export default BrandsTable;
