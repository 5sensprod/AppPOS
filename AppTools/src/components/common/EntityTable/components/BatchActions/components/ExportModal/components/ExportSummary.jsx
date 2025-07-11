// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportModal\components\ExportSummary.jsx
import React from 'react';

const ExportSummary = ({
  exportType,
  selectedCount,
  itemLabel,
  exportFormat,
  selectedColumns = [],
  includeId,
  useCustomColumn,
  customColumnTitle,
  orientation,
  activeFilters = [],
}) => {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-4">
      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
        Résumé de l'export
      </h4>
      <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
        <p>
          • <strong>{selectedCount}</strong> {itemLabel} au format{' '}
          <strong>{exportFormat.toUpperCase()}</strong>
        </p>
        <p>
          • Type: <strong>{exportType === 'labels' ? 'Étiquettes' : 'Tableau'}</strong>
        </p>
        {exportType === 'table' && (
          <p>
            • <strong>{selectedColumns.length}</strong> colonne
            {selectedColumns.length > 1 ? 's' : ''} de données
            {includeId && ' + ID'}
            {useCustomColumn && ` + "${customColumnTitle}"`}
          </p>
        )}
        {exportType === 'labels' && (
          <p>
            • Contenu: <strong>Prix et codes-barres</strong> pour chaque produit
          </p>
        )}
        {exportFormat === 'pdf' && (
          <p>
            • Orientation: <strong>{orientation === 'portrait' ? 'Portrait' : 'Paysage'}</strong>
          </p>
        )}
        {activeFilters.length > 0 && (
          <p>
            • <strong>{activeFilters.length}</strong> filtre
            {activeFilters.length > 1 ? 's' : ''} appliqué
            {activeFilters.length > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

export default ExportSummary;
