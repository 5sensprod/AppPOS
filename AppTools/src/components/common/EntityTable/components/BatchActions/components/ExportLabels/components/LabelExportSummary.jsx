import React from 'react';
import { FileText, Printer, Grid, Zap } from 'lucide-react';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const LabelExportSummary = ({ selectedCount, itemLabel, activeFilters = [] }) => {
  const {
    labelStyle,
    currentLayout,
    getCellStats, // 🆕 API optimisée
    getGridDimensions, // 🆕 API optimisée
    selectedPrinter, // 🆕 État imprimante
  } = useLabelExportStore();

  const duplicateCount = labelStyle.duplicateCount || 1;
  const totalLabels = selectedCount * duplicateCount;
  const supportType = currentLayout.supportType || 'A4';
  const isRollMode = supportType === 'rouleau';

  // 🆕 Calculs intelligents selon le mode
  const gridDimensions = !isRollMode ? getGridDimensions() : null;
  const cellStats = !isRollMode ? getCellStats() : null;

  // 🆕 Estimation des pages/consommation
  const getOutputEstimation = () => {
    if (isRollMode) {
      return {
        icon: '🎞️',
        type: 'Mode rouleau',
        output: `${totalLabels} étiquette${totalLabels > 1 ? 's' : ''} individuelle${totalLabels > 1 ? 's' : ''}`,
        detail: 'Découpe automatique',
        consumption: `${totalLabels} découpe${totalLabels > 1 ? 's' : ''}`,
      };
    } else {
      const activeCells = cellStats?.active || gridDimensions?.total || 1;
      const pagesNeeded = Math.ceil(totalLabels / activeCells);

      return {
        icon: '📄',
        type: 'Mode feuilles A4',
        output: `${pagesNeeded} page${pagesNeeded > 1 ? 's' : ''} PDF`,
        detail: `${gridDimensions?.columns}×${gridDimensions?.rows} étiquettes par feuille`,
        consumption: `${pagesNeeded} feuille${pagesNeeded > 1 ? 's' : ''} A4 nécessaire${pagesNeeded > 1 ? 's' : ''}`,
        grid: `${activeCells} case${activeCells > 1 ? 's' : ''} active${activeCells > 1 ? 's' : ''}${cellStats?.disabled > 0 ? ` (${cellStats.disabled} ignorée${cellStats.disabled > 1 ? 's' : ''})` : ''}`,
      };
    }
  };

  const estimation = getOutputEstimation();

  // 🆕 Analyse du contenu des étiquettes
  const getContentSummary = () => {
    const elements = [];
    if (labelStyle.showName) elements.push('Nom produit');
    if (labelStyle.showPrice) elements.push('Prix');
    if (labelStyle.showBarcode) elements.push('Code-barres');
    if (labelStyle.showBorder) elements.push('Bordure');

    return elements.length > 0 ? elements.join(', ') : 'Étiquettes vides';
  };

  return (
    <div className="bg-green-50 dark:bg-green-900/20 rounded-md p-4 border border-green-200 dark:border-green-800">
      <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-3 flex items-center">
        <FileText className="h-4 w-4 mr-2" />
        Résumé de l'export
      </h4>

      <div className="space-y-3 text-xs text-green-800 dark:text-green-200">
        {/* 🆕 Section produits et quantités */}
        <div className="bg-green-100 dark:bg-green-800/30 rounded p-2">
          <div className="flex items-center mb-1">
            <Grid className="h-3 w-3 mr-1" />
            <span className="font-medium">Sélection</span>
          </div>
          <div className="ml-4 space-y-1">
            <div>
              • <strong>{selectedCount}</strong> {itemLabel} sélectionné
              {selectedCount > 1 ? 's' : ''}
            </div>
            {duplicateCount > 1 && (
              <div>
                • <strong>{duplicateCount}</strong> exemplaire{duplicateCount > 1 ? 's' : ''} par
                produit = <strong>{totalLabels}</strong> étiquettes au total
              </div>
            )}
            {activeFilters.length > 0 && (
              <div>
                • <strong>{activeFilters.length}</strong> filtre
                {activeFilters.length > 1 ? 's' : ''} appliqué{activeFilters.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* 🆕 Section format et support */}
        <div className="bg-green-100 dark:bg-green-800/30 rounded p-2">
          <div className="flex items-center mb-1">
            <span className="mr-1">{estimation.icon}</span>
            <span className="font-medium">{estimation.type}</span>
          </div>
          <div className="ml-4 space-y-1">
            <div>
              • Sortie: <strong>{estimation.output}</strong>
            </div>
            <div>• {estimation.detail}</div>
            <div>
              • Taille:{' '}
              <strong>
                {currentLayout.width} × {currentLayout.height} mm
              </strong>
            </div>
            {estimation.grid && <div>• {estimation.grid}</div>}
            <div>
              • Consommation: <strong>{estimation.consumption}</strong>
            </div>
          </div>
        </div>

        {/* 🆕 Section contenu */}
        <div className="bg-green-100 dark:bg-green-800/30 rounded p-2">
          <div className="flex items-center mb-1">
            <FileText className="h-3 w-3 mr-1" />
            <span className="font-medium">Contenu des étiquettes</span>
          </div>
          <div className="ml-4">
            • <strong>{getContentSummary()}</strong>
          </div>
        </div>

        {/* 🆕 Section impression directe (si mode rouleau avec imprimante) */}
        {isRollMode && selectedPrinter && (
          <div className="bg-blue-100 dark:bg-blue-800/30 rounded p-2 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center mb-1">
              <Printer className="h-3 w-3 mr-1 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-200">
                Impression directe disponible
              </span>
            </div>
            <div className="ml-4 text-blue-700 dark:text-blue-300">
              • Imprimante: <strong>{selectedPrinter.Name}</strong>
              {selectedPrinter.Default && <span> (par défaut)</span>}
            </div>
          </div>
        )}

        {/* 🆕 Section actions disponibles */}
        <div className="bg-green-100 dark:bg-green-800/30 rounded p-2">
          <div className="flex items-center mb-1">
            <Zap className="h-3 w-3 mr-1" />
            <span className="font-medium">Actions disponibles</span>
          </div>
          <div className="ml-4 space-y-1">
            <div>
              • <strong>Générer PDF</strong> - Export pour impression ultérieure
            </div>
            {isRollMode && selectedPrinter && (
              <div>
                • <strong>Imprimer directement</strong> - Envoi immédiat vers l'imprimante
              </div>
            )}
            {isRollMode && !selectedPrinter && (
              <div className="text-orange-700 dark:text-orange-300">
                • Impression directe - <em>Sélectionnez une imprimante</em>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🆕 Indicateur de performance estimé */}
      {totalLabels > 20 && (
        <div className="mt-3 pt-2 border-t border-green-200 dark:border-green-700">
          <div className="text-xs text-green-700 dark:text-green-300 flex items-center">
            <span className="mr-1">⏱️</span>
            <span>
              Temps estimé: ~{Math.ceil(totalLabels / 10)} minute
              {Math.ceil(totalLabels / 10) > 1 ? 's' : ''}
              {isRollMode ? ' (impression directe)' : ' (génération PDF)'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelExportSummary;
