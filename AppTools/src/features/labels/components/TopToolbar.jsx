// src/features/labels/components/TopToolbar.jsx
import React, { useEffect } from 'react';
import { Undo, Redo, Download, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import useLabelStore from '../store/useLabelStore';
import { exportPdf } from '../utils/exportPdf';
import PropertyPanel from './PropertyPanel'; // 🆕

const TopToolbar = ({ dataSource, onNewLabel, docNode, selectedProduct, onOpenEffects }) => {
  const zoom = useLabelStore((s) => s.zoom);
  const canvasSize = useLabelStore((s) => s.canvasSize);
  const selectedId = useLabelStore((s) => s.selectedId); // 🆕
  const selectedProducts = useLabelStore((s) => s.selectedProducts);
  const currentProductIndex = useLabelStore((s) => s.currentProductIndex); // 🆕
  const goToNextProduct = useLabelStore((s) => s.goToNextProduct); // 🆕
  const goToPreviousProduct = useLabelStore((s) => s.goToPreviousProduct); // 🆕

  const undo = useLabelStore((s) => s.undo);
  const redo = useLabelStore((s) => s.redo);
  const canUndo = useLabelStore((s) => s.canUndo);
  const canRedo = useLabelStore((s) => s.canRedo);

  // Raccourcis clavier: Ctrl/Cmd+Z (undo), Ctrl+Shift+Z ou Ctrl+Y (redo)
  useEffect(() => {
    const onKey = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      // Undo
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }
      // Redo
      if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canUndo, canRedo, undo, redo]);

  const handleExportPdf = () => {
    if (!docNode) {
      console.warn('Aucun document à exporter');
      return;
    }
    const safeZoom = Math.max(zoom || 1, 0.001);
    exportPdf(docNode, {
      width: canvasSize.width,
      height: canvasSize.height,
      fileName: 'document.pdf',
      pixelRatio: Math.max(1, 2 / safeZoom),
    });
  };

  const isMultiProduct = Array.isArray(selectedProducts) && selectedProducts.length > 1;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        {/* 🎯 Actions gauche */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onNewLabel}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            title="Nouveau document"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau</span>
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Undo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
            title="Annuler (Ctrl/Cmd+Z)"
          >
            <Undo className="h-5 w-5" />
          </button>

          {/* Redo */}
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
            title="Rétablir (Ctrl+Shift+Z / Ctrl+Y)"
          >
            <Redo className="h-5 w-5" />
          </button>
        </div>

        {/* 🎨 Zone centrale : PropertyPanel OU titre */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          {selectedId ? (
            // 🆕 PropertyPanel au centre quand un élément est sélectionné
            <PropertyPanel selectedProduct={selectedProduct} onOpenEffects={onOpenEffects} />
          ) : (
            // Titre du document ou navigation produits quand rien n'est sélectionné
            <div className="flex items-center gap-3">
              {isMultiProduct ? (
                <>
                  {/* 🆕 Flèche précédent */}
                  <button
                    onClick={goToPreviousProduct}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Produit précédent"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  </button>

                  {/* 🆕 Info produit actuel */}
                  <div className="text-center min-w-[300px]">
                    {selectedProduct ? (
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedProduct.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedProduct.sku} •{' '}
                          {selectedProduct.price?.toLocaleString('fr-FR') || '0'}€
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Produit {currentProductIndex + 1} / {selectedProducts.length}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Multi-produits ({selectedProducts.length} produits)
                      </div>
                    )}
                  </div>

                  {/* 🆕 Flèche suivant */}
                  <button
                    onClick={goToNextProduct}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Produit suivant"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  </button>
                </>
              ) : selectedProduct ? (
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedProduct.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedProduct.sku} • {selectedProduct.price?.toLocaleString('fr-FR') || '0'}€
                  </div>
                </div>
              ) : (
                <h1 className="text-sm font-medium text-gray-800 dark:text-white">
                  {dataSource === 'blank' ? 'Affiche vierge' : "Création d'affiche"}
                </h1>
              )}
            </div>
          )}
        </div>

        {/* 🎯 Actions droite */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportPdf}
            disabled={!docNode}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={!docNode ? 'Document non disponible' : 'Exporter en PDF'}
          >
            <Download className="h-4 w-4" />
            <span>Exporter</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopToolbar;
