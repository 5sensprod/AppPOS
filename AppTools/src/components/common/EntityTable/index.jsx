import React, { useState, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import UnifiedFilterBar from './components/UnifiedFilterBar';
import { BatchActions } from './components/BatchActions/BatchActions';
import { TableHeader } from './components/TableHeader';
import { TableRow } from './components/TableRow';
import { Pagination } from './components/Pagination';
import { LoadingState } from './components/LoadingState';
import ExportConfigModal from './components/BatchActions/components/ExportModal';
import { useTableSelection } from './hooks/useTableSelection';
import { useTableSort } from './hooks/useTableSort';
import { useTableFilter } from './hooks/useTableFilter';
import { useTablePagination } from './hooks/useTablePagination';
import { useConfirmModal } from '../../hooks/useConfirmModal';

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
  showBatchActions = true,
  showActions = true,

  // NOUVELLES PROPS pour UnifiedFilterBar
  enableUnifiedFilters = true, // Activer/désactiver UnifiedFilterBar
  unifiedFilterOptions = [], // Options de filtres pour UnifiedFilterBar
  selectedFilters = [], // Filtres sélectionnés (externe)
  onFiltersChange, // Callback pour changement de filtres
  enableCategories = true, // Activer filtres de catégories
  enableStatusFilter = true, // Activer filtre de statut

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
}) => {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const { confirm, ConfirmModal } = useConfirmModal();

  // États pour UnifiedFilterBar (si pas de gestion externe)
  const [internalSelectedFilters, setInternalSelectedFilters] = useState([]);

  // Déterminer quels filtres utiliser
  const currentSelectedFilters = onFiltersChange ? selectedFilters : internalSelectedFilters;
  const handleFiltersChangeInternal = onFiltersChange || setInternalSelectedFilters;

  // Fonctionnalités disponibles
  const hasSync = typeof onSync === 'function';
  const hasExport = typeof onExport === 'function';
  const hasBatchDelete = typeof onBatchDelete === 'function';
  const hasBatchSync = typeof onBatchSync === 'function';
  const hasCreateSheet = typeof onCreateSheet === 'function';
  const hasBatchStockChange = typeof onBatchStockChange === 'function';

  // Hooks pour la gestion des données
  const { sort, sortedData, handleSort } = useTableSort(data, defaultSort);

  // MODIFICATION: Utiliser externalActiveFilters si disponible, sinon utiliser currentSelectedFilters
  const filtersToUse =
    externalActiveFilters?.length > 0 ? externalActiveFilters : currentSelectedFilters;

  const { searchTerm, activeFilters, filteredData, handleSearchChange, handleFilterChange } =
    useTableFilter(
      sortedData,
      searchFields,
      enableUnifiedFilters ? [] : filters, // ✅ filters en 3ème position
      onSearch,
      onFilter,
      searchProcessor, // ✅ searchProcessor en 6ème position
      paginationEntityId
    );

  const {
    selectedItems,
    setSelectedItems,
    toggleSelection,
    selectAll,
    preserveSelectionOnNextDataChange,
  } = useTableSelection(data, filteredData);

  const {
    currentPage,
    pageSize,
    paginatedData,
    totalPages,
    setCurrentPage,
    setPageSize,
    paginationInfo,
  } = useTablePagination(filteredData, pagination, paginationEntityId);

  // Actions par lot avec modal React
  const handleBatchDelete = useCallback(async () => {
    if (selectedItems.length === 0) return;

    // ✅ GARDER - Récupération des objets pour la modal
    const selectedEntities = selectedItems
      .map((id) => filteredData.find((item) => item._id === id))
      .filter(Boolean);

    // ✅ GARDER - Construction du message avec noms
    const entityNames = selectedEntities
      .map((entity) => entity.name || entity.designation || entity._id)
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
        // ✅ CORRECTION - Passer selectedItems (IDs) au lieu de selectedEntities
        await onBatchDelete(selectedItems);
        setSelectedItems([]);
      } else if (typeof onDelete === 'function') {
        // ✅ GARDER - Passer les IDs individuellement
        await Promise.all(selectedItems.map((id) => onDelete(id)));
        setSelectedItems([]);
      }
    } catch (err) {
      console.error(`❌ Erreur de suppression par lot:`, err);
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

  const handleBatchStockChange = (itemIds, stockAction) => {
    if (itemIds.length === 0 || typeof onBatchStockChange !== 'function') return;

    const selectedObjects = itemIds
      .map((id) => filteredData.find((item) => item._id === id))
      .filter(Boolean);

    onBatchStockChange(selectedObjects, stockAction);
  };

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
    if (action === 'stock') return hasBatchStockChange;
    if (action === 'createSheet') return hasCreateSheet;
    return true;
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Section des filtres et recherche - VERSION MODERNE COMPACTE */}
      <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
            {/* SearchBar à gauche */}
            <div className="flex-shrink-0 w-full lg:w-auto">
              <SearchBar
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                entityNamePlural={entityNamePlural}
                customPlaceholder={searchPlaceholder}
              />
            </div>

            {/* UnifiedFilterBar à droite (si activé) */}
            {enableUnifiedFilters && (
              <div className="flex-1 w-full lg:w-auto">
                <UnifiedFilterBar
                  filterOptions={unifiedFilterOptions}
                  selectedFilters={currentSelectedFilters}
                  onChange={handleFiltersChangeInternal}
                  enableCategories={enableCategories}
                  enableStatusFilter={enableStatusFilter}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions par lot */}
      {showBatchActions && (
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
          onBatchStockChange={hasBatchStockChange ? handleBatchStockChange : undefined}
          onCreateSheet={hasCreateSheet ? onCreateSheet : undefined}
          categoryOptions={categoryOptions}
          syncStats={syncStats}
        />
      )}

      {/* Tableau */}
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

      {/* Pagination */}
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

      {/* Modal d'export */}
      <ExportConfigModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExportConfirm}
        selectedItems={selectedItems}
        entityName={entityName}
        entityNamePlural={entityNamePlural}
        activeFilters={filtersToUse}
      />

      {/* Modal de confirmation pour les suppressions par lot */}
      <ConfirmModal />
    </div>
  );
};

export default EntityTable;
