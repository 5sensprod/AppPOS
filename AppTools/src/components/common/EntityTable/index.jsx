// Composant principal EntityTable (index.jsx)
import React, { useState, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import { FilterBar } from './components/FilterBar';
import { BatchActions } from './components/BatchActions';
import { TableHeader } from './components/TableHeader';
import { TableRow } from './components/TableRow';
import { Pagination } from './components/Pagination';
import { LoadingState } from './components/LoadingState';
import ExportConfigModal from './ExportConfigModal';
import { useTableSelection } from './hooks/useTableSelection';
import { useTableSort } from './hooks/useTableSort';
import { useTableFilter } from './hooks/useTableFilter';
import { useTablePagination } from './hooks/useTablePagination';

const EntityTable = ({
  data = [],
  isLoading = false,
  error = null,
  columns = [],
  entityName = '',
  entityNamePlural = '',
  baseRoute = '',
  defaultSort = { field: 'name', direction: 'asc' },
  actions = ['view', 'edit', 'delete', 'sync'],
  batchActions = ['delete', 'sync', 'export', 'status', 'category', 'createSheet'],
  pagination = {
    enabled: true,
    pageSize: 10,
    showPageSizeOptions: true,
    pageSizeOptions: [5, 10, 25, 50, 100],
  },
  onDelete,
  onSync,
  onExport,
  onBatchStatusChange,
  onBatchCategoryChange,
  onCreateSheet,
  onCaptureContent,
  categoryOptions = [],
  onBatchDelete,
  onBatchSync,
  onSearch,
  onFilter,
  searchFields = ['name'],
  filters = [],
  searchProcessor,
  paginationEntityId = 'default',
  externalActiveFilters = [],
}) => {
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Fonctionnalités disponibles
  const hasSync = typeof onSync === 'function';
  const hasExport = typeof onExport === 'function';
  const hasBatchDelete = typeof onBatchDelete === 'function';
  const hasBatchSync = typeof onBatchSync === 'function';
  const hasCreateSheet = typeof onCreateSheet === 'function';

  // Hooks pour la gestion des données
  const { sort, sortedData, handleSort } = useTableSort(data, defaultSort);
  const { searchTerm, activeFilters, filteredData, handleSearchChange, handleFilterChange } =
    useTableFilter(
      sortedData,
      searchFields,
      filters,
      onSearch,
      onFilter,
      searchProcessor,
      paginationEntityId
    );
  const { selectedItems, setSelectedItems, toggleSelection, selectAll } = useTableSelection(
    data,
    filteredData
  );
  const {
    currentPage,
    pageSize,
    paginatedData,
    totalPages,
    setCurrentPage,
    setPageSize,
    paginationInfo,
  } = useTablePagination(filteredData, pagination, paginationEntityId);

  // Actions par lot
  const handleBatchDelete = useCallback(() => {
    if (selectedItems.length === 0) return;

    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer ces ${selectedItems.length} ${
          selectedItems.length === 1 ? entityName : entityNamePlural
        } ?`
      )
    ) {
      if (hasBatchDelete) {
        onBatchDelete(selectedItems)
          .then(() => setSelectedItems([]))
          .catch((err) => console.error(`Erreur de suppression par lot:`, err));
      } else if (typeof onDelete === 'function') {
        Promise.all(selectedItems.map((id) => onDelete(id)))
          .then(() => setSelectedItems([]))
          .catch((err) => console.error(`Erreur de suppression:`, err));
      }
    }
  }, [
    selectedItems,
    entityName,
    entityNamePlural,
    hasBatchDelete,
    onBatchDelete,
    onDelete,
    setSelectedItems,
  ]);

  const handleBatchSync = useCallback(() => {
    if (selectedItems.length === 0) return;

    if (hasBatchSync) {
      onBatchSync(selectedItems).catch((err) =>
        console.error(`Erreur de synchronisation par lot:`, err)
      );
    } else if (hasSync) {
      Promise.all(selectedItems.map((id) => onSync(id))).catch((err) =>
        console.error(`Erreur de synchronisation:`, err)
      );
    }
  }, [selectedItems, hasBatchSync, hasSync, onBatchSync, onSync]);

  const handleBatchExport = () => setExportModalOpen(true);

  const handleExportConfirm = async (exportConfig) => {
    if (hasExport) {
      try {
        await onExport(exportConfig);
        setExportModalOpen(false);
      } catch (err) {
        console.error("Erreur lors de l'export:", err);
      }
    }
  };

  const handleBatchStatusChange = (itemIds, newStatus) => {
    if (itemIds.length === 0 || typeof onBatchStatusChange !== 'function') return;

    onBatchStatusChange(itemIds, newStatus).catch((err) => {
      console.error(`Erreur lors du changement de statut:`, err);
    });
  };

  const handleBatchCategoryChange = (itemIds, categoryId) => {
    if (itemIds.length === 0 || typeof onBatchCategoryChange !== 'function') return;

    onBatchCategoryChange(itemIds, categoryId).catch((err) => {
      console.error(`Erreur lors du changement de catégorie:`, err);
    });
  };

  // Filtres à utiliser
  const filtersToUse = externalActiveFilters?.length > 0 ? externalActiveFilters : activeFilters;

  // États du composant
  if (isLoading && data.length === 0) return <LoadingState />;

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 p-6 rounded-lg">
        <h2 className="text-red-800 dark:text-red-200 text-lg font-medium mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  // Filtrer les actions par lot disponibles
  const availableBatchActions = batchActions.filter((action) => {
    if (action === 'sync') return hasSync || hasBatchSync;
    if (action === 'delete') return typeof onDelete === 'function' || hasBatchDelete;
    if (action === 'export') return hasExport;
    if (action === 'status') return typeof onBatchStatusChange === 'function';
    if (action === 'category')
      return typeof onBatchCategoryChange === 'function' && categoryOptions.length > 0;
    if (action === 'createSheet') return hasCreateSheet;
    if (action === 'captureContent') return typeof onCaptureContent === 'function';
    return true;
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            entityNamePlural={entityNamePlural}
          />
          {filters.length > 0 && (
            <FilterBar
              filters={filters}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
            />
          )}
        </div>
      </div>

      {selectedItems.length > 0 && (
        <BatchActions
          selectedItems={selectedItems}
          entityName={entityName}
          entityNamePlural={entityNamePlural}
          batchActions={availableBatchActions}
          onBatchDelete={handleBatchDelete}
          onBatchSync={hasSync || hasBatchSync ? handleBatchSync : undefined}
          onBatchExport={hasExport ? handleBatchExport : undefined}
          onBatchStatusChange={handleBatchStatusChange}
          onBatchCategoryChange={handleBatchCategoryChange}
          onCreateSheet={hasCreateSheet ? onCreateSheet : undefined}
          onCaptureContent={onCaptureContent}
          categoryOptions={categoryOptions}
        />
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <TableHeader
            columns={columns}
            sort={sort}
            onSort={handleSort}
            selectAll={selectAll}
            allSelected={
              paginatedData.length > 0 &&
              paginatedData.every((item) => selectedItems.includes(item._id))
            }
            someSelected={
              selectedItems.length > 0 &&
              paginatedData.some((item) => selectedItems.includes(item._id)) &&
              !paginatedData.every((item) => selectedItems.includes(item._id))
            }
          />

          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center"
                >
                  Aucun élément trouvé
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <TableRow
                  key={item._id}
                  item={item}
                  columns={columns}
                  actions={actions.filter((a) => a !== 'sync' || hasSync)}
                  isSelected={selectedItems.includes(item._id)}
                  onToggleSelection={toggleSelection}
                  onRowClick={() => {}}
                  onDelete={onDelete}
                  onSync={hasSync ? onSync : undefined}
                  baseRoute={baseRoute}
                  syncEnabled={hasSync}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.enabled && (totalPages > 1 || filteredData.length >= 5) && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={pagination.pageSizeOptions}
          showPageSizeOptions={pagination.showPageSizeOptions}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          paginationInfo={paginationInfo}
          entityNamePlural={entityNamePlural}
        />
      )}

      <ExportConfigModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExportConfirm}
        selectedItems={selectedItems}
        entityName={entityName}
        entityNamePlural={entityNamePlural}
        activeFilters={filtersToUse}
      />
    </div>
  );
};

export default EntityTable;
