// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\LabelsLayoutConfigurator.jsx

import React from 'react';
import { Grid } from 'lucide-react';
import LabelDimensionsConfig from './LabelDimensionsConfig';
import PrintOptionsConfig from './PrintOptionsConfig';
import LabelStyleConfig from './LabelStyleConfig';
import LabelPreview from './LabelPreview';
import CellSelectionGrid from './CellSelectionGrid';
import PrinterSelector from './PrinterSelector';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const LabelsLayoutConfigurator = () => {
  const {
    // État depuis le store
    currentLayout,
    enableCellSelection,
    disabledCells,
    savedStylePresets,
    savedLayoutPresets,

    // Actions pour cellules
    setEnableCellSelection,
    toggleCellSelection,
    clearCellSelection,
    extractLabelData,
    getGridDimensions,

    // Actions presets
    saveStylePreset,
    loadStylePreset,
    deleteStylePreset,
    saveLayoutPreset,
    loadLayoutPreset,
    deleteLayoutPreset,
  } = useLabelExportStore();

  const labelData = extractLabelData();
  const gridDimensions = getGridDimensions();

  // Handlers pour la gestion des cellules
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

  return (
    <div className="space-y-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      {/* En-tête simple */}
      <div className="flex items-center space-x-2 mb-3">
        <Grid className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Configuration des étiquettes
        </h3>
      </div>

      {/* Configuration des dimensions (A4, Rouleau, etc.) */}
      <LabelDimensionsConfig
        savedPresets={savedLayoutPresets}
        onSavePreset={saveLayoutPreset}
        onLoadPreset={loadLayoutPreset}
        onDeletePreset={deleteLayoutPreset}
      />

      {/* Configuration du style des étiquettes */}
      <LabelStyleConfig
        savedPresets={savedStylePresets}
        onSavePreset={saveStylePreset}
        onLoadPreset={loadStylePreset}
        onDeletePreset={deleteStylePreset}
      />

      {/* Aperçu avec preview interactive (si données disponibles) */}
      {labelData.length > 0 && <LabelPreview />}

      {/* Options d'impression (quantité, etc.) */}
      <PrintOptionsConfig />

      {/* 🆕 NOUVEAU: Sélection d'imprimante (mode rouleau uniquement) */}
      {currentLayout?.supportType === 'rouleau' && <PrinterSelector />}

      {/* Gestion de la sélection de cellules (seulement pour A4) */}
      {currentLayout?.supportType !== 'rouleau' && (
        <CellSelectionGrid
          enableCellSelection={enableCellSelection}
          disabledCells={disabledCells}
          gridDimensions={gridDimensions}
          onEnableCellSelection={handleEnableCellSelection}
          onToggleCellSelection={handleToggleCellSelection}
        />
      )}
    </div>
  );
};

export default LabelsLayoutConfigurator;
