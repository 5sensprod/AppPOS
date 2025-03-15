// src/components/common/EntityTable/components/TableRow.jsx
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

  return (
    <tr
      onClick={() => onRowClick(item)}
      className={`${
        actions.includes('view') ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
      }`}
    >
      <td className="px-4 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelection(item._id, e.target.checked);
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
        <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
          {actions.includes('edit') && (
            <button
              onClick={handleEdit}
              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {actions.includes('delete') && (
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash className="h-4 w-4" />
            </button>
          )}
          {syncEnabled && actions.includes('sync') && (
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
