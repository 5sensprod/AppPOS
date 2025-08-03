//AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\index.jsx
import React, { useEffect } from 'react';
import { Tags } from 'lucide-react';
import BaseModal from '../../../../../ui/BaseModal';
import LabelsLayoutConfigurator from './components/LabelsLayoutConfigurator';
import LabelExportSummary from './components/LabelExportSummary';
import { useLabelExport } from './hooks/useLabelExport';

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
  const hookResult = useLabelExport({
    isOpen,
    activeFilters,
    entityNamePlural,
    selectedItems,
    productsData,
  });

  // ✅ GUARD : Vérifier que le hook est prêt
  if (!hookResult || !hookResult.labelStyle || !hookResult.currentLayout) {
    return null; // ou un loading
  }

  const {
    exportTitle,
    setExportTitle,
    loading,
    setLoading,
    extractLabelData,
    buildLabelLayout,
    resetForm,
    clearLocalStorage, // 🆕 Nouvelle fonction pour nettoyer manuellement

    // Style et layout avec fallbacks
    labelStyle,
    handleStyleChange,
    currentLayout,
    handleLayoutChange,
    handleSupportTypeChange,
    supportTypes,
    calculateGridDimensions,
    enableCellSelection,
    setEnableCellSelection,
    disabledCells,
    setDisabledCells,

    // Presets
    savedStylePresets = [],
    saveStylePreset,
    loadStylePreset,
    deleteStylePreset,
    savedLayoutPresets = [],
    saveLayoutPreset,
    loadLayoutPreset,
    deleteLayoutPreset,
  } = hookResult;

  // 🔧 MODIFIÉ: Ne plus appeler resetForm lors de la fermeture/ouverture
  useEffect(() => {
    if (!isOpen) {
      // ❌ NE PAS appeler resetForm ici car ça efface localStorage
      setLoading(false); // Juste arrêter le loading si nécessaire
    }
  }, [isOpen, setLoading]);

  // 🔧 MODIFIÉ: handleClose ne fait plus de reset
  const handleClose = () => {
    setLoading(false); // Arrêter le loading
    onClose(); // Fermer le modal
    // ❌ NE PAS appeler resetForm() ici
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
        title: exportTitle.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_'),
        format: 'pdf',
        labelData: extractLabelData(),
        labelLayout: buildLabelLayout(),
      };

      await onExport(exportConfig);

      // ✅ Après export réussi, fermer sans reset
      handleClose();
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      setLoading(false);
    }
  };

  // 🆕 NOUVEAU: Fonction pour réinitialiser complètement
  const handleReset = () => {
    resetForm(); // Reset du state
    clearLocalStorage(); // Nettoyage localStorage
    console.log('🔄 Reset complet effectué');
  };

  const selectedCount = selectedItems.length;
  const itemLabel = selectedCount === 1 ? entityName : entityNamePlural;

  const footer = (
    <>
      <button
        type="button"
        onClick={handleClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
      >
        Annuler
      </button>

      {/* 🆕 NOUVEAU: Bouton reset manuel */}
      <button
        type="button"
        onClick={handleReset}
        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600"
        title="Réinitialiser tous les réglages"
      >
        🔄 Reset
      </button>

      <button
        type="submit"
        disabled={loading || selectedItems.length === 0}
        className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center"
        form="export-labels-form"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Génération...
          </>
        ) : (
          <>
            <Tags className="h-4 w-4 mr-2" />
            Générer Étiquettes PDF
          </>
        )}
      </button>
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
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            <span className="font-semibold">{selectedCount}</span> {itemLabel} sélectionné
            {selectedCount > 1 ? 's' : ''}
            {activeFilters.length > 0 && (
              <span className="block mt-1">
                <span className="font-semibold">{activeFilters.length}</span> filtre
                {activeFilters.length > 1 ? 's' : ''} appliqué
                {activeFilters.length > 1 ? 's' : ''}
              </span>
            )}
          </p>

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

        {/* ✅ GUARD sur LabelsLayoutConfigurator */}
        {labelStyle && currentLayout && calculateGridDimensions && (
          <LabelsLayoutConfigurator
            labelData={extractLabelData()}
            labelStyle={labelStyle}
            onStyleChange={handleStyleChange}
            currentLayout={currentLayout}
            onLayoutChange={handleLayoutChange}
            onSupportTypeChange={handleSupportTypeChange}
            supportTypes={supportTypes}
            calculateGridDimensions={calculateGridDimensions}
            enableCellSelection={enableCellSelection}
            setEnableCellSelection={setEnableCellSelection}
            disabledCells={disabledCells}
            setDisabledCells={setDisabledCells}
            savedStylePresets={savedStylePresets}
            onSaveStylePreset={saveStylePreset}
            onLoadStylePreset={loadStylePreset}
            onDeleteStylePreset={deleteStylePreset}
            savedLayoutPresets={savedLayoutPresets}
            onSaveLayoutPreset={saveLayoutPreset}
            onLoadLayoutPreset={loadLayoutPreset}
            onDeleteLayoutPreset={deleteLayoutPreset}
            onResetForm={handleReset} // 🔧 Utiliser le nouveau reset complet
          />
        )}

        <LabelExportSummary
          selectedCount={selectedCount}
          itemLabel={itemLabel}
          activeFilters={activeFilters}
          labelStyle={labelStyle}
          currentLayout={currentLayout}
        />
      </form>
    </BaseModal>
  );
};

export default ExportLabelsModal;
