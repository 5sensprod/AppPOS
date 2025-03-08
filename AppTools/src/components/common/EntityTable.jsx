// src/components/common/EntityTable.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  Edit,
  Trash,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  MoreHorizontal,
} from 'lucide-react';

/**
 * Composant de tableau générique pour afficher et gérer les entités
 */
const EntityTable = ({
  // Données et état
  data = [],
  isLoading = false,
  error = null,
  // Métadonnées
  columns = [],
  entityName = '',
  entityNamePlural = '',
  baseRoute = '',
  // Configuration d'affichage
  defaultSort = { field: 'name', direction: 'asc' },
  actions = ['view', 'edit', 'delete'],
  batchActions = ['delete'],
  // Fonctionnalités optionnelles
  syncEnabled = false,
  pagination = {
    enabled: true,
    pageSize: 10,
    showPageSizeOptions: true,
    pageSizeOptions: [5, 10, 25, 50],
  },
  // Handlers
  onDelete,
  onSync,
  onSearch,
  onFilter,
  // Capacités de recherche et filtrage
  searchFields = ['name'],
  filters = [],
}) => {
  const navigate = useNavigate();

  // États du composant
  const [selectedItems, setSelectedItems] = useState([]);
  const [sort, setSort] = useState(defaultSort);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pagination.pageSize);

  // Réinitialiser la sélection lors du changement des données
  useEffect(() => {
    setSelectedItems([]);
  }, [data]);

  // Handlers de base
  const handleRowClick = (item) => {
    if (actions.includes('view')) {
      navigate(`${baseRoute}/${item._id}`);
    }
  };

  const handleEdit = (item, e) => {
    e.stopPropagation();
    navigate(`${baseRoute}/${item._id}/edit`);
  };

  const handleDelete = (item, e) => {
    e.stopPropagation();
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer cet élément ?`)) {
      onDelete(item._id);
    }
  };

  const handleSync = (item, e) => {
    e.stopPropagation();
    onSync(item._id);
  };

  // Gestion par lot
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

  // Gestion du tri
  const handleSort = (field) => {
    setSort((prevSort) => ({
      field,
      direction: prevSort.field === field && prevSort.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Gestion de la recherche
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1); // Revenir à la première page lors d'une recherche

    if (onSearch) {
      onSearch(value, searchFields);
    }
  };

  // Gestion des filtres
  const handleFilterChange = (filterId, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterId]: value,
    }));
    setCurrentPage(1); // Revenir à la première page lors d'un changement de filtre

    if (onFilter) {
      onFilter({ ...activeFilters, [filterId]: value });
    }
  };

  // Fonction utilitaire pour vérifier si un élément correspond aux filtres
  const matchesFilters = (item) => {
    // Si aucun filtre actif, on renvoie true
    if (Object.keys(activeFilters).length === 0) return true;

    // Vérification de chaque filtre actif
    return Object.entries(activeFilters).every(([filterId, filterValue]) => {
      // Trouver la configuration du filtre
      const filterConfig = filters.find((f) => f.id === filterId);
      if (!filterConfig) return true;

      // Appliquer la logique de filtrage selon le type
      if (filterConfig.type === 'select') {
        if (filterValue === 'all') return true;
        return item[filterId] === filterValue;
      }

      if (filterConfig.type === 'boolean') {
        return item[filterId] === (filterValue === 'true');
      }

      if (filterConfig.type === 'range') {
        const value = item[filterId];
        if (value === undefined) return false;

        const min = filterValue.min !== undefined ? filterValue.min : -Infinity;
        const max = filterValue.max !== undefined ? filterValue.max : Infinity;

        return value >= min && value <= max;
      }

      return true;
    });
  };

  // Fonction utilitaire pour vérifier si un élément correspond au terme de recherche
  const matchesSearch = (item) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    return searchFields.some((field) => {
      const value = item[field];
      if (value === undefined || value === null) return false;

      return String(value).toLowerCase().includes(searchLower);
    });
  };

  // Tri et filtrage des données
  const processedData = [...data]
    .filter((item) => matchesFilters(item) && matchesSearch(item))
    .sort((a, b) => {
      const aValue = a[sort.field];
      const bValue = b[sort.field];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const result = aValue < bValue ? -1 : 1;
      return sort.direction === 'asc' ? result : -result;
    });

  // Pagination des données
  const totalItems = processedData.length;
  const totalPages = pagination.enabled ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;

  // Limiter la page courante au nombre total de pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedData = pagination.enabled
    ? processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : processedData;

  // Calculer l'affichage de la pagination
  const startItem = pagination.enabled ? (currentPage - 1) * pageSize + 1 : 1;
  const endItem = pagination.enabled ? Math.min(currentPage * pageSize, totalItems) : totalItems;

  // Affichage du chargement
  if (isLoading && data.length === 0) {
    return (
      <div className="flex justify-center p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // Affichage de l'erreur
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
          {/* Recherche */}
          <div className="relative">
            <input
              type="text"
              placeholder={`Rechercher ${entityNamePlural || 'éléments'}...`}
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
          </div>

          {/* Filtres */}
          {filters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <div key={filter.id} className="flex-shrink-0">
                  {filter.type === 'select' && (
                    <select
                      value={activeFilters[filter.id] || 'all'}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="all">{filter.allLabel || 'Tous'}</option>
                      {filter.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {filter.type === 'boolean' && (
                    <select
                      value={activeFilters[filter.id] || 'all'}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="all">{filter.label}</option>
                      <option value="true">Oui</option>
                      <option value="false">Non</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Barre d'actions par lot */}
      {selectedItems.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {selectedItems.length} {selectedItems.length === 1 ? entityName : entityNamePlural}{' '}
            sélectionné(s)
          </span>
          <div className="flex space-x-2">
            {batchActions.includes('delete') && (
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded-md dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
              >
                Supprimer
              </button>
            )}
            {syncEnabled && batchActions.includes('sync') && (
              <button
                onClick={handleBatchSync}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
              >
                Synchroniser
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems(paginatedData.map((item) => item._id));
                    } else {
                      setSelectedItems([]);
                    }
                  }}
                  checked={
                    paginatedData.length > 0 && selectedItems.length === paginatedData.length
                  }
                  className="h-4 w-4 text-blue-600 dark:text-blue-400 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                />
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                  }`}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && sort.field === column.key && (
                      <span>
                        {sort.direction === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
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
                <tr
                  key={item._id}
                  onClick={() => handleRowClick(item)}
                  className={`${
                    actions.includes('view')
                      ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
                      : ''
                  }`}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item._id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedItems((prev) => {
                          if (e.target.checked) {
                            return [...prev, item._id];
                          } else {
                            return prev.filter((id) => id !== item._id);
                          }
                        });
                      }}
                      className="h-4 w-4 text-blue-600 dark:text-blue-400 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                    />
                  </td>
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-200">
                        {column.render ? column.render(item) : item[column.key]}
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div
                      className="flex justify-end space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions.includes('edit') && (
                        <button
                          onClick={(e) => handleEdit(item, e)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {actions.includes('delete') && (
                        <button
                          onClick={(e) => handleDelete(item, e)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      )}
                      {syncEnabled && actions.includes('sync') && (
                        <button
                          onClick={(e) => handleSync(item, e)}
                          className={`${
                            item.woo_id
                              ? 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                              : 'text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300'
                          }`}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.enabled && totalItems > 0 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Affichage de <span className="font-medium">{startItem}</span> à{' '}
                <span className="font-medium">{endItem}</span> sur{' '}
                <span className="font-medium">{totalItems}</span> {entityNamePlural || 'éléments'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {pagination.showPageSizeOptions && (
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newPageSize = Number(e.target.value);
                    setPageSize(newPageSize);
                    setCurrentPage(1); // Revenir à la première page
                  }}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {pagination.pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size} par page
                    </option>
                  ))}
                </select>
              )}
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Première page</span>
                  <ChevronLeft className="h-5 w-5" />
                  <ChevronLeft className="h-5 w-5 -ml-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Précédent</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {/* Affichage des numéros de page */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Afficher uniquement les pages proches de la page courante
                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, index, array) => {
                    // Ajouter des ellipses si nécessaire
                    if (index > 0 && array[index - 1] !== page - 1) {
                      return [
                        <span
                          key={`ellipsis-${page}`}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          ...
                        </span>,
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border ${
                            currentPage === page
                              ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-500 text-blue-600 dark:text-blue-200 z-10'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          } text-sm font-medium`}
                        >
                          {page}
                        </button>,
                      ];
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border ${
                          currentPage === page
                            ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-500 text-blue-600 dark:text-blue-200 z-10'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        } text-sm font-medium`}
                      >
                        {page}
                      </button>
                    );
                  })}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Suivant</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Dernière page</span>
                  <ChevronRight className="h-5 w-5" />
                  <ChevronRight className="h-5 w-5 -ml-4" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityTable;
