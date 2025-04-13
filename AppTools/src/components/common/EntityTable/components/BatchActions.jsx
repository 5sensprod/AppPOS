// src/components/common/EntityTable/components/BatchActions.jsx
import React from 'react';
import { Trash2, RefreshCw } from 'lucide-react'; // Assurez-vous que ces icônes sont importées

export const BatchActions = ({
  selectedItems = [],
  entityName = '',
  entityNamePlural = '',
  batchActions = ['delete', 'sync'], // Valeur par défaut
  onBatchDelete,
  onBatchSync,
}) => {
  if (selectedItems.length === 0) return null;

  const selectedCount = selectedItems.length;
  const itemLabel = selectedCount === 1 ? entityName : entityNamePlural;

  return (
    <div className="bg-blue-50 dark:bg-blue-900 p-4 flex flex-col sm:flex-row justify-between items-center border-b border-gray-200 dark:border-gray-700">
      <div className="text-blue-800 dark:text-blue-200 mb-2 sm:mb-0">
        <span className="font-semibold">{selectedCount}</span> {itemLabel} sélectionné
        {selectedCount > 1 ? 's' : ''}
      </div>
      <div className="flex space-x-2">
        {/* Vérifier que le bouton delete est dans les actions autorisées ET que onBatchDelete est une fonction */}
        {batchActions.includes('delete') && typeof onBatchDelete === 'function' && (
          <button
            onClick={onBatchDelete}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center text-sm"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Supprimer
          </button>
        )}

        {/* Vérifier que le bouton sync est dans les actions autorisées ET que onBatchSync est une fonction */}
        {batchActions.includes('sync') && typeof onBatchSync === 'function' && (
          <button
            onClick={onBatchSync}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center text-sm"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Synchroniser
          </button>
        )}
      </div>
    </div>
  );
};

export default BatchActions;
