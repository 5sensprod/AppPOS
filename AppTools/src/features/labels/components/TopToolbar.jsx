// src/features/labels/components/TopToolbar.jsx
import React from 'react';
import { Undo, Redo, Save, Download, Printer, Trash2, Plus, Package } from 'lucide-react';
import useLabelStore from '../store/useLabelStore';
import { exportPdf } from '../utils/exportPdf';

const TopToolbar = ({ dataSource, onNewLabel, docNode }) => {
  const zoom = useLabelStore((s) => s.zoom);
  const canvasSize = useLabelStore((s) => s.canvasSize);
  const selectedProduct = useLabelStore((s) => s.selectedProduct);
  const selectedProducts = useLabelStore((s) => s.selectedProducts);

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
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <Undo className="h-5 w-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
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
  );
};

export default TopToolbar;
