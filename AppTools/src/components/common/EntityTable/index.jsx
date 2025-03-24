// Composant principal EntityTable (modifié pour supporter les préférences)
import React, { useEffect } from 'react';
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

const EntityTable = ({
  data = [],
  isLoading = false,
  error = null,
  columns = [],
  entityName = '',
  entityNamePlural = '',
  baseRoute = '',
  defaultSort = { field: 'name', direction: 'asc' },
  actions = ['view', 'edit', 'delete'],
  batchActions = ['delete'],
  syncEnabled = false,
  pagination = {
    enabled: true,
    pageSize: 10,
    showPageSizeOptions: true,
    pageSizeOptions: [5, 10, 25, 50],
  },
  onDelete,
  onSync,
  onSearch,
  onFilter,
  searchFields = ['name'],
  filters = [],
  searchProcessor,
  // Nouvelles props pour les préférences
  tablePreferences = null,
  onPreferencesChange = null,
}) => {
  // État initial pour le tri, utiliser les préférences si disponibles
  const initialSort = tablePreferences?.sort || defaultSort;
  const { sort, sortedData, handleSort } = useTableSort(data, initialSort);

  // Mise à jour des préférences de tri lorsqu'elles changent
  useEffect(() => {
    if (onPreferencesChange && sort !== initialSort) {
      onPreferencesChange('sort', sort);
    }
  }, [sort, initialSort, onPreferencesChange]);

  // État initial pour la recherche
  const initialSearch = tablePreferences?.search?.term || '';
  const initialFilters = tablePreferences?.search?.activeFilters || {};

  // Filtrage avec préférences
  const { searchTerm, activeFilters, filteredData, handleSearchChange, handleFilterChange } =
    useTableFilter(
      sortedData,
      searchFields,
      filters,
      onSearch,
      onFilter,
      searchProcessor,
      initialSearch,
      initialFilters
    );

  // Mise à jour des préférences de recherche
  useEffect(() => {
    if (onPreferencesChange) {
      if (searchTerm !== initialSearch) {
        onPreferencesChange('search', { ...tablePreferences?.search, term: searchTerm });
      }

      if (JSON.stringify(activeFilters) !== JSON.stringify(initialFilters)) {
        onPreferencesChange('search', { ...tablePreferences?.search, activeFilters });
      }
    }
  }, [
    searchTerm,
    activeFilters,
    initialSearch,
    initialFilters,
    onPreferencesChange,
    tablePreferences,
  ]);

  // Sélection avec préférences
  const initialSelectedItems = tablePreferences?.selection?.selectedItems || [];
  const { selectedItems, setSelectedItems, toggleSelection, selectAll } = useTableSelection(
    data,
    filteredData,
    initialSelectedItems
  );

  // Mise à jour des préférences de sélection
  useEffect(() => {
    if (
      onPreferencesChange &&
      JSON.stringify(selectedItems) !== JSON.stringify(initialSelectedItems)
    ) {
      onPreferencesChange('selection', { ...tablePreferences?.selection, selectedItems });
    }
  }, [selectedItems, initialSelectedItems, onPreferencesChange, tablePreferences]);

  // Pagination avec préférences
  const initialPage = tablePreferences?.pagination?.currentPage || 1;
  const initialPageSize = tablePreferences?.pagination?.pageSize || pagination.pageSize;

  const {
    currentPage,
    pageSize,
    paginatedData,
    totalPages,
    setCurrentPage,
    setPageSize,
    paginationInfo,
  } = useTablePagination(filteredData, {
    ...pagination,
    initialPage,
    initialPageSize,
  });

  // Mise à jour des préférences de pagination
  useEffect(() => {
    if (onPreferencesChange) {
      if (currentPage !== initialPage || pageSize !== initialPageSize) {
        onPreferencesChange('pagination', { currentPage, pageSize });
      }
    }
  }, [currentPage, pageSize, initialPage, initialPageSize, onPreferencesChange]);

  // Gestionnaires d'événements pour les actions
  const handleRowClick = (item) => {
    // Si on a des préférences, mettre à jour l'élément focalisé
    if (onPreferencesChange) {
      onPreferencesChange('selection', {
        ...tablePreferences?.selection,
        focusedItemId: item._id,
      });
    }

    // Ne pas gérer la navigation ici, le composant TableRow s'en charge
  };

  const handleBatchDelete = () => {
    if (
      window.confirm(`Êtes-vous sûr de vouloir supprimer ces ${selectedItems.length} éléments ?`)
    ) {
      Promise.all(selectedItems.map((id) => onDelete(id)))
        .then(() => setSelectedItems([]))
        .catch((err) => console.error('Erreur lors de la suppression par lot:', err));
    }
  };

  const handleBatchSync = () => {
    if (syncEnabled) {
      Promise.all(selectedItems.map((id) => onSync(id)))
        .then(() => {
          // Message de succès possible ici
        })
        .catch((err) => console.error('Erreur lors de la synchronisation par lot:', err));
    }
  };

  // Affichage du chargement ou de l'erreur
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
      {/* Barre de recherche et filtres */}
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

      {/* Actions par lot */}
      {selectedItems.length > 0 && (
        <BatchActions
          selectedItems={selectedItems}
          entityName={entityName}
          entityNamePlural={entityNamePlural}
          batchActions={batchActions}
          syncEnabled={syncEnabled}
          onBatchDelete={handleBatchDelete}
          onBatchSync={handleBatchSync}
        />
      )}

      {/* Tableau */}
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
                  actions={actions}
                  syncEnabled={syncEnabled}
                  isSelected={selectedItems.includes(item._id)}
                  onToggleSelection={toggleSelection}
                  onRowClick={handleRowClick}
                  onDelete={onDelete}
                  onSync={onSync}
                  baseRoute={baseRoute}
                  isFocused={item._id === tablePreferences?.selection?.focusedItemId}
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
    </div>
  );
};

export default EntityTable;
