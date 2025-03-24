import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash, RefreshCw } from 'lucide-react';

export const TableRow = ({
  item,
  columns,
  actions,
  syncEnabled,
  isSelected,
  onToggleSelection,
  onRowClick,
  onDelete,
  onSync,
  baseRoute,
  isFocused = false,
}) => {
  const navigate = useNavigate();

  const handleEdit = (e) => {
    e.stopPropagation();
    navigate(`${baseRoute}/${item._id}/edit`);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer cet élément ?`)) {
      onDelete(item._id);
    }
  };

  const handleSync = (e) => {
    e.stopPropagation();
    onSync(item._id);
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onToggleSelection(item._id, !isSelected);
  };

  // Gestionnaire pour le clic sur la ligne
  const handleRowClick = () => {
    // Sauvegarder la position de défilement actuelle
    const scrollPosition = window.scrollY;

    // Appeler d'abord le gestionnaire d'événements personnalisé
    if (onRowClick) {
      onRowClick(item);
    }

    // Ensuite naviguer vers la page détail si l'action view est disponible
    if (actions && actions.includes('view')) {
      navigate(`${baseRoute}/${item._id}`);
    }

    // Après la navigation, restaurer la position de défilement
    setTimeout(() => {
      window.scrollTo({
        top: scrollPosition,
        behavior: 'instant',
      });
    }, 100);
  };

  return (
    <tr
      id={`row-${item._id}`}
      onClick={handleRowClick}
      className={`${
        actions && actions.includes('view')
          ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
          : ''
      } ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''} 
        transition-all duration-500 ease-in-out
        ${isFocused ? 'outline outline-2 outline-blue-500' : 'outline outline-0 outline-transparent'}`}
    >
      <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div onClick={handleCheckboxClick}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}} // Géré par handleCheckboxClick
            className="h-4 w-4 text-blue-600 dark:text-blue-400 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
          />
        </div>
      </td>
      {columns.map((column) => (
        <td key={column.key || column.field} className="px-4 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900 dark:text-gray-200">
            {column.render ? column.render(item) : item[column.key || column.field]}
          </div>
        </td>
      ))}
      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
          {actions && actions.includes('edit') && (
            <button
              onClick={handleEdit}
              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {actions && actions.includes('delete') && (
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash className="h-4 w-4" />
            </button>
          )}
          {syncEnabled && actions && actions.includes('sync') && (
            <button
              onClick={handleSync}
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
  );
};
