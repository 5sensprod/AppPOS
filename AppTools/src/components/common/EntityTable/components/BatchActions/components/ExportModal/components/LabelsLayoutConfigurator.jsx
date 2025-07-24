// 📁 LabelsLayoutConfigurator.jsx (Version avec presets)
import React from 'react';
import { Grid } from 'lucide-react';
import { useLabelConfiguration } from '../hooks/useLabelConfiguration';
import LabelDimensionsConfig from './LabelDimensionsConfig';
import PrintOptionsConfig from './PrintOptionsConfig';
import LabelStyleConfig from './LabelStyleConfig';
import LabelPreview from './LabelPreview';
import CellSelectionGrid from './CellSelectionGrid';

const LabelsLayoutConfigurator = ({ orientation = 'portrait', onLayoutChange, labelData = [] }) => {
  const {
    customLayout,
    labelStyle,
    savedPresets,
    loading,
    enableCellSelection,
    disabledCells,
    setEnableCellSelection,
    setDisabledCells,
    calculateGridDimensions,
    handleCustomLayoutChange,
    handleStyleChange,
    // 🆕 Fonctions pour presets via API
    savePreset,
    loadPreset,
    deletePreset,
    resetStyle,
  } = useLabelConfiguration(onLayoutChange);

  const gridDimensions = calculateGridDimensions();

  const handleEnableCellSelection = (enabled) => {
    setEnableCellSelection(enabled);
    if (!enabled) {
      setDisabledCells(new Set());
    }
  };

  const handleToggleCellSelection = (cellIndex, event) => {
    event.preventDefault();
    event.stopPropagation();
    const newDisabledCells = new Set(disabledCells);
    if (newDisabledCells.has(cellIndex)) {
      newDisabledCells.delete(cellIndex);
    } else {
      newDisabledCells.add(cellIndex);
    }
    setDisabledCells(newDisabledCells);
    if (onLayoutChange) {
      onLayoutChange({
        preset: 'custom',
        layout: customLayout,
        style: labelStyle,
        disabledCells: Array.from(newDisabledCells),
      });
    }
  };

  return (
    <div className="space-y-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Grid className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Configuration des étiquettes
        </h3>
      </div>

      <LabelDimensionsConfig
        customLayout={customLayout}
        onLayoutChange={handleCustomLayoutChange}
      />

      <PrintOptionsConfig
        labelStyle={labelStyle}
        labelDataLength={labelData.length}
        onStyleChange={handleStyleChange}
      />

      {/* ✅ LabelStyleConfig avec toutes les fonctions de presets */}
      <LabelStyleConfig
        labelStyle={labelStyle}
        onStyleChange={handleStyleChange}
        onReset={resetStyle}
        savedPresets={savedPresets}
        loading={loading}
        onSavePreset={savePreset}
        onLoadPreset={loadPreset}
        onDeletePreset={deletePreset}
      />

      {labelData.length > 0 && (
        <LabelPreview labelData={labelData} customLayout={customLayout} labelStyle={labelStyle} />
      )}

      <CellSelectionGrid
        enableCellSelection={enableCellSelection}
        disabledCells={disabledCells}
        gridDimensions={gridDimensions}
        onEnableCellSelection={handleEnableCellSelection}
        onToggleCellSelection={handleToggleCellSelection}
      />
    </div>
  );
};

export default LabelsLayoutConfigurator;
