// src/components/reports/export/ExportModal.jsx

import React from 'react';
import { X, Download } from 'lucide-react';
import ReportTypeSelector from './ReportTypeSelector';
import DetailedReportOptions from './DetailedReportOptions';
import GeneralOptions from './GeneralOptions';
import { useExportOptions } from '../../../hooks/useExportOptions';
import { useCategoryTree } from '../../../hooks/useCategoryTree';

/**
 * Composant pour l'aperçu de la sélection
 */
const SelectionSummary = ({ exportOptions, getSelectedProductsCount }) => {
  if (!exportOptions.groupByCategory || exportOptions.selectedCategories.length === 0) {
    return null;
  }

  return (
    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
      <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
        Aperçu de la sélection
      </h4>
      <div className="text-sm text-green-800 dark:text-green-200">
        <div className="mb-2">
          <strong>{exportOptions.selectedCategories.length}</strong> catégorie(s) sélectionnée(s)
        </div>
        <div className="text-xs">
          Total estimé:{' '}
          <strong>{getSelectedProductsCount(exportOptions.selectedCategories)} produits</strong> en
          stock
        </div>
      </div>
    </div>
  );
};

/**
 * Composant pour les actions de la modale (footer)
 */
const ModalActions = ({ onClose, onExport, isExporting }) => (
  <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-xl">
    <div className="flex justify-end gap-3">
      <button
        onClick={onClose}
        disabled={isExporting}
        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
      >
        Annuler
      </button>
      <button
        onClick={onExport}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Export...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Exporter PDF
          </>
        )}
      </button>
    </div>
  </div>
);

/**
 * Composant principal de la modale d'export
 */
const ExportModal = ({ onClose, onExport, isExporting }) => {
  const {
    exportOptions,
    categorySelectorHeight,
    isResizing,
    setReportType,
    setExportOptions,
    setCategorySelectorHeight,
    handleResizeStart,
    prepareApiOptions,
  } = useExportOptions();

  const { getSelectedProductsCount, fetchCategoriesWithStock } = useCategoryTree();

  /**
   * Gère l'export PDF
   */
  const handleExportClick = async () => {
    try {
      // Préparer les informations de l'entreprise
      const companyInfo = {
        name: 'AXE Musique',
        address: '4 rue Lochet 51000 Châlons en Champagne',
        siret: '418 647 574 00031',
      };

      // Préparer les options pour l'API
      const apiOptions = prepareApiOptions(companyInfo);

      console.log("📤 Options envoyées à l'API:", apiOptions);
      console.log('🏷️ groupByCategory:', exportOptions.groupByCategory);
      console.log('📂 selectedCategories:', exportOptions.selectedCategories);

      // Appeler la fonction d'export
      await onExport(apiOptions);
    } catch (error) {
      console.error('❌ Erreur export PDF:', error);
      alert("Erreur lors de l'export PDF");
    }
  };

  /**
   * Gère le changement de type de rapport
   */
  const handleReportTypeChange = (newType) => {
    setReportType(newType);
  };

  /**
   * Gère le chargement de l'arbre de catégories
   */
  const handleCategoryTreeLoad = () => {
    fetchCategoriesWithStock();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Options d'Export PDF
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              disabled={isExporting}
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Sélecteur de type de rapport */}
          <ReportTypeSelector
            reportType={exportOptions.reportType}
            onReportTypeChange={handleReportTypeChange}
          />

          {/* Options spécifiques au rapport détaillé */}
          {exportOptions.reportType === 'detailed' && (
            <DetailedReportOptions
              exportOptions={exportOptions}
              setExportOptions={setExportOptions}
              categorySelectorHeight={categorySelectorHeight}
              setCategorySelectorHeight={setCategorySelectorHeight}
              isResizing={isResizing}
              handleResizeStart={handleResizeStart}
              onCategoryTreeLoad={handleCategoryTreeLoad}
            />
          )}

          {/* Options générales */}
          <GeneralOptions exportOptions={exportOptions} setExportOptions={setExportOptions} />

          {/* Aperçu de la sélection */}
          <SelectionSummary
            exportOptions={exportOptions}
            getSelectedProductsCount={getSelectedProductsCount}
          />
        </div>

        {/* Actions (footer) */}
        <ModalActions onClose={onClose} onExport={handleExportClick} isExporting={isExporting} />
      </div>
    </div>
  );
};

export default ExportModal;
