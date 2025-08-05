// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\DirectPrintButton.jsx
import React from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { useLabelExportStore } from '../stores/useLabelExportStore';
import { useActionToasts } from '../../../hooks/useActionToasts';

const DirectPrintButton = ({ onClose }) => {
  const {
    currentLayout,
    selectedItems,
    selectedPrinter,
    printing,
    printError,
    printLabelsDirectly,
    resetPrintState,
  } = useLabelExportStore();

  const { toastActions } = useActionToasts();

  const canPrint =
    currentLayout?.supportType === 'rouleau' &&
    selectedItems.length > 0 &&
    selectedPrinter &&
    !printing;

  const handlePrint = async () => {
    resetPrintState();

    try {
      const result = await printLabelsDirectly();
      resetPrintState();
      onClose();

      // Afficher le toast de succès
      setTimeout(() => {
        const totalLabels = selectedItems.length;
        const successCount = result?.successCount || result?.printed || totalLabels;

        if (successCount === totalLabels) {
          toastActions.generic.success(
            `${successCount} étiquette(s) imprimée(s) avec succès`,
            'Impression réussie'
          );
        } else {
          toastActions.generic.warning(
            `${successCount}/${totalLabels} étiquette(s) imprimée(s)`,
            'Impression partielle'
          );
        }
      }, 300);
    } catch (error) {
      console.error('Erreur impression:', error);
      resetPrintState();
      onClose();

      // Afficher le toast d'erreur
      setTimeout(() => {
        toastActions.generic.error(
          error.message || "Erreur lors de l'impression",
          "Erreur d'impression"
        );
      }, 300);
    }
  };

  // Ne pas afficher le bouton si ce n'est pas un mode rouleau
  if (currentLayout?.supportType !== 'rouleau') {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        onClick={handlePrint}
        disabled={!canPrint}
        className={`
          flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors
          ${
            canPrint
              ? 'text-white bg-blue-600 hover:bg-blue-700'
              : 'text-gray-400 bg-gray-200 cursor-not-allowed'
          }
        `}
        title={
          !selectedPrinter
            ? 'Sélectionnez une imprimante'
            : selectedItems.length === 0
              ? 'Sélectionnez des étiquettes'
              : printError
                ? "Problème avec l'imprimante - cliquez pour réessayer"
                : "Imprimer directement sur l'imprimante"
        }
      >
        {printing ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Printer className="h-4 w-4 mr-2" />
        )}
        {printing ? 'Impression...' : 'Imprimer directement'}
      </button>
    </div>
  );
};

export default DirectPrintButton;
