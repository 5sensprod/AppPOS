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
    print, // 🆕 API unifiée
    reset, // 🆕 API unifiée
  } = useLabelExportStore();

  const { toastActions } = useActionToasts();

  const canPrint =
    currentLayout?.supportType === 'rouleau' &&
    selectedItems.length > 0 &&
    selectedPrinter &&
    !printing;

  // 🆕 Handler simplifié avec nouvelle API
  const handlePrint = async () => {
    reset('print'); // 🎯 Reset erreurs avant impression

    try {
      // 🆕 Utilisation de l'API unifiée
      const result = await print('direct');

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

  // 🆕 Messages d'aide améliorés
  const getButtonTitle = () => {
    if (!selectedPrinter) return "Sélectionnez une imprimante d'étiquettes";
    if (selectedItems.length === 0) return 'Sélectionnez des étiquettes à imprimer';
    if (printError) return `Erreur: ${printError} - Cliquez pour réessayer`;
    return `Imprimer ${selectedItems.length} étiquette(s) directement sur ${selectedPrinter.Name}`;
  };

  const getButtonText = () => {
    if (printing) return 'Impression...';
    if (printError) return 'Réessayer impression';
    return 'Imprimer directement';
  };

  const getButtonClass = () => {
    const baseClass =
      'flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors';

    if (!canPrint && !printError) {
      return `${baseClass} text-gray-400 bg-gray-200 cursor-not-allowed`;
    }

    if (printError) {
      return `${baseClass} text-white bg-orange-600 hover:bg-orange-700`;
    }

    return `${baseClass} text-white bg-blue-600 hover:bg-blue-700`;
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        onClick={handlePrint}
        disabled={!canPrint && !printError}
        className={getButtonClass()}
        title={getButtonTitle()}
      >
        {printing ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Printer className="h-4 w-4 mr-2" />
        )}
        {getButtonText()}
      </button>

      {/* 🆕 Indicateur d'état visuel */}
      {selectedPrinter && !printing && (
        <div className="text-xs text-gray-500 dark:text-gray-400">→ {selectedPrinter.Name}</div>
      )}
    </div>
  );
};

export default DirectPrintButton;
