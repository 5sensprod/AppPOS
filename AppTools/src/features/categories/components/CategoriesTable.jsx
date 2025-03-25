import React from 'react';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { useCategoryTable } from '../hooks/useCategoryTable';

/**
 * Composant de table pour l'affichage hiérarchique des catégories
 * @param {Object} props Propriétés du composant
 * @returns {React.ReactElement} Composant de tableau de catégories
 */
function CategoriesTable(props) {
  const {
    processedData,
    isLoading,
    error,
    tablePreferences,
    handleDeleteEntity,
    handleSyncEntity,
    handlePreferencesChange,
    handleResetFilters,
    handleRowClick,
    searchProcessor,
    sortProcessor,
  } = useCategoryTable();

  // Configuration des filtres
  const filters = ENTITY_CONFIG.filters || [];

  // Désactiver le tri des colonnes dans cette table
  const disableSorting = (columns) => {
    return columns.map((column) => ({
      ...column,
      key: column.key,
      sortable: false,
    }));
  };

  const nonSortableColumns = disableSorting(ENTITY_CONFIG.columns);

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
        data={processedData}
        isLoading={isLoading}
        error={error}
        columns={nonSortableColumns}
        entityName="catégorie"
        entityNamePlural="catégories"
        baseRoute="/products/categories"
        filters={filters}
        searchFields={['_originalName', 'description']}
        searchProcessor={searchProcessor}
        sortProcessor={sortProcessor}
        onDelete={handleDeleteEntity}
        disableSorting={true}
        onSync={handleSyncEntity}
        syncEnabled={ENTITY_CONFIG.syncEnabled}
        actions={['view', 'edit', 'delete', 'sync']}
        batchActions={['delete', 'sync']}
        pagination={{
          enabled: true,
          pageSize: tablePreferences.pagination.pageSize,
          showPageSizeOptions: true,
          pageSizeOptions: [5, 10, 25, 50],
        }}
        defaultSort={ENTITY_CONFIG.defaultSort}
        tablePreferences={tablePreferences}
        onPreferencesChange={handlePreferencesChange}
        onRowClick={handleRowClick}
        {...props}
      />
    </div>
  );
}

export default CategoriesTable;
