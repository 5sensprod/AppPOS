// src/features/labels/components/templates/SheetPanel.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { Grid3x3, Download, Package } from 'lucide-react';
import useLabelStore from '../../store/useLabelStore';
import { exportPdfSheet } from '../../utils/exportPdfSheet';

/**
 * Constantes hors composant (évite les recréations à chaque rendu)
 */
const SHEET_FORMATS = [
  { id: 'a4-portrait', label: 'A4 Portrait', width: 595, height: 842 },
  { id: 'a4-landscape', label: 'A4 Paysage', width: 842, height: 595 },
];

const GRID_PRESETS = [
  { rows: 2, cols: 2, label: '2×2' },
  { rows: 2, cols: 3, label: '2×3' },
  { rows: 3, cols: 3, label: '3×3' },
  { rows: 4, cols: 4, label: '4×4' },
  { rows: 5, cols: 5, label: '5×5' },
];

const clampInt = (value, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
};

const SheetPanel = ({ docNode }) => {
  // Sélecteurs du store (avec fallback sûr)
  const canvasSize = useLabelStore((state) => state.canvasSize);
  const dataSource = useLabelStore((state) => state.dataSource);
  const selectedProducts = useLabelStore((state) => state.selectedProducts ?? []);

  // États UI
  const [selectedSheet, setSelectedSheet] = useState(SHEET_FORMATS[0]);
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [margin, setMargin] = useState(10);
  const [spacing, setSpacing] = useState(5);

  // Dérivés
  const productCount = Array.isArray(selectedProducts) ? selectedProducts.length : 0;
  const isMultiProduct = dataSource === 'data' && productCount > 1;
  const totalCells = rows * cols;

  // Calcul automatique des dimensions de cellule
  const cellSize = useMemo(() => {
    const availableWidth = selectedSheet.width - 2 * margin - (cols - 1) * spacing;
    const availableHeight = selectedSheet.height - 2 * margin - (rows - 1) * spacing;
    return {
      width: Math.max(0, Math.floor(availableWidth / cols)),
      height: Math.max(0, Math.floor(availableHeight / rows)),
    };
  }, [selectedSheet, rows, cols, margin, spacing]);

  // Calcul du scaling pour adapter le document à la cellule (borné à 1)
  const scale = useMemo(() => {
    const scaleX = cellSize.width / canvasSize.width;
    const scaleY = cellSize.height / canvasSize.height;
    return Math.min(scaleX, scaleY, 1);
  }, [cellSize, canvasSize]);

  // Adapter la grille au nombre de produits (distribution "carrée")
  const handleAdaptGrid = useCallback(() => {
    if (productCount <= 1) return;
    const root = Math.sqrt(productCount);
    const nextRows = Math.ceil(root);
    const nextCols = Math.ceil(productCount / nextRows);
    setRows(nextRows);
    setCols(nextCols);
  }, [productCount]);

  // Export PDF (silencieux si docNode manquant)
  const handleExport = useCallback(() => {
    if (!docNode) return;
    exportPdfSheet(docNode, {
      sheetWidth: selectedSheet.width,
      sheetHeight: selectedSheet.height,
      docWidth: canvasSize.width,
      docHeight: canvasSize.height,
      rows,
      cols,
      margin,
      spacing,
      fileName: `planche-${cols}x${rows}.pdf`,
      products: isMultiProduct ? selectedProducts : null,
    });
  }, [
    docNode,
    selectedSheet,
    canvasSize,
    rows,
    cols,
    margin,
    spacing,
    isMultiProduct,
    selectedProducts,
  ]);

  // Styles du preview (mémoisés)
  const previewStyle = useMemo(
    () => ({
      width: '200px',
      height: selectedSheet.id.includes('portrait') ? '280px' : '200px',
      padding: `${(margin / selectedSheet.width) * 200}px`,
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: `${(spacing / selectedSheet.width) * 200}px`,
    }),
    [selectedSheet, margin, cols, rows, spacing]
  );

  return (
    <div className="p-4 space-y-4">
      {/* Info produits multiples */}
      {isMultiProduct && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
          <div className="flex items-start gap-2">
            <Package className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-green-800 dark:text-green-300 mb-1">
                Mode multi-produits
              </div>
              <div className="text-sm text-green-700 dark:text-green-400">
                {productCount} produits sélectionnés
              </div>
              {productCount > totalCells && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  ⚠️ {productCount - totalCells} produit(s) ne seront pas affichés
                </div>
              )}
              <button
                onClick={handleAdaptGrid}
                className="mt-2 text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                Adapter la grille ({productCount} cellules)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Format de planche */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Format de planche
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {SHEET_FORMATS.map((format) => (
            <button
              key={format.id}
              onClick={() => setSelectedSheet(format)}
              className={`p-3 border rounded-lg transition-all ${
                selectedSheet.id === format.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="text-sm font-medium">{format.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {format.width} × {format.height} pt
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Presets de grille */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Disposition rapide
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {GRID_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setRows(preset.rows);
                setCols(preset.cols);
              }}
              className={`p-2 border rounded text-sm font-medium transition-all ${
                rows === preset.rows && cols === preset.cols
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Configuration manuelle */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Configuration</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Lignes</label>
            <input
              type="number"
              value={rows}
              onChange={(e) => setRows(clampInt(e.target.value, { min: 1, max: 10 }))}
              min="1"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Colonnes</label>
            <input
              type="number"
              value={cols}
              onChange={(e) => setCols(clampInt(e.target.value, { min: 1, max: 10 }))}
              min="1"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
              Marge (pt)
            </label>
            <input
              type="number"
              value={margin}
              onChange={(e) => setMargin(clampInt(e.target.value, { min: 0, max: 50 }))}
              min="0"
              max="50"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
              Espacement (pt)
            </label>
            <input
              type="number"
              value={spacing}
              onChange={(e) => setSpacing(clampInt(e.target.value, { min: 0, max: 50 }))}
              min="0"
              max="50"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Preview de la grille */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <Grid3x3 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Aperçu de la grille
          </span>
        </div>
        <div
          className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 mx-auto"
          style={previewStyle}
        >
          {Array.from({ length: totalCells }).map((_, i) => {
            const hasProduct = isMultiProduct && i < productCount;
            return (
              <div
                key={i}
                className={`border rounded ${
                  hasProduct
                    ? 'border-green-400 bg-green-100 dark:border-green-600 dark:bg-green-900/30'
                    : 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Info cellule */}
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
        <div className="text-xs space-y-1">
          <div className="font-medium text-amber-900 dark:text-amber-300">
            Taille de cellule : {cellSize.width} × {cellSize.height} pt
          </div>
          <div className="text-amber-700 dark:text-amber-400">
            Document : {canvasSize.width} × {canvasSize.height} px
          </div>
          <div className="text-amber-700 dark:text-amber-400">
            Échelle appliquée : {(scale * 100).toFixed(1)}%
          </div>
          <div className="text-amber-700 dark:text-amber-400">
            Total : {totalCells} cellule{totalCells > 1 ? 's' : ''}
            {isMultiProduct && ` (${Math.min(productCount, totalCells)} produits affichés)`}
          </div>
        </div>
      </div>

      {/* Bouton export */}
      <button
        onClick={handleExport}
        disabled={!docNode}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        <Download className="h-4 w-4" />
        Exporter la planche PDF
      </button>
    </div>
  );
};

export default React.memo(SheetPanel);
