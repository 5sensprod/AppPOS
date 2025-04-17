// Composant principal EntityTable (index.jsx) AppTools\src\components\common\EntityTable\index.jsx
import React, { useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { FilterBar } from './components/FilterBar';
import { BatchActions } from './components/BatchActions';
import { TableHeader } from './components/TableHeader';
import { TableRow } from './components/TableRow';
import { Pagination } from './components/Pagination';
import { LoadingState } from './components/LoadingState';
import { useTableSelection } from './hooks/useTableSelection';
import { useTableSort } from './hooks/useTableSort';
import { useTableFilter } from './hooks/useTableFilter';
import { useTablePagination } from './hooks/useTablePagination';
import ExportConfigModal from './ExportConfigModal';

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
  batchActions = ['delete', 'sync', 'export', 'status', 'category'],
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
  onBatchCategoryChange, // Nouvelle prop
  categoryOptions = [],
  onBatchDelete,
  onBatchSync,
  onSearch,
  onFilter,
  searchFields = ['name'],
  filters = [],
  searchProcessor,
  paginationEntityId = 'default',
  externalActiveFilters = [], // Renommé ici pour éviter le conflit
}) => {
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

  const hasSync = typeof onSync === 'function';
  const hasExport = typeof onExport === 'function';
  const hasBatchDelete = typeof onBatchDelete === 'function';
  const hasBatchSync = typeof onBatchSync === 'function';
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const filtersToUse =
    externalActiveFilters && externalActiveFilters.length > 0
      ? externalActiveFilters
      : activeFilters;

  const handleBatchDelete = () => {
    if (selectedItems.length === 0) return;

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer ces ${selectedItems.length} ${selectedItems.length === 1 ? entityName : entityNamePlural} ?`;

    if (window.confirm(confirmMessage)) {
      if (hasBatchDelete) {
        // Utiliser la fonction de suppression par lot si disponible
        onBatchDelete(selectedItems)
          .then(() => {
            setSelectedItems([]);
          })
          .catch((err) => {
            console.error(`Erreur lors de la suppression par lot des ${entityNamePlural}:`, err);
          });
      } else if (typeof onDelete === 'function') {
        // Fallback: supprimer élément par élément
        Promise.all(selectedItems.map((id) => onDelete(id)))
          .then(() => {
            setSelectedItems([]);
          })
          .catch((err) => {
            console.error(`Erreur lors de la suppression par lot des ${entityNamePlural}:`, err);
          });
      }
    }
  };

  const handleBatchSync = () => {
    if (selectedItems.length === 0) return;

    console.log('Exécution de la synchronisation par lot', selectedItems);

    if (hasBatchSync) {
      // Utiliser la fonction de synchronisation par lot si disponible
      onBatchSync(selectedItems)
        .then(() => {
          console.log('Synchronisation par lot terminée avec succès');
        })
        .catch((err) => {
          console.error(`Erreur lors de la synchronisation par lot des ${entityNamePlural}:`, err);
        });
    } else if (hasSync) {
      // Fallback: synchroniser élément par élément
      console.log('Fallback: synchronisation élément par élément');
      Promise.all(selectedItems.map((id) => onSync(id)))
        .then(() => {
          console.log('Synchronisation élément par élément terminée avec succès');
        })
        .catch((err) => {
          console.error(`Erreur lors de la synchronisation par lot des ${entityNamePlural}:`, err);
        });
    }
  };

  // Nouvelle fonction pour gérer l'export
  const handleBatchExport = () => {
    // Ouvrir la modale de configuration d'export
    setExportModalOpen(true);
  };

  // Gérer la confirmation de l'export
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
    if (itemIds.length === 0) return;

    console.log(`Changement de statut par lot: ${newStatus} pour ${itemIds.length} éléments`);

    if (typeof onBatchStatusChange === 'function') {
      onBatchStatusChange(itemIds, newStatus)
        .then(() => {
          console.log(`Statut modifié avec succès pour ${itemIds.length} éléments`);
        })
        .catch((err) => {
          console.error(`Erreur lors du changement de statut: ${err.message}`);
        });
    }
  };

  const handleBatchCategoryChange = (itemIds, categoryId) => {
    if (itemIds.length === 0) return;

    console.log(
      `Changement de catégorie par lot pour ${itemIds.length} éléments vers la catégorie ${categoryId}`
    );

    if (typeof onBatchCategoryChange === 'function') {
      onBatchCategoryChange(itemIds, categoryId)
        .then(() => {
          console.log(`Catégorie modifiée avec succès pour ${itemIds.length} éléments`);
        })
        .catch((err) => {
          console.error(`Erreur lors du changement de catégorie: ${err.message}`);
        });
    }
  };

  if (isLoading && data.length === 0) {
    return <LoadingState />;
  }

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
          batchActions={batchActions.filter((action) => {
            if (action === 'sync') return hasSync || hasBatchSync;
            if (action === 'delete') return typeof onDelete === 'function' || hasBatchDelete;
            if (action === 'export') return hasExport;
            if (action === 'status') return typeof onBatchStatusChange === 'function';
            if (action === 'category')
              return typeof onBatchCategoryChange === 'function' && categoryOptions.length > 0;
            return true; // pour toute autre action
          })}
          onBatchDelete={handleBatchDelete}
          onBatchSync={hasSync || hasBatchSync ? handleBatchSync : undefined}
          onBatchExport={hasExport ? handleBatchExport : undefined}
          onBatchStatusChange={handleBatchStatusChange}
          onBatchCategoryChange={handleBatchCategoryChange} // Passer la nouvelle fonction
          categoryOptions={categoryOptions} // Passer les options de catégories
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
        activeFilters={filtersToUse} // Passer les filtres actifs à la modale
      />
    </div>
  );
};

export default EntityTable;
