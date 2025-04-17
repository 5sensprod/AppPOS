// src/components/common/EntityTable/components/BatchActions.jsx
import React, { useState } from 'react';
import { Trash2, RefreshCw, FileText, ListFilter, Folder } from 'lucide-react';

export const BatchActions = ({
  selectedItems = [],
  entityName = '',
  entityNamePlural = '',
  batchActions = ['delete', 'sync', 'export', 'status', 'category'], // Ajout de 'category'
  onBatchDelete,
  onBatchSync,
  onBatchExport,
  onBatchStatusChange,
  onBatchCategoryChange, // Nouvelle prop pour gérer le changement de catégorie
  categoryOptions = [], // Options de catégories disponibles
}) => {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  if (selectedItems.length === 0) return null;

  const selectedCount = selectedItems.length;
  const itemLabel = selectedCount === 1 ? entityName : entityNamePlural;

  // Options pour le champ statut
  const statusOptions = [
    {
      value: 'published',
      label: 'Publié',
      color: 'bg-green-100 text-green-800 hover:bg-green-200',
    },
    { value: 'draft', label: 'Brouillon', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
    { value: 'archived', label: 'Archivé', color: 'bg-gray-100 text-gray-800 hover:bg-gray-200' },
  ];

  // Gestion du changement de statut
  const handleStatusChange = (status) => {
    if (typeof onBatchStatusChange === 'function') {
      onBatchStatusChange(selectedItems, status);
    }
    setShowStatusDropdown(false);
  };

  // Gestion du changement de catégorie
  const handleCategoryChange = (categoryId) => {
    if (typeof onBatchCategoryChange === 'function') {
      onBatchCategoryChange(selectedItems, categoryId);
    }
    setShowCategoryDropdown(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 flex flex-col sm:flex-row justify-between items-center border-b border-gray-200 dark:border-gray-700">
      <div className="text-gray-700 dark:text-gray-300 mb-2 sm:mb-0">
        <span className="font-semibold">{selectedCount}</span> {itemLabel} sélectionné
        {selectedCount > 1 ? 's' : ''}
      </div>
      <div className="flex space-x-2">
        {/* Menu déroulant pour la catégorie */}
        {batchActions.includes('category') &&
          typeof onBatchCategoryChange === 'function' &&
          categoryOptions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-md flex items-center text-sm"
                aria-label="Changer la catégorie des éléments sélectionnés"
              >
                <Folder className="h-4 w-4 mr-1" />
                Catégorie
              </button>

              {showCategoryDropdown && (
                <div className="absolute right-0 z-10 mt-1 w-48 max-h-64 overflow-y-auto rounded-md bg-white shadow-lg dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="py-1">
                    {categoryOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleCategoryChange(option.value)}
                        className="w-full text-left px-4 py-2 text-sm bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Menu déroulant pour le statut */}
        {batchActions.includes('status') && typeof onBatchStatusChange === 'function' && (
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-md flex items-center text-sm"
              aria-label="Changer le statut des éléments sélectionnés"
            >
              <ListFilter className="h-4 w-4 mr-1" />
              Statut
            </button>

            {showStatusDropdown && (
              <div className="absolute right-0 z-10 mt-1 w-48 rounded-md bg-white shadow-lg dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="py-1">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleStatusChange(option.value)}
                      className={`w-full text-left px-4 py-2 text-sm ${option.color} dark:bg-opacity-20 hover:bg-opacity-80`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bouton d'export PDF */}
        {batchActions.includes('export') && typeof onBatchExport === 'function' && (
          <button
            onClick={() => onBatchExport(selectedItems)}
            className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-md flex items-center text-sm"
            aria-label="Exporter les éléments sélectionnés en PDF"
          >
            <FileText className="h-4 w-4 mr-1" />
            Exporter
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
