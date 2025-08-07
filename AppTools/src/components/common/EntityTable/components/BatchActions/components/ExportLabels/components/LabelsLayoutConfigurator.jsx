import React from 'react';
import { Grid, Ruler, Palette } from 'lucide-react';
import { useAccordion } from '../hooks/useAccordion';
import { AccordionPanel } from './AccordionPanel';
import LabelDimensionsConfig from './LabelDimensionsConfig';
import PrintOptionsConfig from './PrintOptionsConfig';
import LabelStyleConfig from './LabelStyleConfig';
import CellSelectionGrid from './CellSelectionGrid';
import PrinterSelector from './PrinterSelector';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const LabelsLayoutConfigurator = ({ exportMode }) => {
  const { currentLayout, getGridDimensions } = useLabelExportStore();

  // Accordéons fermés par défaut, avec panels différents selon le mode
  const defaultPanels =
    exportMode === 'print' ? ['style', 'print', 'printer'] : ['dimensions', 'style'];
  const { toggle, isOpen } = useAccordion(defaultPanels);

  // Fonction pour générer les infos du header selon le type de support
  const getDimensionsHeaderInfo = () => {
    if (!currentLayout) return '';

    const isRoll = currentLayout.supportType === 'rouleau';

    if (isRoll) {
      // Mode rouleau : largeur calculée × hauteur + largeur physique
      const rouleauWidth = currentLayout.rouleau?.width || 58;
      const margeInterieure = parseFloat(currentLayout.padding) || 3;
      const etiquettePhysique = rouleauWidth - margeInterieure * 2;
      const hauteur = currentLayout.height || 29;

      return `${etiquettePhysique.toFixed(1)}×${hauteur}mm • Rouleau: ${rouleauWidth}mm • Marge: ${margeInterieure}mm`;
    } else {
      // Mode A4 : largeur × hauteur + grille
      const gridDims = getGridDimensions();
      const largeur = currentLayout.width || 48.5;
      const hauteur = currentLayout.height || 25;

      return `${largeur}×${hauteur}mm • Grille: ${gridDims.columns}×${gridDims.rows} (${gridDims.total} étiq.)`;
    }
  };

  // Fonction pour les infos de style
  const getStyleHeaderInfo = () => {
    // On pourrait accéder au labelStyle depuis le store ici si besoin
    return ''; // Pour l'instant vide, à implémenter selon vos besoins
  };

  // Fonction pour les infos d'impression
  const getPrintHeaderInfo = () => {
    // Exemple : afficher le nombre de copies si disponible
    return ''; // À implémenter selon vos besoins
  };

  const dimensionsInfo = getDimensionsHeaderInfo();
  const styleInfo = getStyleHeaderInfo();
  const printInfo = getPrintHeaderInfo();

  return (
    <div className="space-y-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      {/* En-tête avec indication du mode */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Grid className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Configuration des étiquettes
          </h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
          Mode: {exportMode === 'pdf' ? 'PDF' : 'Impression'}
        </span>
      </div>
      {/* Panel Dimensions - toujours visible */}
      <AccordionPanel
        id="dimensions"
        title={`Configuration des dimensions${!isOpen('dimensions') && dimensionsInfo ? ` • ${dimensionsInfo}` : ''}`}
        icon={Ruler}
        isOpen={isOpen('dimensions')}
        onToggle={toggle}
      >
        <LabelDimensionsConfig />
      </AccordionPanel>
      {/* Panel Style - toujours visible */}
      <AccordionPanel
        id="style"
        title="Style des étiquettes"
        icon={Palette}
        isOpen={isOpen('style')}
        onToggle={toggle}
      >
        <LabelStyleConfig />
      </AccordionPanel>
      {/* Panels mode impression */}
      <div className="grid grid-cols-2 gap-4">
        {exportMode === 'print' && <PrintOptionsConfig />}
        {exportMode === 'print' && currentLayout?.supportType === 'rouleau' && <PrinterSelector />}
      </div>
      {/* Panel Gestion des cellules - seulement pour A4 en mode PDF */}
      {exportMode === 'pdf' && currentLayout?.supportType !== 'rouleau' && (
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
