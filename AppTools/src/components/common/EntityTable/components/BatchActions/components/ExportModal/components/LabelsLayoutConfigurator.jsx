// 📁 LabelsLayoutConfigurator.jsx (Version avec presets + fix supportType)
import React, { useEffect } from 'react';
import { Grid } from 'lucide-react';
import { useLabelConfiguration } from '../hooks/useLabelConfiguration';
import { usePrintLayoutConfiguration } from '../hooks/usePrintLayoutConfiguration';
import LabelDimensionsConfig from './LabelDimensionsConfig';
import PrintOptionsConfig from './PrintOptionsConfig';
import LabelStyleConfig from './LabelStyleConfig';
import LabelPreview from './LabelPreview';
import CellSelectionGrid from './CellSelectionGrid';

const LabelsLayoutConfigurator = ({ orientation = 'portrait', onLayoutChange, labelData = [] }) => {
  // 🎨 Hook pour les styles d'étiquettes
  const {
    labelStyle,
    savedPresets,
    loading,
    handleStyleChange,
    savePreset,
    loadPreset,
    deletePreset,
    resetStyle,
  } = useLabelConfiguration();

  // 📏 Hook pour les layouts de support (avec supportType)
  const {
    currentLayout,
    savedPresets: layoutPresets,
    supportTypes,
    loading: layoutLoading,
    handleLayoutChange,
    handleSupportTypeChange,
    savePreset: saveLayoutPreset,
    loadPreset: loadLayoutPreset,
    deletePreset: deleteLayoutPreset,
    resetLayout,
    calculateGridDimensions,
  } = usePrintLayoutConfiguration();

  // 🔧 États locaux pour la sélection de cellules
  const [enableCellSelection, setEnableCellSelection] = React.useState(false);
  const [disabledCells, setDisabledCells] = React.useState(new Set());

  const gridDimensions = calculateGridDimensions();

  // ✅ TRANSMISSION : Layout complet avec supportType vers le parent
  useEffect(() => {
    if (onLayoutChange && currentLayout) {
      console.log('🔄 Transmission layout complet vers parent:', currentLayout);
      onLayoutChange({
        preset: 'custom',
        layout: currentLayout, // ✅ Contient supportType, rouleau, etc.
        style: labelStyle,
        disabledCells: Array.from(disabledCells),
      });
    }
  }, [currentLayout, labelStyle, disabledCells, onLayoutChange]);

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

    // ✅ Transmission immédiate des changements
    if (onLayoutChange) {
      onLayoutChange({
        preset: 'custom',
        layout: currentLayout, // ✅ Avec supportType
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

      {/* ✅ Layout avec supportType */}
      <LabelDimensionsConfig
        customLayout={currentLayout}
        onLayoutChange={handleLayoutChange}
        supportTypes={supportTypes}
        onSupportTypeChange={handleSupportTypeChange}
        onReset={resetLayout}
        // 🆕 Presets de layout
        savedPresets={layoutPresets}
        loading={layoutLoading}
        onSavePreset={saveLayoutPreset}
        onLoadPreset={loadLayoutPreset}
        onDeletePreset={deleteLayoutPreset}
      />

      <PrintOptionsConfig
        labelStyle={labelStyle}
        labelDataLength={labelData.length}
        onStyleChange={handleStyleChange}
      />

      {/* ✅ Styles avec presets */}
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
        <LabelPreview labelData={labelData} customLayout={currentLayout} labelStyle={labelStyle} />
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
