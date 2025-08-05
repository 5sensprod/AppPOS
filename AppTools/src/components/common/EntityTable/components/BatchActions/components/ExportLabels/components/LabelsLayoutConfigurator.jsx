import React from 'react';
import { Grid, Ruler, Palette, Eye, Printer, Settings } from 'lucide-react';
import { useAccordion } from '../hooks/useAccordion'; // 🔧 Import du hook créé
import { AccordionPanel } from './AccordionPanel';
import LabelDimensionsConfig from './LabelDimensionsConfig';
import PrintOptionsConfig from './PrintOptionsConfig';
import LabelStyleConfig from './LabelStyleConfig';
import LabelPreview from './LabelPreview';
import CellSelectionGrid from './CellSelectionGrid';
import PrinterSelector from './PrinterSelector';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const LabelsLayoutConfigurator = () => {
  const { currentLayout, extractLabelData } = useLabelExportStore();

  const labelData = extractLabelData();

  // 🔧 Tous les accordéons fermés par défaut
  const { toggle, isOpen } = useAccordion([]); // Array vide = tout fermé

  return (
    <div className="space-y-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      {/* En-tête simple */}
      <div className="flex items-center space-x-2 mb-3">
        <Grid className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Configuration des étiquettes
        </h3>
      </div>

      {/* Panel Dimensions */}
      <AccordionPanel
        id="dimensions"
        title="Configuration des dimensions"
        icon={Ruler}
        isOpen={isOpen('dimensions')}
        onToggle={toggle}
      >
        <LabelDimensionsConfig />
      </AccordionPanel>

      {/* Panel Style */}
      <AccordionPanel
        id="style"
        title="Style des étiquettes"
        icon={Palette}
        isOpen={isOpen('style')}
        onToggle={toggle}
      >
        <LabelStyleConfig />
      </AccordionPanel>

      {/* Panel Aperçu (seulement si données disponibles) */}
      {labelData.length > 0 && (
        <AccordionPanel
          id="preview"
          title="Aperçu"
          icon={Eye}
          isOpen={isOpen('preview')}
          onToggle={toggle}
        >
          <LabelPreview />
        </AccordionPanel>
      )}

      {/* Panel Options d'impression */}
      <AccordionPanel
        id="print"
        title="Options d'impression"
        icon={Settings}
        isOpen={isOpen('print')}
        onToggle={toggle}
      >
        <PrintOptionsConfig />
      </AccordionPanel>

      {/* Panel Sélection d'imprimante (mode rouleau uniquement) */}
      {currentLayout?.supportType === 'rouleau' && (
        <AccordionPanel
          id="printer"
          title="Sélection d'imprimante"
          icon={Printer}
          isOpen={isOpen('printer')}
          onToggle={toggle}
        >
          <PrinterSelector />
        </AccordionPanel>
      )}

      {/* Panel Gestion des cellules (seulement pour A4) */}
      {currentLayout?.supportType !== 'rouleau' && (
        <AccordionPanel
          id="cells"
          title="Gestion des cellules"
          icon={Grid}
          isOpen={isOpen('cells')}
          onToggle={toggle}
        >
          <CellSelectionGrid />
        </AccordionPanel>
      )}
    </div>
  );
};

export default LabelsLayoutConfigurator;
