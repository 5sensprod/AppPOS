import React, { useEffect, useState, useRef } from 'react';
import {
  Undo,
  Redo,
  Save,
  Download,
  Printer,
  Trash2,
  Plus,
  Package,
  FolderOpen,
} from 'lucide-react';
import useLabelStore from '../store/useLabelStore';
import { exportPdf } from '../utils/exportPdf';
import TemplateManager from './templates/TemplateManager';

const TopToolbar = ({ dataSource, onNewLabel, docNode }) => {
  const zoom = useLabelStore((s) => s.zoom);
  const canvasSize = useLabelStore((s) => s.canvasSize);
  const selectedProduct = useLabelStore((s) => s.selectedProduct);
  const selectedProducts = useLabelStore((s) => s.selectedProducts);

  const undo = useLabelStore((s) => s.undo);
  const redo = useLabelStore((s) => s.redo);
  const canUndo = useLabelStore((s) => s.canUndo);
  const canRedo = useLabelStore((s) => s.canRedo);

  // 🆕 État pour afficher le gestionnaire de templates
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const stageRef = useRef(null);

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
  const displayProduct =
    selectedProduct ||
    (Array.isArray(selectedProducts) && selectedProducts.length > 0 ? selectedProducts[0] : null);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Actions gauche */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNewLabel}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau</span>
            </button>

            {/* 🆕 Bouton Templates */}
            <button
              onClick={() => setShowTemplateManager(!showTemplateManager)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
              title="Gérer mes templates"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Templates</span>
            </button>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

            {/* Undo */}
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
              title="Annuler (Ctrl/Cmd+Z)"
            >
              <Undo className="h-5 w-5" />
            </button>

            {/* Redo */}
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
              title="Rétablir (Ctrl+Shift+Z / Ctrl+Y)"
            >
              <Redo className="h-5 w-5" />
            </button>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>

          {/* Titre / Info produit */}
          <div className="flex items-center gap-3 min-w-0">
            {isMultiProduct ? (
              <div className="flex items-center gap-3 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    Multi-produits
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedProducts.length} produits sélectionnés
                  </div>
                </div>
              </div>
            ) : displayProduct ? (
              <div className="flex items-center gap-3 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {displayProduct.name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {displayProduct.sku} • {displayProduct.price?.toLocaleString('fr-FR') || '0'}€
                  </div>
                </div>
              </div>
            ) : (
              <h1 className="text-lg font-semibold text-gray-800 dark:text-white truncate">
                {dataSource === 'blank' ? 'Affiche vierge' : "Création d'affiche"}
              </h1>
            )}
          </div>

          {/* Actions droite */}
          <div className="flex items-center gap-2 shrink-0">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
              <Save className="h-4 w-4" />
              <span>Enregistrer</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={!docNode}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title={!docNode ? 'Document non disponible' : 'Exporter en PDF'}
            >
              <Download className="h-4 w-4" />
              <span>Exporter</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded">
              <Printer className="h-4 w-4" />
              <span>Imprimer</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🆕 Modal Template Manager (overlay plein écran) */}
      {showTemplateManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <TemplateManager stageRef={stageRef} onClose={() => setShowTemplateManager(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default TopToolbar;
