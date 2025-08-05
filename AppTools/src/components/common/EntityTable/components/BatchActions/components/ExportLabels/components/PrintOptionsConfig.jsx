import React from 'react';
import { Grid, Info } from 'lucide-react';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const PrintOptionsConfig = () => {
  const {
    labelStyle,
    currentLayout,
    updateStyle,
    extractLabelData,
    getCellStats, // 🆕 API optimisée pour les stats cellules
  } = useLabelExportStore();

  const labelData = extractLabelData();
  const labelDataLength = labelData.length;
  const duplicateCount = labelStyle.duplicateCount || 1;
  const totalLabels = labelDataLength * duplicateCount;

  // 🆕 Calculs intelligents selon le mode
  const isRollMode = currentLayout?.supportType === 'rouleau';
  const cellStats = !isRollMode ? getCellStats() : null;

  // 🆕 Estimation du nombre de pages/feuilles
  const getPageEstimation = () => {
    if (isRollMode) {
      return {
        type: 'étiquettes individuelles',
        count: totalLabels,
        unit: 'découpe(s)',
        icon: '🎞️',
      };
    } else {
      const activeCells = cellStats?.active || 0;
      const labelsPerPage = activeCells > 0 ? activeCells : 1;
      const pagesNeeded = Math.ceil(totalLabels / labelsPerPage);

      return {
        type: 'feuilles A4',
        count: pagesNeeded,
        unit: pagesNeeded > 1 ? 'feuilles' : 'feuille',
        icon: '📄',
        detail: `${labelsPerPage} étiquettes par feuille`,
      };
    }
  };

  const pageEstimation = getPageEstimation();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
        <Grid className="h-4 w-4 mr-2" />
        Options d'impression
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Configuration quantité */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Quantité par produit
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={duplicateCount}
            onChange={(e) => updateStyle({ duplicateCount: parseInt(e.target.value) || 1 })}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            placeholder="Nombre d'étiquettes identiques par produit"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Chaque produit sera imprimé <strong>{duplicateCount}</strong> fois
          </p>
        </div>

        {/* 🆕 Résumé intelligent avec calculs adaptés */}
        <div className="flex items-center">
          <div
            className={`rounded p-3 w-full border ${
              isRollMode
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}
          >
            <div
              className={`text-sm font-medium flex items-center ${
                isRollMode
                  ? 'text-blue-900 dark:text-blue-100'
                  : 'text-green-900 dark:text-green-100'
              }`}
            >
              <span className="mr-2">{pageEstimation.icon}</span>
              Total à imprimer
            </div>
            <div
              className={`text-lg font-bold ${
                isRollMode
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-green-600 dark:text-green-400'
              }`}
            >
              {labelDataLength} × {duplicateCount} = {totalLabels}
            </div>
            <div
              className={`text-xs ${
                isRollMode
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-green-700 dark:text-green-300'
              }`}
            >
              {labelDataLength} produit{labelDataLength > 1 ? 's' : ''} sélectionné
              {labelDataLength > 1 ? 's' : ''}
            </div>

            {/* 🆕 Estimation de consommation */}
            <div
              className={`text-xs mt-2 pt-2 border-t ${
                isRollMode
                  ? 'border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                  : 'border-green-200 dark:border-green-700 text-green-600 dark:text-green-400'
              }`}
            >
              📊 <strong>{pageEstimation.count}</strong> {pageEstimation.unit}
              {pageEstimation.detail && <span className="block mt-1">{pageEstimation.detail}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 🆕 Aide contextuelle selon le mode */}
      <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
        <div className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
          <Info className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
          <div>
            {isRollMode ? (
              <span>
                <strong>Mode rouleau :</strong> Chaque étiquette sera découpée automatiquement.
                Vérifiez que votre imprimante supporte la découpe automatique.
              </span>
            ) : (
              <span>
                <strong>Mode feuilles :</strong> Les étiquettes seront réparties sur les feuilles
                A4.
                {cellStats && cellStats.disabled > 0 && (
                  <span className="text-orange-600 dark:text-orange-400">
                    {' '}
                    ({cellStats.disabled} case{cellStats.disabled > 1 ? 's' : ''} ignorée
                    {cellStats.disabled > 1 ? 's' : ''})
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 🆕 Avertissement si quantité élevée */}
      {totalLabels > 50 && (
        <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-700">
          <div className="text-xs text-orange-700 dark:text-orange-300 flex items-center">
            ⚠️{' '}
            <span className="ml-1">
              <strong>Impression importante :</strong> {totalLabels} étiquettes à imprimer. Vérifiez
              votre stock de {isRollMode ? 'rouleau' : 'feuilles A4'}.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintOptionsConfig;
