// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportModal\components\TableOptionsPanel.jsx
import React from 'react';
import { Settings, Columns } from 'lucide-react';

const TableOptionsPanel = ({
  selectedColumns,
  setSelectedColumns,
  includeId,
  setIncludeId,
  useCustomColumn,
  setUseCustomColumn,
  customColumnTitle,
  setCustomColumnTitle,
  availableColumns,
}) => {
  return (
    <>
      {/* Options avancées */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Options avancées
        </label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeId}
              onChange={(e) => setIncludeId(e.target.checked)}
              className="mr-3 text-blue-600"
            />
            <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <Settings className="h-4 w-4" />
              <span className="ml-2">Inclure l'identifiant unique (ID)</span>
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={useCustomColumn}
              onChange={(e) => setUseCustomColumn(e.target.checked)}
              className="mr-3 text-blue-600"
            />
            <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <Columns className="h-4 w-4" />
              <span className="ml-2">Ajouter une colonne personnalisée</span>
            </span>
          </label>

          {useCustomColumn && (
            <div className="ml-7 mt-2">
              <input
                type="text"
                value={customColumnTitle}
                onChange={(e) => setCustomColumnTitle(e.target.value)}
                placeholder="Nom de la colonne personnalisée"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Cette colonne sera vide pour permettre la saisie manuelle.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sélection des colonnes */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Colonnes à inclure ({selectedColumns.length} sélectionnée
          {selectedColumns.length > 1 ? 's' : ''})
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-3">
          {availableColumns.map((col) => (
            <label key={col.key} className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={selectedColumns.includes(col.key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedColumns((prev) => [...prev, col.key]);
                  } else {
                    setSelectedColumns((prev) => prev.filter((k) => k !== col.key));
                  }
                }}
                className="mr-2 text-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300">{col.label}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
};

export default TableOptionsPanel;
