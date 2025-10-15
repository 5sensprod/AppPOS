// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\LabelsConfigSidebar.jsx
import React from 'react';
import {
  Grid,
  Ruler,
  Palette,
  Printer as PrinterIcon,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useAccordion } from '../hooks/useAccordion';
import LabelDimensionsConfig from './LabelDimensionsConfig';
import LabelStyleConfigCompact from './LabelStyleConfigCompact';
import PrintOptionsConfig from './PrintOptionsConfig';
import CellSelectionGrid from './CellSelectionGrid';
import PrinterSelector from './PrinterSelector';
import PresetManagerCompact from './PresetManagerCompact';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const AccordionSection = ({ id, title, icon: Icon, isOpen, onToggle, info, children }) => (
  <div className="border-b border-gray-200 dark:border-gray-600">
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
            {title}
          </span>
          {!isOpen && info && (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate block mt-0.5">
              {info}
            </span>
          )}
        </div>
      </div>
      {isOpen ? (
        <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
      ) : (
        <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
      )}
    </button>

    {isOpen && <div className="px-4 pb-4">{children}</div>}
  </div>
);

const LabelsConfigSidebar = ({ exportMode }) => {
  const { currentLayout, getGridDimensions, savedPresets } = useLabelExportStore();

  // Tous les accordéons fermés par défaut SAUF dimensions
  const { toggle, isOpen } = useAccordion(['dimensions']);

  // Générer les infos du header
  const getDimensionsInfo = () => {
    if (!currentLayout) return '';

    const isRoll = currentLayout.supportType === 'rouleau';

    if (isRoll) {
      const rouleauWidth = currentLayout.rouleau?.width || 58;
      const margeInterieure = parseFloat(currentLayout.padding) || 3;
      const etiquettePhysique = rouleauWidth - margeInterieure * 2;
      const hauteur = currentLayout.height || 29;
      return `${etiquettePhysique.toFixed(1)}×${hauteur}mm • Rouleau: ${rouleauWidth}mm`;
    } else {
      const gridDims = getGridDimensions();
      const largeur = currentLayout.width || 48.5;
      const hauteur = currentLayout.height || 25;
      return `${largeur}×${hauteur}mm • ${gridDims.columns}×${gridDims.rows} (${gridDims.total} étiq.)`;
    }
  };

  const dimensionsInfo = getDimensionsInfo();
  const hasPresets = savedPresets && savedPresets.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Presets en haut - toujours visible */}
      <div className="border-b border-gray-200 dark:border-gray-600">
        <PresetManagerCompact />
      </div>

      {/* Accordéons de configuration */}
      <div className="flex-1 overflow-y-auto">
        {/* Dimensions et Support */}
        <AccordionSection
          id="dimensions"
          title="Configuration du support"
          icon={Ruler}
          isOpen={isOpen('dimensions')}
          onToggle={toggle}
          info={dimensionsInfo}
        >
          <LabelDimensionsConfig />
        </AccordionSection>

        {/* Style des étiquettes */}
        <AccordionSection
          id="style"
          title="Style des étiquettes"
          icon={Palette}
          isOpen={isOpen('style')}
          onToggle={toggle}
          info="Personnaliser l'apparence"
        >
          <LabelStyleConfigCompact />
        </AccordionSection>

        {/* Options d'impression - mode print uniquement */}
        {exportMode === 'print' && (
          <>
            <AccordionSection
              id="print-options"
              title="Options d'impression"
              icon={PrinterIcon}
              isOpen={isOpen('print-options')}
              onToggle={toggle}
              info="Quantité et copies"
            >
              <PrintOptionsConfig />
            </AccordionSection>

            {/* Sélecteur imprimante - rouleau uniquement */}
            {currentLayout?.supportType === 'rouleau' && (
              <AccordionSection
                id="printer"
                title="Imprimante"
                icon={PrinterIcon}
                isOpen={isOpen('printer')}
                onToggle={toggle}
                info="Choisir l'imprimante"
              >
                <PrinterSelector />
              </AccordionSection>
            )}
          </>
        )}

        {/* Gestion des cellules - A4 PDF uniquement */}
        {exportMode === 'pdf' && currentLayout?.supportType !== 'rouleau' && (
          <AccordionSection
            id="cells"
            title="Gestion des cellules"
            icon={Grid}
            isOpen={isOpen('cells')}
            onToggle={toggle}
            info="Sélectionner les cases à imprimer"
          >
            <CellSelectionGrid />
          </AccordionSection>
        )}
      </div>
    </div>
  );
};

export default LabelsConfigSidebar;
