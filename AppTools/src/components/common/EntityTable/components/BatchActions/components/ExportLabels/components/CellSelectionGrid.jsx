import React, { useMemo } from 'react';
import { Grid } from 'lucide-react';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const CellSelectionGrid = () => {
  const {
    enableCellSelection,
    disabledCells,
    toggleCells, // 🆕 API unifiée
    getGridDimensions,
    getCellStats, // 🆕 Méthode optimisée
  } = useLabelExportStore();

  const gridDimensions = getGridDimensions();
  const stats = getCellStats();

  // Mémoriser les cellules pour éviter re-render inutiles
  const cells = useMemo(() => {
    if (!enableCellSelection) return [];

    return Array.from({ length: gridDimensions.total }, (_, i) => {
      const row = Math.floor(i / gridDimensions.columns);
      const col = i % gridDimensions.columns;
      const isDisabled = disabledCells.has(i);

      return {
        index: i,
        row,
        col,
        isDisabled,
        title: `Case ${i + 1} (L${row + 1}, C${col + 1}) - ${isDisabled ? 'Ignorée' : 'Active'}`,
      };
    });
  }, [enableCellSelection, gridDimensions, disabledCells]);

  // 🆕 Handlers simplifiés avec nouvelle API
  const handleToggleSelection = (enabled) => {
    toggleCells(enabled ? 'enable' : 'disable');
  };

  const handleToggleCell = (cellIndex, event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleCells('toggle', cellIndex);
  };

  if (!enableCellSelection) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <Grid className="h-4 w-4 mr-2" />
          Gestion des cases vides
        </h4>

        <div className="space-y-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Si votre feuille d'étiquettes n'est pas vierge, vous pouvez désactiver certaines cases.
          </p>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={false}
              onChange={(e) => handleToggleSelection(e.target.checked)}
              className="mr-2 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Activer la sélection de cases
            </span>
          </label>

          <div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
            💡 Cochez la case pour afficher la grille et sélectionner les cases à ignorer
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
        <Grid className="h-4 w-4 mr-2" />
        Gestion des cases vides
      </h4>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={true}
              onChange={(e) => handleToggleSelection(e.target.checked)}
              className="mr-2 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Activer la sélection de cases
            </span>
          </label>

          {/* 🆕 Actions rapides */}
          <div className="flex gap-2">
            <button
              onClick={() => toggleCells('clear')}
              className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50"
            >
              Tout activer
            </button>
            <button
              onClick={() => toggleCells('selectAll')}
              className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
            >
              Tout désactiver
            </button>
          </div>
        </div>

        {/* En-tête de grille */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Grille {gridDimensions.columns}×{gridDimensions.rows}
          </span>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-50 border border-green-300 mr-1"></div>
              <span className="text-green-700">Active</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-100 border border-red-300 mr-1"></div>
              <span className="text-red-700">Ignorée</span>
            </div>
          </div>
        </div>

        {/* Grille interactive */}
        <div
          className="grid gap-1 justify-center bg-gray-50 p-3 rounded border"
          style={{ gridTemplateColumns: `repeat(${gridDimensions.columns}, 24px)` }}
        >
          {cells.map((cell) => (
            <button
              key={cell.index}
              type="button"
              onClick={(e) => handleToggleCell(cell.index, e)}
              className={`
                relative border text-xs font-mono flex items-center justify-center
                transition-colors hover:border-gray-400 w-6 h-4
                ${
                  cell.isDisabled
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                }
              `}
              title={cell.title}
            >
              {cell.isDisabled ? '✗' : '✓'}
            </button>
          ))}
        </div>

        {/* 🆕 Statistiques optimisées */}
        <div className="text-xs text-gray-600 space-y-1">
          <p>
            • <strong>{stats.active}</strong> cases actives sur {stats.total}
          </p>
          <p>
            • <strong>{stats.disabled}</strong> cases ignorées
          </p>
        </div>
      </div>
    </div>
  );
};

export default CellSelectionGrid;
