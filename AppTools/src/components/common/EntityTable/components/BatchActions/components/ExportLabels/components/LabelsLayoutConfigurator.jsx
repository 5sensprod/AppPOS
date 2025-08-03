//AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\LabelsLayoutConfigurator.jsx
import React from 'react';
import { Grid } from 'lucide-react';
import LabelDimensionsConfig from './LabelDimensionsConfig';
import PrintOptionsConfig from './PrintOptionsConfig';
import LabelStyleConfig from './LabelStyleConfig';
import LabelPreview from './LabelPreview';
import CellSelectionGrid from './CellSelectionGrid';

const LabelsLayoutConfigurator = ({
  labelData = [],
  // ✅ Toutes les props viennent directement du hook unifié
  labelStyle,
  onStyleChange,
  currentLayout,
  onLayoutChange,
  onSupportTypeChange,
  supportTypes,
  calculateGridDimensions,
  enableCellSelection,
  setEnableCellSelection,
  disabledCells,
  setDisabledCells,
  savedStylePresets,
  onSaveStylePreset,
  onLoadStylePreset,
  savedLayoutPresets,
  onSaveLayoutPreset,
  onLoadLayoutPreset,
}) => {
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
  };

  const resetStyle = () => {
    // Reset géré par le hook parent
  };

  const resetLayout = () => {
    // Reset géré par le hook parent
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
        customLayout={currentLayout}
        onLayoutChange={onLayoutChange}
        supportTypes={supportTypes}
        onSupportTypeChange={onSupportTypeChange}
        onReset={resetLayout}
        savedPresets={savedLayoutPresets}
        loading={false}
        onSavePreset={onSaveLayoutPreset}
        onLoadPreset={onLoadLayoutPreset}
        onDeletePreset={() => {}} // À implémenter si nécessaire
      />

      <LabelStyleConfig
        labelStyle={labelStyle}
        onStyleChange={onStyleChange}
        onReset={resetStyle}
        savedPresets={savedStylePresets}
        loading={false}
        onSavePreset={onSaveStylePreset}
        onLoadPreset={onLoadStylePreset}
        onDeletePreset={() => {}} // À implémenter si nécessaire
      />

      {labelData.length > 0 && (
        <LabelPreview
          labelData={labelData}
          customLayout={currentLayout}
          labelStyle={labelStyle}
          onStyleChange={onStyleChange}
        />
      )}

      <PrintOptionsConfig
        labelStyle={labelStyle}
        labelDataLength={labelData.length}
        onStyleChange={onStyleChange}
      />

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
