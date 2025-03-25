// src/features/products/components/ProductTable.jsx
import React from 'react';
import {
  useProduct,
  useProductDataStore,
  useProductTablePreferences,
} from '../stores/productStore';
import { useEntityWithPreferences } from '@/hooks/useEntityWithPreferences';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';

function ProductTable(props) {
  const { deleteProduct } = useProduct();

  const {
    entities: products,
    tablePreferences,
    isLoading,
    error,
    handleDeleteEntity,
    handleSyncEntity,
    handlePreferencesChange,
    handleResetFilters,
  } = useEntityWithPreferences({
    entityType: 'product',
    entityStore: {
      data: useProductDataStore().products,
      loading: useProductDataStore().loading,
      fetchEntities: useProductDataStore().fetchProducts,
      initWebSocket: useProductDataStore().initWebSocket,
    },
    preferencesStore: useProductTablePreferences(),
    deleteEntityFn: async (id) => await deleteProduct(id),
    syncEntityFn: async (id) => {
      // Synchronisation standard
    },
  });

  // Configuration des filtres
  const filters = [
    {
      id: 'status',
      type: 'select',
      allLabel: 'Tous les statuts',
      options: [
        { value: 'published', label: 'Publiés' },
        { value: 'draft', label: 'Brouillons' },
        { value: 'archived', label: 'Archivés' },
      ],
    },
  ];

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
        data={products || []}
        isLoading={isLoading}
        error={error}
        columns={ENTITY_CONFIG.columns}
        entityName="produit"
        entityNamePlural="produits"
        baseRoute="/products"
        filters={filters}
        searchFields={['name', 'sku']}
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

export default ProductTable;
