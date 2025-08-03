import React from 'react';

const LabelExportSummary = ({
  selectedCount,
  itemLabel,
  activeFilters = [],
  labelStyle = {},
  currentLayout = {},
}) => {
  const duplicateCount = labelStyle.duplicateCount || 1;
  const totalLabels = selectedCount * duplicateCount;
  const supportType = currentLayout.supportType || 'A4';

  return (
    <div className="bg-green-50 dark:bg-green-900/20 rounded-md p-4">
      <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
        Résumé de l'export
      </h4>
      <div className="text-xs text-green-800 dark:text-green-200 space-y-1">
        <p>
          • <strong>{selectedCount}</strong> {itemLabel} au format <strong>PDF</strong>
        </p>
        <p>
          • Type: <strong>Étiquettes</strong>
        </p>
        <p>
          • Contenu: <strong>Prix et codes-barres</strong> pour chaque produit
        </p>
        {duplicateCount > 1 && (
          <p>
            • <strong>{duplicateCount}</strong> exemplaires par produit ={' '}
            <strong>{totalLabels}</strong> étiquettes au total
          </p>
        )}
        <p>
          • Support:{' '}
          <strong>
            {supportType === 'rouleau' ? 'Rouleau (coupe automatique)' : 'Feuilles A4'}
          </strong>
        </p>
        {currentLayout.width && currentLayout.height && (
          <p>
            • Taille:{' '}
            <strong>
              {currentLayout.width} × {currentLayout.height} mm
            </strong>
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

export default LabelExportSummary;
