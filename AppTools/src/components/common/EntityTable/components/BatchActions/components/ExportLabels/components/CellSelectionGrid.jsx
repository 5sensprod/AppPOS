import React from 'react';
import { Grid } from 'lucide-react';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const CellSelectionGrid = () => {
  const {
    enableCellSelection,
    disabledCells,
    setEnableCellSelection,
    toggleCellSelection,
    clearCellSelection,
    getGridDimensions,
  } = useLabelExportStore();

  const gridDimensions = getGridDimensions();

  const handleEnableCellSelection = (enabled) => {
    setEnableCellSelection(enabled);
    if (!enabled) {
      clearCellSelection();
    }
  };

  const handleToggleCellSelection = (cellIndex, event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleCellSelection(cellIndex);
  };

  const renderGrid = () => {
    if (!enableCellSelection) return null;

    const cells = [];
    for (let i = 0; i < gridDimensions.total; i++) {
      const row = Math.floor(i / gridDimensions.columns);
      const col = i % gridDimensions.columns;
      const isDisabled = disabledCells.has(i);

      cells.push(
        <button
          key={i}
          type="button"
          onClick={(e) => handleToggleCellSelection(i, e)}
          className={`
            relative border border-gray-300 text-xs font-mono flex items-center justify-center
            transition-colors hover:border-gray-400
            ${
              isDisabled
                ? 'bg-red-100 text-red-700 border-red-300'
                : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
            }
          `}
          style={{ width: '24px', height: '16px' }}
          title={`Case ${i + 1} (Ligne ${row + 1}, Col ${col + 1}) - ${isDisabled ? 'Ignorée' : 'Active'}`}
        >
          {isDisabled ? '✗' : '✓'}
        </button>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Grille d'étiquettes ({gridDimensions.columns}×{gridDimensions.rows})
          </span>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-50 border border-green-300 mr-1"></div>
              <span className="text-green-700">Active (✓)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-100 border border-red-300 mr-1"></div>
              <span className="text-red-700">Ignorée (✗)</span>
            </div>
          </div>
        </div>

        <div
          className="grid gap-1 justify-center bg-gray-50 p-3 rounded border"
          style={{ gridTemplateColumns: `repeat(${gridDimensions.columns}, 24px)` }}
        >
          {cells}
        </div>

        <div className="text-xs text-gray-600 space-y-1">
          <p>
            • <strong>Cliquez</strong> sur une case pour l'activer/désactiver
          </p>
          <p>
            • <strong>{gridDimensions.total - disabledCells.size}</strong> cases actives sur{' '}
            {gridDimensions.total}
          </p>
          <p>
            • <strong>{disabledCells.size}</strong> cases ignorées
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
        <Grid className="h-4 w-4 mr-2" />
        Gestion des cases vides
      </h4>

      <div className="space-y-3">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Si votre feuille d'étiquettes n'est pas vierge, vous pouvez désactiver certaines cases
          pour éviter d'imprimer dessus.
        </p>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={enableCellSelection}
              onChange={(e) => handleEnableCellSelection(e.target.checked)}
              className="mr-2 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Activer la sélection de cases
            </span>
          </label>
        </div>

        {renderGrid()}

        {!enableCellSelection && (
          <div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
            💡 <strong>Info :</strong> Cochez la case ci-dessus pour afficher la grille et
            sélectionner les cases à ignorer
          </div>
        )}
      </div>
    </div>
  );
};

export default CellSelectionGrid;
