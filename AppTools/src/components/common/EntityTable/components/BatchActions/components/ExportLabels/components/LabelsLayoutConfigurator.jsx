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
    extractLabelData,
  } = useLabelExportStore();

  const labelData = extractLabelData();

  return (
    <div className="space-y-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      {/* En-tête simple */}
      <div className="flex items-center space-x-2 mb-3">
        <Grid className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Configuration des étiquettes
        </h3>
      </div>

      {/* 🎯 Configuration des dimensions - Plus besoin de props ! */}
      <LabelDimensionsConfig />

      {/* 🎯 Configuration du style - Plus besoin de props ! */}
      <LabelStyleConfig />

      {/* Aperçu avec preview interactive (si données disponibles) */}
      {labelData.length > 0 && <LabelPreview />}

      {/* Options d'impression (quantité, etc.) */}
      <PrintOptionsConfig />

      {/* Sélection d'imprimante (mode rouleau uniquement) */}
      {currentLayout?.supportType === 'rouleau' && <PrinterSelector />}

      {/* Gestion de la sélection de cellules (seulement pour A4) */}
      {currentLayout?.supportType !== 'rouleau' && <CellSelectionGrid />}
    </div>
  );
};

export default LabelsLayoutConfigurator;
