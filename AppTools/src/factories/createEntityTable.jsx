// src/factories/createEntityTable.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function createEntityTable(options) {
  const {
    entityName,
    columns,
    defaultSort = { field: 'name', direction: 'asc' },
    actions = ['view', 'edit', 'delete'],
    syncEnabled = true,
    routePrefix = '',
  } = options;

  return function EntityTableComponent({
    data = [],
    isLoading = false,
    error = null,
    onDelete,
    onSync,
    ...props
  }) {
    const navigate = useNavigate();
    const [selectedItems, setSelectedItems] = useState([]);
    const [sort, setSort] = useState(defaultSort);

    // Handlers
    const handleRowClick = (item) => {
      navigate(`${routePrefix}/${entityName}s/${item._id}`);
    };

    const handleEdit = (item, e) => {
      e.stopPropagation();
      navigate(`${routePrefix}/${entityName}s/${item._id}/edit`);
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

    const handleBatchDelete = () => {
      if (
        window.confirm(`Êtes-vous sûr de vouloir supprimer ces ${selectedItems.length} éléments ?`)
      ) {
        Promise.all(selectedItems.map((id) => onDelete(id)))
          .then(() => {
            setSelectedItems([]);
          })
          .catch((err) => {
            console.error('Erreur lors de la suppression par lot:', err);
          });
      }
    };

    const handleBatchSync = () => {
      if (syncEnabled) {
        Promise.all(selectedItems.map((id) => onSync(id)))
          .then(() => {
            // Notification de succès
          })
          .catch((err) => {
            console.error('Erreur lors de la synchronisation par lot:', err);
          });
      }
    };

    const handleSort = (field) => {
      setSort((prevSort) => ({
        field,
        direction: prevSort.field === field && prevSort.direction === 'asc' ? 'desc' : 'asc',
      }));
    };

    // Tri des données
    const sortedData = [...data].sort((a, b) => {
      const aValue = a[sort.field];
      const bValue = b[sort.field];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const result = aValue < bValue ? -1 : 1;
      return sort.direction === 'asc' ? result : -result;
    });

    // Affichage du chargement
    if (isLoading) {
      return <div className="flex justify-center p-6">Chargement...</div>;
    }

    // Affichage de l'erreur
    if (error) {
      return <div className="text-red-500 p-6">Erreur: {error}</div>;
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Barre d'actions */}
        {selectedItems.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {selectedItems.length} élément(s) sélectionné(s)
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded-md dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
              >
                Supprimer
              </button>
              {syncEnabled && (
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
                        setSelectedItems(data.map((item) => item._id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                    checked={selectedItems.length === data.length && data.length > 0}
                    className="h-4 w-4 text-blue-600 dark:text-blue-400 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${
                      column.sortable
                        ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
                        : ''
                    }`}
                    onClick={column.sortable ? () => handleSort(column.key) : undefined}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {column.sortable && sort.field === column.key && (
                        <span>{sort.direction === 'asc' ? ' ▲' : ' ▼'}</span>
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
              {sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center"
                  >
                    Aucun élément trouvé
                  </td>
                </tr>
              ) : (
                sortedData.map((item) => (
                  <tr
                    key={item._id}
                    onClick={() => actions.includes('view') && handleRowClick(item)}
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
                            Modifier
                          </button>
                        )}
                        {actions.includes('delete') && (
                          <button
                            onClick={(e) => handleDelete(item, e)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Supprimer
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
                            {item.woo_id ? 'Resynchroniser' : 'Synchroniser'}
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
      </div>
    );
  };
}
