// components/DirectPrintButton.jsx

import React from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { useLabelExportStore } from '../stores/useLabelExportStore';
import { useActionToasts } from '../../../hooks/useActionToasts';

const DirectPrintButton = () => {
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
    try {
      resetPrintState();

      // Toast de démarrage
      const progressToastId = toastActions.export.start(
        selectedItems.length,
        'impression',
        'étiquette'
      );

      const result = await printLabelsDirectly();

      // Toast de succès
      toastActions.generic.success(
        `${result.successCount}/${result.totalLabels} étiquette(s) imprimée(s)`,
        'Impression réussie'
      );
    } catch (error) {
      console.error('❌ Erreur impression:', error);

      // Toast d'erreur
      toastActions.generic.error(
        error.message || "Une erreur est survenue lors de l'impression",
        "Erreur d'impression"
      );
    }
  };

  if (currentLayout?.supportType !== 'rouleau') {
    return null; // Pas d'impression directe en mode A4
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

      {printError && <div className="text-xs text-red-600">❌ {printError}</div>}
    </div>
  );
};

export default DirectPrintButton;
