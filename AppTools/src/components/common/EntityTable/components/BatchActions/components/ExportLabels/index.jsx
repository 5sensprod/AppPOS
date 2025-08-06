import React, { useEffect, useState } from 'react';
import { Tags, FileText, Printer } from 'lucide-react';
import BaseModal from '../../../../../ui/BaseModal';
import LabelsLayoutConfigurator from './components/LabelsLayoutConfigurator';
import LabelExportSummary from './components/LabelExportSummary';
import DirectPrintButton from './components/DirectPrintButton';
import { useLabelExportStore } from './stores/useLabelExportStore';

const ExportLabelsModal = ({
  isOpen,
  onClose,
  onExport,
  selectedItems = [],
  entityName = 'produit',
  entityNamePlural = 'produits',
  activeFilters = [],
  productsData = [],
}) => {
  const {
    exportTitle,
    loading,
    currentLayout,
    initialize,
    reset,
    setExportTitle,
    setLoading,
    extractLabelData,
    buildLabelLayout,
  } = useLabelExportStore();

  // État pour gérer le mode PDF/Impression
  const [exportMode, setExportMode] = useState('print'); // 'pdf' ou 'print'

  useEffect(() => {
    if (isOpen) {
      initialize(selectedItems, productsData, activeFilters, entityNamePlural);
    }
  }, [isOpen, selectedItems, productsData, activeFilters, entityNamePlural, initialize]);

  useEffect(() => {
    if (!isOpen) {
      reset('cells');
      reset('print');
      setExportMode('print'); // Reset au mode Print par défaut
    }
  }, [isOpen, reset]);

  const handleClose = () => {
    setLoading(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      alert('Veuillez sélectionner au moins un produit pour les étiquettes');
      return;
    }

    setLoading(true);
    try {
      const exportConfig = {
        selectedItems,
        exportType: 'labels',
        title:
          exportMode === 'pdf'
            ? exportTitle.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_')
            : undefined,
        format: exportMode, // 'pdf' ou 'print'
        labelData: extractLabelData(),
        labelLayout: buildLabelLayout(),
      };

      await onExport(exportConfig);
      handleClose();
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      setLoading(false);
    }
  };

  const selectedCount = selectedItems.length;
  const itemLabel = selectedCount === 1 ? entityName : entityNamePlural;

  const footer = (
    <>
      {/* Toggle PDF/Impression */}
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setExportMode('pdf')}
          className={`px-3 py-2 text-sm font-medium rounded-md flex items-center transition-colors ${
            exportMode === 'pdf'
              ? 'bg-white dark:bg-gray-600 text-green-600 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </button>
        <button
          type="button"
          onClick={() => setExportMode('print')}
          className={`px-3 py-2 text-sm font-medium rounded-md flex items-center transition-colors ${
            exportMode === 'print'
              ? 'bg-white dark:bg-gray-600 text-green-600 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Printer className="h-4 w-4 mr-2" />
          Impression
        </button>
      </div>

      <div className="flex-1"></div>

      <button
        type="button"
        onClick={handleClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
      >
        Annuler
      </button>

      {/* Bouton d'impression directe seulement en mode impression pour les rouleaux */}
      {exportMode === 'print' && currentLayout?.supportType === 'rouleau' ? (
        <DirectPrintButton onClose={handleClose} />
      ) : (
        <button
          type="submit"
          disabled={loading || selectedItems.length === 0}
          className="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          form="export-labels-form"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {exportMode === 'pdf' ? 'Génération PDF...' : 'Impression...'}
            </>
          ) : (
            <>
              {exportMode === 'pdf' ? (
                <>
                  <Tags className="h-4 w-4 mr-2" />
                  Générer PDF
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimer
                </>
              )}
            </>
          )}
        </button>
      )}
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Configurer l'export d'étiquettes"
      icon={Tags}
      footer={footer}
      maxWidth="max-w-4xl"
    >
      <form id="export-labels-form" onSubmit={handleSubmit}>
        {/* Champ titre seulement en mode PDF */}
        {exportMode === 'pdf' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Titre du document
            </label>
            <input
              type="text"
              value={exportTitle}
              onChange={(e) => setExportTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Nom du fichier à exporter"
              required
              autoFocus
            />
          </div>
        )}

        <LabelsLayoutConfigurator exportMode={exportMode} />

        <LabelExportSummary
          selectedCount={selectedCount}
          itemLabel={itemLabel}
          activeFilters={activeFilters}
        />
      </form>
    </BaseModal>
  );
};

export default ExportLabelsModal;
