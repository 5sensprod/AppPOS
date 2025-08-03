import React, { useState, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import UnifiedFilterBar from './components/UnifiedFilterBar';
import { BatchActions } from './components/BatchActions/BatchActions';
import { TableHeader } from './components/TableHeader';
import { TableRow } from './components/TableRow';
import { Pagination } from './components/Pagination';
import { LoadingState } from './components/LoadingState';
import ExportTableModal from './components/BatchActions/components/ExportTable';
import ExportLabelsModal from './components/BatchActions/components/ExportLabels';
import { useTableSelection } from './hooks/useTableSelection';
import { useTableSort } from './hooks/useTableSort';
import { useTableFilter } from './hooks/useTableFilter';
import { useTablePagination } from './hooks/useTablePagination';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { useActionToasts } from './components/BatchActions/hooks/useActionToasts';

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
  batchActions = ['delete', 'sync', 'export', 'labels', 'status', 'category', 'createSheet'],
  showBatchActions = true,
  showActions = true,

  enableUnifiedFilters = true,
  unifiedFilterOptions = [],
  selectedFilters = [],
  onFiltersChange,
  enableCategories = true,
  enableStatusFilter = true,

  pagination = {
    enabled: true,
    pageSize: 10,
    showPageSizeOptions: true,
    pageSizeOptions: [5, 10, 25, 50, 100],
  },
  onDelete,
  onSync,
  syncStats,
  onExport,
  onBatchStatusChange,
  onBatchCategoryChange,
  onBatchStockChange,
  onCreateSheet,
  categoryOptions = [],
  onBatchDelete,
  onBatchSync,
  onSearch,
  onFilter,
  searchFields = ['name'],
  searchPlaceholder,
  filters = [],
  searchProcessor,
  paginationEntityId = 'default',
  externalActiveFilters = [],
  productsData = [],
}) => {
  const [exportTableModalOpen, setExportTableModalOpen] = useState(false);
  const [exportLabelsModalOpen, setExportLabelsModalOpen] = useState(false);
  const { confirm, ConfirmModal } = useConfirmModal();

  const [internalSelectedFilters, setInternalSelectedFilters] = useState([]);

  const currentSelectedFilters = onFiltersChange ? selectedFilters : internalSelectedFilters;
  const handleFiltersChangeInternal = onFiltersChange || setInternalSelectedFilters;

  const hasSync = typeof onSync === 'function';
  const hasExport = typeof onExport === 'function';
  const hasBatchDelete = typeof onBatchDelete === 'function';
  const hasBatchSync = typeof onBatchSync === 'function';
  const hasCreateSheet = typeof onCreateSheet === 'function';
  const hasBatchStockChange = typeof onBatchStockChange === 'function';

  const { sort, sortedData, handleSort } = useTableSort(data, defaultSort);

  const filtersToUse =
    externalActiveFilters?.length > 0 ? externalActiveFilters : currentSelectedFilters;

  const { searchTerm, activeFilters, filteredData, handleSearchChange, handleFilterChange } =
    useTableFilter(
      sortedData,
      searchFields,
      enableUnifiedFilters ? [] : filters,
      onSearch,
      onFilter,
      searchProcessor,
      paginationEntityId
    );

  const {
    selectedItems,
    setSelectedItems,
    toggleSelection,
    selectAll,
    preserveSelectionOnNextDataChange,
    selectionInfo,
  } = useTableSelection(data, filteredData, {
    persist: true,
    entityName: entityName.toLowerCase(),
    pageKey: `${paginationEntityId}_${JSON.stringify(currentSelectedFilters)}`,
  });

  const { toastActions, removeToast } = useActionToasts();

  const {
    currentPage,
    pageSize,
    paginatedData,
    totalPages,
    setCurrentPage,
    setPageSize,
    paginationInfo,
  } = useTablePagination(filteredData, pagination, paginationEntityId);

  const handleBatchDelete = useCallback(async () => {
    if (selectedItems.length === 0) return;

    const selectedEntities = selectedItems
      .map((id) => filteredData.find((item) => item._id === id))
      .filter(Boolean);

    const entityNames = selectedEntities
      .map((entity) => {
        return entity._originalName || entity.name || entity.designation || entity._id;
      })
      .slice(0, 3)
      .join(', ');
    const moreText =
      selectedEntities.length > 3 ? ` et ${selectedEntities.length - 3} autre(s)` : '';
    const displayNames = `${entityNames}${moreText}`;

    try {
      const confirmed = await confirm({
        title: 'Confirmer la suppression par lot',
        message: `Êtes-vous sûr de vouloir supprimer ${selectedEntities.length === 1 ? 'cette' : 'ces'} ${
          selectedEntities.length === 1 ? entityName : entityNamePlural
        } ?\n\n${displayNames}\n\nCette action est irréversible.`,
        confirmText: 'Supprimer tout',
        cancelText: 'Annuler',
        variant: 'danger',
      });

      if (!confirmed) return;

      if (hasBatchDelete) {
        await onBatchDelete(selectedItems);

        if (selectedEntities.length === 1) {
          const entityDisplayName =
            selectedEntities[0]._originalName ||
            selectedEntities[0].name ||
            selectedEntities[0].designation ||
            selectedEntities[0]._id;
          toastActions.deletion.success(1, `${entityName} "${entityDisplayName}"`);
        } else {
          const toastEntityNames = selectedEntities
            .slice(0, 3)
            .map(
              (entity) => entity._originalName || entity.name || entity.designation || entity._id
            )
            .join(', ');
          const toastMoreText =
            selectedEntities.length > 3 ? ` et ${selectedEntities.length - 3} autre(s)` : '';

          toastActions.generic.success(
            `${selectedEntities.length} ${entityNamePlural} supprimés : ${toastEntityNames}${toastMoreText}`,
            'Suppression terminée'
          );
        }

        setSelectedItems([]);
      } else if (typeof onDelete === 'function') {
        let successCount = 0;
        let failedEntities = [];

        for (const entity of selectedEntities) {
          try {
            await onDelete(entity._id);
            successCount++;
          } catch (error) {
            failedEntities.push(entity);
            const entityName = entity._originalName || entity.name || entity._id;
            console.error(`Erreur suppression ${entityName}:`, error);
          }
        }

        if (successCount > 0) {
          if (successCount === 1 && selectedEntities.length === 1) {
            const entityDisplayName =
              selectedEntities[0].name ||
              selectedEntities[0].designation ||
              selectedEntities[0]._id;
            toastActions.deletion.success(1, `${entityName} "${entityDisplayName}"`);
          } else {
            const successEntities = selectedEntities.filter((e) => !failedEntities.includes(e));
            const successNames = successEntities
              .slice(0, 3)
              .map(
                (entity) => entity._originalName || entity.name || entity.designation || entity._id
              )
              .join(', ');
            const successMoreText =
              successEntities.length > 3 ? ` et ${successEntities.length - 3} autre(s)` : '';

            toastActions.generic.success(
              `${successCount} ${successCount === 1 ? entityName : entityNamePlural} supprimés : ${successNames}${successMoreText}`,
              'Suppression terminée'
            );
          }
        }

        if (failedEntities.length > 0) {
          const failedNames = failedEntities
            .slice(0, 2)
            .map(
              (entity) => entity._originalName || entity.name || entity.designation || entity._id
            )
            .join(', ');
          const failedMoreText =
            failedEntities.length > 2 ? ` et ${failedEntities.length - 2} autre(s)` : '';

          toastActions.deletion.error(
            `Échec suppression : ${failedNames}${failedMoreText}`,
            entityName
          );
        }

        setSelectedItems([]);
      }
    } catch (err) {
      console.error(`Erreur de suppression par lot:`, err);
      toastActions.deletion.error(`Erreur lors de la suppression : ${err.message}`, entityName);
    }
  }, [
    selectedItems,
    filteredData,
    entityName,
    entityNamePlural,
    hasBatchDelete,
    onBatchDelete,
    onDelete,
    setSelectedItems,
    confirm,
    toastActions,
  ]);

  const handleBatchSync = useCallback(async () => {
    if (selectedItems.length === 0) return;

    const selectedEntities = selectedItems
      .map((id) => filteredData.find((item) => item._id === id))
      .filter(Boolean);

    const entityNames = selectedEntities
      .map((entity) => entity._originalName || entity.name || entity.designation || entity._id)
      .slice(0, 3)
      .join(', ');
    const moreText =
      selectedEntities.length > 3 ? ` et ${selectedEntities.length - 3} autre(s)` : '';
    const displayNames = `${entityNames}${moreText}`;

    try {
      const confirmed = await confirm({
        title: 'Confirmer la synchronisation',
        message: `Synchroniser ${selectedEntities.length === 1 ? 'cette' : 'ces'} ${
          selectedEntities.length === 1 ? entityName : entityNamePlural
        } ?\n\n${displayNames}`,
        confirmText: 'Synchroniser',
        cancelText: 'Annuler',
        variant: 'primary',
      });

      if (!confirmed) return;

      const toastId = toastActions.sync.start(selectedEntities.length, entityName);

      try {
        if (hasBatchSync) {
          let completed = 0;
          for (const id of selectedItems) {
            await onSync(id);
            completed++;
            toastActions.sync.updateProgress(toastId, completed, selectedItems.length);
          }
        } else if (hasSync) {
          let completed = 0;

          for (const id of selectedItems) {
            try {
              await onSync(id);
              completed++;
              toastActions.sync.updateProgress(toastId, completed, selectedItems.length);
            } catch (syncErr) {
              console.error(`Erreur sync ${id}:`, syncErr);
              completed++;
              toastActions.sync.updateProgress(toastId, completed, selectedItems.length);
            }
          }
        }

        removeToast(toastId);
        toastActions.sync.success(selectedEntities.length, entityName);
        setSelectedItems([]);
      } catch (apiErr) {
        removeToast(toastId);
        console.error('Erreur synchronisation API:', apiErr);
        toastActions.sync.error(apiErr.message, entityName);
      }
    } catch (err) {
      console.error('Erreur synchronisation générale:', err);
      toastActions.sync.error(err.message, entityName);
    }
  }, [
    selectedItems,
    filteredData,
    entityName,
    entityNamePlural,
    hasBatchSync,
    hasSync,
    onBatchSync,
    onSync,
    setSelectedItems,
    confirm,
    toastActions,
    removeToast,
  ]);

  const handleBatchExport = () => setExportTableModalOpen(true);
  const handleBatchLabels = () => setExportLabelsModalOpen(true);

  const handleTableExportConfirm = async (exportConfig) => {
    if (hasExport) {
      try {
        await onExport(exportConfig);
        setExportTableModalOpen(false);
      } catch (err) {
        console.error("Erreur lors de l'export tableau:", err);
      }
    }
  };

  const handleLabelsExportConfirm = async (exportConfig) => {
    if (hasExport) {
      try {
        await onExport(exportConfig);
        setExportLabelsModalOpen(false);
      } catch (err) {
        console.error("Erreur lors de l'export étiquettes:", err);
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

  const handleBatchStockChange = (itemIds, stockAction) => {
    if (itemIds.length === 0 || typeof onBatchStockChange !== 'function') return;

    const selectedObjects = itemIds
      .map((id) => filteredData.find((item) => item._id === id))
      .filter(Boolean);

    onBatchStockChange(selectedObjects, stockAction);
  };

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

  const availableBatchActions = batchActions.filter((action) => {
    if (action === 'sync') return hasSync || hasBatchSync;
    if (action === 'delete') return typeof onDelete === 'function' || hasBatchDelete;
    if (action === 'export') return hasExport;
    if (action === 'labels') return hasExport;
    if (action === 'status') return typeof onBatchStatusChange === 'function';
    if (action === 'category')
      return typeof onBatchCategoryChange === 'function' && categoryOptions.length > 0;
    if (action === 'stock') return hasBatchStockChange;
    if (action === 'createSheet') return hasCreateSheet;
    return true;
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
            <div className="flex-shrink-0 w-full lg:w-auto">
              <SearchBar
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                entityNamePlural={entityNamePlural}
                customPlaceholder={searchPlaceholder}
              />
            </div>

            {enableUnifiedFilters && (
              <div className="flex-1 w-full lg:w-auto">
                <UnifiedFilterBar
                  filterOptions={unifiedFilterOptions}
                  selectedFilters={currentSelectedFilters}
                  onChange={handleFiltersChangeInternal}
                  enableCategories={enableCategories}
                  enableStatusFilter={enableStatusFilter}
                  productsData={filteredData}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {showBatchActions && (
        <BatchActions
          selectedItems={selectedItems}
          entityName={entityName}
          entityNamePlural={entityNamePlural}
          batchActions={availableBatchActions}
          onBatchDelete={handleBatchDelete}
          onBatchSync={hasSync || hasBatchSync ? handleBatchSync : undefined}
          onBatchExport={hasExport ? handleBatchExport : undefined}
          onBatchLabels={hasExport ? handleBatchLabels : undefined}
          onBatchStatusChange={handleBatchStatusChange}
          onBatchCategoryChange={handleBatchCategoryChange}
          onBatchStockChange={hasBatchStockChange ? handleBatchStockChange : undefined}
          onCreateSheet={hasCreateSheet ? onCreateSheet : undefined}
          categoryOptions={categoryOptions}
          syncStats={syncStats}
        />
      )}

      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
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
            showActions={showActions}
          />

          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showActions ? 2 : 1)}
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
                  showActions={showActions}
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

      <ExportTableModal
        isOpen={exportTableModalOpen}
        onClose={() => setExportTableModalOpen(false)}
        onExport={handleTableExportConfirm}
        selectedItems={selectedItems}
        entityName={entityName}
        entityNamePlural={entityNamePlural}
        activeFilters={filtersToUse}
      />

      <ExportLabelsModal
        isOpen={exportLabelsModalOpen}
        onClose={() => setExportLabelsModalOpen(false)}
        onExport={handleLabelsExportConfirm}
        selectedItems={selectedItems}
        entityName={entityName}
        entityNamePlural={entityNamePlural}
        activeFilters={filtersToUse}
        productsData={productsData}
      />

      <ConfirmModal />
    </div>
  );
};

export default EntityTable;
