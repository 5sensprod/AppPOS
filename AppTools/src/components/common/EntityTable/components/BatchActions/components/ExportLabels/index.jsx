// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\index.jsx
import React, { useEffect, useState } from 'react';
import { Tags, FileText, Printer, X } from 'lucide-react';
import FabricLabelCanvas from './components/FabricLabelCanvas';
import LabelsConfigSidebar from './components/LabelsConfigSidebar';
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
    labelStyle,
    initialize,
    reset,
    setExportTitle,
    setLoading,
    extractLabelData,
    buildLabelLayout,
    updateStyle,
  } = useLabelExportStore();

  const [exportMode, setExportMode] = useState('print');
  const labelData = extractLabelData();
  const sampleLabel = labelData.length > 0 ? labelData[0] : null;

  // Déterminer le mode effectif
  const isA4Mode = currentLayout?.supportType !== 'rouleau';
  const effectiveExportMode = isA4Mode ? 'pdf' : exportMode;

  useEffect(() => {
    if (isOpen) {
      initialize(selectedItems, productsData, activeFilters, entityNamePlural);
    }
  }, [isOpen, selectedItems, productsData, activeFilters, entityNamePlural, initialize]);

  useEffect(() => {
    if (!isOpen) {
      reset('cells');
      reset('print');
      setExportMode('print');
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (isA4Mode && exportMode !== 'pdf') {
      setExportMode('pdf');
    }
  }, [currentLayout?.supportType, isA4Mode, exportMode]);

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
      // 🆕 Construire la configuration avec les positions personnalisées
      const labelLayout = buildLabelLayout();

      // ✅ S'assurer que customPositions est bien dans le style
      if (labelStyle.customPositions && Object.keys(labelStyle.customPositions).length > 0) {
        if (!labelLayout.style) {
          labelLayout.style = {};
        }
        labelLayout.style.customPositions = labelStyle.customPositions;

        console.log("📍 Positions personnalisées incluses dans l'export:", {
          count: Object.keys(labelStyle.customPositions).length,
          positions: labelStyle.customPositions,
        });
      }

      const exportConfig = {
        selectedItems,
        exportType: 'labels',
        title:
          effectiveExportMode === 'pdf'
            ? exportTitle.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_')
            : undefined,
        format: effectiveExportMode,
        labelData: extractLabelData(),
        labelLayout: labelLayout, // ✅ Maintenant avec customPositions
      };

      console.log('🚀 Configuration export finale:', {
        hasCustomPositions: !!exportConfig.labelLayout.style?.customPositions,
        positionsCount: Object.keys(exportConfig.labelLayout.style?.customPositions || {}).length,
      });

      await onExport(exportConfig);
      handleClose();
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      setLoading(false);
    }
  };

  const handlePositionChange = (positionData) => {
    const newPositions = {
      ...(labelStyle.customPositions || {}),
      [positionData.objectType]: positionData.position,
    };
    updateStyle({ customPositions: newPositions });

    console.log('📌 Position mise à jour:', {
      objectType: positionData.objectType,
      position: positionData.position,
      totalPositions: Object.keys(newPositions).length,
    });
  };

  if (!isOpen) return null;

  const selectedCount = selectedItems.length;
  const itemLabel = selectedCount === 1 ? entityName : entityNamePlural;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-black/50 backdrop-blur-sm">
      <div className="flex h-full">
        {/* SIDEBAR GAUCHE - Configuration */}
        <div className="w-[380px] bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto flex-shrink-0">
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Tags className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Configuration étiquettes
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedCount} {itemLabel} sélectionné{selectedCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Mode indicator */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                Mode: {effectiveExportMode === 'pdf' ? 'PDF' : 'Impression'}
              </span>
            </div>
          </div>

          {/* Champ titre PDF */}
          {effectiveExportMode === 'pdf' && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-600">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titre du document
              </label>
              <input
                type="text"
                value={exportTitle}
                onChange={(e) => setExportTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                placeholder="Nom du fichier à exporter"
              />
            </div>
          )}

          {/* Sidebar de configuration */}
          <LabelsConfigSidebar exportMode={effectiveExportMode} />
        </div>

        {/* ZONE CANVAS PRINCIPALE - Toujours visible */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
          {/* Toolbar supérieure */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Aperçu en temps réel
                </h3>
                {sampleLabel && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {sampleLabel.name}
                  </span>
                )}
              </div>

              {/* Toggle PDF/Print pour rouleau */}
              {!isA4Mode && (
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setExportMode('pdf')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center transition-colors ${
                      effectiveExportMode === 'pdf'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportMode('print')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center transition-colors ${
                      effectiveExportMode === 'print'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    Impression
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Canvas container - scrollable */}
          <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
            {sampleLabel ? (
              <FabricLabelCanvas
                label={sampleLabel}
                layout={currentLayout}
                style={labelStyle}
                onPositionChange={handlePositionChange}
                onElementSelect={() => {}} // Optionnel : scroll vers section
              />
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Tags className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucune étiquette à prévisualiser</p>
              </div>
            )}
          </div>

          {/* Footer avec actions */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
            <form onSubmit={handleSubmit} className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Annuler
              </button>

              {effectiveExportMode === 'print' && currentLayout?.supportType === 'rouleau' ? (
                <DirectPrintButton onClose={handleClose} />
              ) : (
                <button
                  type="submit"
                  disabled={loading || selectedItems.length === 0}
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {effectiveExportMode === 'pdf' ? 'Génération PDF...' : 'Impression...'}
                    </>
                  ) : (
                    <>
                      {effectiveExportMode === 'pdf' ? (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportLabelsModal;
