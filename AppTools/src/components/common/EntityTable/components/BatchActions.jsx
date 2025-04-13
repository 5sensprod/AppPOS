// src/components/common/EntityTable/components/BatchActions.jsx
import React from 'react';
import { Trash2, RefreshCw, FileText } from 'lucide-react'; // Ajout de l'icône FileText

export const BatchActions = ({
  selectedItems = [],
  entityName = '',
  entityNamePlural = '',
  batchActions = ['delete', 'sync'],
  onBatchDelete,
  onBatchSync,
  onBatchExport, // Nouvelle prop pour l'export
}) => {
  if (selectedItems.length === 0) return null;

  const selectedCount = selectedItems.length;
  const itemLabel = selectedCount === 1 ? entityName : entityNamePlural;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 flex flex-col sm:flex-row justify-between items-center border-b border-gray-200 dark:border-gray-700">
      <div className="text-gray-700 dark:text-gray-300 mb-2 sm:mb-0">
        <span className="font-semibold">{selectedCount}</span> {itemLabel} sélectionné
        {selectedCount > 1 ? 's' : ''}
      </div>
      <div className="flex space-x-2">
        {/* Bouton d'export PDF - toujours disponible si onBatchExport existe */}
        {typeof onBatchExport === 'function' && (
          <button
            onClick={() => onBatchExport(selectedItems)}
            className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-md flex items-center text-sm"
            aria-label="Exporter les éléments sélectionnés en PDF"
          >
            <FileText className="h-4 w-4 mr-1" />
            Exporter PDF
          </button>
        )}

        {/* Bouton de suppression */}
        {batchActions.includes('delete') && typeof onBatchDelete === 'function' && (
          <button
            onClick={onBatchDelete}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-md flex items-center text-sm"
            aria-label="Supprimer les éléments sélectionnés"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Supprimer
          </button>
        )}

        {/* Bouton de synchronisation */}
        {batchActions.includes('sync') && typeof onBatchSync === 'function' && (
          <button
            onClick={onBatchSync}
            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md flex items-center text-sm"
            aria-label="Synchroniser les éléments sélectionnés"
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
