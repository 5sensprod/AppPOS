// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportModal\index.js
import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import BaseModal from '../../../../../ui/BaseModal';
import ExportTypeSelector from './components/ExportTypeSelector';
import ExportFormatSelector from './components/ExportFormatSelector';
import ExportOrientationSelector from './components/ExportOrientationSelector';
import TableOptionsPanel from './components/TableOptionsPanel';
import LabelsLayoutConfigurator from './components/LabelsLayoutConfigurator';
import ExportSummary from './components/ExportSummary';
import { useExportModal } from './hooks/useExportModal';
import { ENTITY_CONFIG } from '../../../../../../../features/products/constants';

const ExportModal = ({
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
    exportType,
    setExportType,
    exportFormat,
    setExportFormat,
    orientation,
    setOrientation,
    exportTitle,
    setExportTitle,
    loading,
    setLoading,
    selectedColumns,
    setSelectedColumns,
    includeId,
    setIncludeId,
    useCustomColumn,
    setUseCustomColumn,
    customColumnTitle,
    setCustomColumnTitle,
    labelLayout,
    setLabelLayout,
    extractLabelData,
    resetForm,
    generateExportTitle,
  } = useExportModal({
    isOpen,
    activeFilters,
    entityNamePlural,
    selectedItems,
    productsData,
  });

  useEffect(() => {
    if (isOpen) {
      generateExportTitle();
    }
  }, [isOpen, generateExportTitle]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (exportType === 'table' && !selectedColumns.length) {
      alert('Veuillez sélectionner au moins une colonne à exporter');
      return;
    }

    if (exportType === 'labels' && selectedItems.length === 0) {
      alert('Veuillez sélectionner au moins un produit pour les étiquettes');
      return;
    }

    setLoading(true);
    try {
      const exportConfig = {
        selectedItems,
        exportType,
        title: exportTitle.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_'),
        format: exportFormat,
      };

      if (exportType === 'table') {
        exportConfig.orientation = orientation; // ✅ ORIENTATION POUR TABLEAUX
        const cols = includeId ? ['_id', ...selectedColumns] : selectedColumns;
        exportConfig.selectedColumns = cols;
        exportConfig.customColumn = useCustomColumn ? { title: customColumnTitle } : null;
      } else if (exportType === 'labels') {
        // ✅ PAS D'ORIENTATION POUR ÉTIQUETTES (toujours portrait)
        exportConfig.labelData = extractLabelData();
        exportConfig.labelLayout = labelLayout;
      }

      await onExport(exportConfig);
      resetForm();
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      setLoading(false);
    }
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
      <button
        type="submit"
        disabled={loading || (exportType === 'table' && !selectedColumns.length)}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center"
        form="export-form"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Génération...
          </>
        ) : (
          <>
            <span className="ml-2">
              Générer {exportType === 'labels' ? 'Étiquettes' : 'Tableau'}{' '}
              {exportFormat.toUpperCase()}
            </span>
          </>
        )}
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Configurer l'export ${exportType === 'labels' ? "d'étiquettes" : 'de tableau'}`}
      icon={Download}
      footer={footer}
      maxWidth="max-w-2xl"
    >
      <form id="export-form" onSubmit={handleSubmit}>
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Nom du fichier à exporter"
            required
            autoFocus
          />
        </div>

        <ExportTypeSelector exportType={exportType} onExportTypeChange={setExportType} />

        {exportType === 'table' && (
          <>
            <ExportFormatSelector
              exportFormat={exportFormat}
              onFormatChange={setExportFormat}
              exportType={exportType}
            />

            {/* ✅ ORIENTATION UNIQUEMENT POUR LES TABLEAUX */}
            {exportFormat === 'pdf' && (
              <ExportOrientationSelector
                orientation={orientation}
                onOrientationChange={setOrientation}
                exportType={exportType}
              />
            )}
          </>
        )}

        {exportType === 'table' && (
          <TableOptionsPanel
            selectedColumns={selectedColumns}
            setSelectedColumns={setSelectedColumns}
            includeId={includeId}
            setIncludeId={setIncludeId}
            useCustomColumn={useCustomColumn}
            setUseCustomColumn={setUseCustomColumn}
            customColumnTitle={customColumnTitle}
            setCustomColumnTitle={setCustomColumnTitle}
            availableColumns={ENTITY_CONFIG.columns
              .filter((col) => col.key !== 'image' && col.key !== 'actions')
              .map((col) => ({ key: col.key, label: col.label }))}
          />
        )}

        {exportType === 'labels' && selectedItems.length > 0 && (
          <LabelsLayoutConfigurator
            onLayoutChange={setLabelLayout}
            labelData={extractLabelData()}
          />
        )}

        <ExportSummary
          exportType={exportType}
          selectedCount={selectedCount}
          itemLabel={itemLabel}
          exportFormat={exportFormat}
          selectedColumns={selectedColumns}
          includeId={includeId}
          useCustomColumn={useCustomColumn}
          customColumnTitle={customColumnTitle}
          orientation={orientation}
          activeFilters={activeFilters}
        />
      </form>
    </BaseModal>
  );
};

export default ExportModal;
