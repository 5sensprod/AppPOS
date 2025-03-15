// src/components/common/EntityTable/components/BatchActions.jsx
import React from 'react';

export const BatchActions = ({
  selectedItems,
  entityName,
  entityNamePlural,
  batchActions,
  syncEnabled,
  onBatchDelete,
  onBatchSync,
}) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {selectedItems.length} {selectedItems.length === 1 ? entityName : entityNamePlural}{' '}
        sélectionné(s)
      </span>
      <div className="flex space-x-2">
        {batchActions.includes('delete') && (
          <button
            onClick={onBatchDelete}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded-md dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
          >
            Supprimer
          </button>
        )}
        {syncEnabled && batchActions.includes('sync') && (
          <button
            onClick={onBatchSync}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
          >
            Synchroniser
          </button>
        )}
      </div>
    </div>
  );
};
