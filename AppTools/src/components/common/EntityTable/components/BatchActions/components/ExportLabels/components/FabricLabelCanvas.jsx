//AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\FabricLabelCanvas.jsx
import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import fabricExportService from '@services/fabricExportService';

const FabricLabelCanvas = ({ label, layout, style, onPositionChange }) => {
  const canvasRef = useRef();
  const fabricCanvasRef = useRef();
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100); // Zoom de 100% à 200%

  // Cleanup
  const cleanupCanvas = () => {
    if (fabricCanvasRef.current) {
      try {
        fabricCanvasRef.current.dispose();
      } catch (err) {
        console.warn('Erreur dispose canvas:', err);
      } finally {
        fabricCanvasRef.current = null;
      }
    }
  };

  // Handlers de zoom avec Fabric.js natif + redimensionnement canvas
  const handleZoomChange = (newZoom) => {
    const clampedZoom = Math.max(100, Math.min(200, newZoom));
    setZoomLevel(clampedZoom);

    if (fabricCanvasRef.current) {
      const zoomFactor = clampedZoom / 100;

      // Appliquer le zoom aux éléments
      fabricCanvasRef.current.setZoom(zoomFactor);

      // Redimensionner le canvas HTML pour qu'il grandisse visuellement
      const baseWidth = window.basePrintableWidth || layout.width * mmToPx;
      const baseHeight = window.basePrintableHeight || layout.height * mmToPx;
      const newWidth = baseWidth * zoomFactor;
      const newHeight = baseHeight * zoomFactor;

      fabricCanvasRef.current.setWidth(newWidth);
      fabricCanvasRef.current.setHeight(newHeight);

      fabricCanvasRef.current.renderAll();
    }
  };

  const handleZoomIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleZoomChange(zoomLevel + 10);
  };

  const handleZoomOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleZoomChange(zoomLevel - 10);
  };

  const handleZoomReset = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleZoomChange(100);
  };

  // useEffect principal pour le rendu
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const canvasEl = canvasRef.current;
      if (!canvasEl || !label) {
        setError('Canvas ou label manquant');
        return;
      }

      setError(null);

      try {
        cleanupCanvas();

        const fabricCanvas = await fabricExportService.renderLabelPreview(
          canvasEl,
          label,
          layout,
          style,
          {
            highRes: false,
            context: 'preview',
          }
        );

        fabricCanvasRef.current = fabricCanvas;

        // Stocker les dimensions de base pour le zoom
        window.basePrintableWidth = layout.width * mmToPx;
        window.basePrintableHeight = layout.height * mmToPx;

        // Configuration objets mobiles
        fabricCanvas.getObjects().forEach((obj) => {
          let objectType = 'unknown';

          if (obj.type === 'text') {
            const text = obj.text;
            if (text === label.name) {
              objectType = 'name';
            } else if (text.includes('€') || text.includes(label.price)) {
              objectType = 'price';
            } else if (text === label.sku) {
              // 🆕 AJOUTER
              objectType = 'sku';
            } else if (text === label.brand) {
              // 🆕 AJOUTER
              objectType = 'brand';
            } else if (text === label.supplier) {
              // 🆕 AJOUTER
              objectType = 'supplier';
            } else if (text === (style.wooQRText || 'Voir en ligne')) {
              objectType = 'wooQRText';
            } else {
              objectType = 'barcodeText';
            }
          } else if (obj.type === 'image') {
            // Distinguer barcode normal et QR WooCommerce
            if (obj.wooQRCode) {
              objectType = 'wooQR'; // 🆕 QR Code WooCommerce
            } else {
              objectType = 'barcode';
            }
          }

          obj.set({
            selectable: true,
            moveable: true,
            hasControls: false,
            hasBorders: true,
            borderColor: '#0084ff',
            cornerColor: '#0084ff',
          });

          obj.objectType = objectType;
        });

        // Appliquer le zoom actuel au nouveau canvas
        if (zoomLevel !== 100) {
          const zoomFactor = zoomLevel / 100;
          fabricCanvas.setZoom(zoomFactor);

          // Ajuster les dimensions du canvas HTML pour correspondre au zoom
          const newWidth = window.basePrintableWidth * zoomFactor;
          const newHeight = window.basePrintableHeight * zoomFactor;
          fabricCanvas.setWidth(newWidth);
          fabricCanvas.setHeight(newHeight);
        }

        // Gestion modifications
        let modificationTimeout;
        fabricCanvas.on('object:modified', (e) => {
          clearTimeout(modificationTimeout);
          modificationTimeout = setTimeout(() => {
            const obj = e.target;
            if (obj && obj.objectType && onPositionChange) {
              // Les coordonnées sont automatiquement corrigées par Fabric.js
              // même avec le zoom appliqué
              const mmToPx = 3.779527559;
              const leftMm = obj.left / mmToPx;
              const topMm = obj.top / mmToPx;

              onPositionChange({
                objectType: obj.objectType,
                position: {
                  x: leftMm,
                  y: topMm,
                  centerX: leftMm,
                },
              });
            }
          }, 100);
        });

        fabricCanvas.selection = true;
        fabricCanvas.renderAll();
      } catch (err) {
        console.error('Erreur rendu aperçu étiquette:', err);
        setError(`Erreur de rendu: ${err.message}`);
      }
    }, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    label?.id,
    label?.name,
    label?.price,
    label?.barcode,
    label?.websiteUrl,
    layout.width,
    layout.height,
    layout.supportType,
    style.showName,
    style.showPrice,
    style.showBarcode,
    style.showBorder,
    style.nameSize,
    style.nameWeight,
    style.nameFontFamily,
    style.priceSize,
    style.priceFontFamily,
    style.priceWeight,
    style.fontFamily,
    style.barcodeHeight,
    style.barcodeWidth,
    style.showBarcodeText,
    style.barcodeTextSize,
    style.qrCodeSize,
    style.barcodeType,
    style.showWooQR,
    style.wooQRSize,
    style.showWooQRText,
    style.wooQRTextSize,
    style.wooQRText,
    style.showSku,
    style.showBrand,
    style.showSupplier,
    style.skuSize,
    style.brandSize,
    style.supplierSize,
    JSON.stringify(style.customPositions),
    JSON.stringify(style.colors),
  ]);

  // Cleanup au démontage
  useEffect(() => {
    return cleanupCanvas;
  }, []);

  // Calculs dimensions avec zoom
  const mmToPx = 3.779527559;
  const isRollMode = layout.supportType === 'rouleau';
  const physicalRollWidth = isRollMode ? layout.rouleau?.width || 58 : layout.width;
  const physicalRollHeight = layout.height;

  // Facteur de zoom
  const zoomFactor = zoomLevel / 100;

  // Dimensions de base
  const baseRollBgWidth = physicalRollWidth * mmToPx;
  const baseRollBgHeight = physicalRollHeight * mmToPx;
  const basePrintableWidth = layout.width * mmToPx;
  const basePrintableHeight = layout.height * mmToPx;

  // Dimensions avec zoom appliqué
  const rollBgWidth = baseRollBgWidth * zoomFactor;
  const rollBgHeight = baseRollBgHeight * zoomFactor;
  const printableWidth = basePrintableWidth * zoomFactor;
  const printableHeight = basePrintableHeight * zoomFactor;

  // Calcul de l'offset pour centrer la zone imprimable
  const offsetX = isRollMode ? (rollBgWidth - printableWidth) / 2 : 0;

  // Affichage d'erreur
  if (error) {
    const errorWidth = isRollMode ? rollBgWidth : printableWidth;
    const errorHeight = isRollMode ? rollBgHeight : printableHeight;

    return (
      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
        {/* Contrôles de zoom même en cas d'erreur */}
        <div className="mb-3 flex items-center justify-center gap-1 bg-gray-200 dark:bg-gray-600 p-2 rounded">
          <button
            onClick={handleZoomOut}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={zoomLevel <= 100}
            className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Réduire"
          >
            <ZoomOut className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="text-xs font-mono text-gray-700 dark:text-gray-300 min-w-[35px] text-center px-1">
            {zoomLevel}%
          </div>

          <button
            onClick={handleZoomIn}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={zoomLevel >= 200}
            className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Agrandir"
          >
            <ZoomIn className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={handleZoomReset}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-500 ml-1"
            title="Taille réelle"
          >
            <RotateCcw className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div
          className="flex items-center justify-center bg-red-50 border border-red-200 rounded"
          style={{
            width: `${errorWidth}px`,
            height: `${errorHeight}px`,
            minWidth: '200px',
            minHeight: '100px',
          }}
        >
          <div className="text-red-600 text-xs text-center p-2">
            <div className="font-medium">❌ Erreur d'aperçu</div>
            <div className="mt-1">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
      {/* CONTRÔLES DE ZOOM compacts dans la zone grisée */}
      <div className="mb-3 flex items-center justify-center gap-1 bg-gray-200 dark:bg-gray-600 p-2 rounded">
        <button
          onClick={handleZoomOut}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={zoomLevel <= 100}
          className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Réduire (Ctrl + -)"
        >
          <ZoomOut className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
        </button>

        <div className="text-xs font-mono text-gray-700 dark:text-gray-300 min-w-[35px] text-center px-1">
          {zoomLevel}%
        </div>

        <button
          onClick={handleZoomIn}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={zoomLevel >= 200}
          className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Agrandir (Ctrl + +)"
        >
          <ZoomIn className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
        </button>

        <button
          onClick={handleZoomReset}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-500 ml-1 transition-colors"
          title="Taille réelle (100%)"
        >
          <RotateCcw className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* CONTENEUR avec dimensions adaptatives au zoom */}
      <div className="relative overflow-visible">
        <div
          className="relative mx-auto"
          style={{
            width: `${isRollMode ? rollBgWidth : printableWidth}px`,
            height: `${isRollMode ? rollBgHeight : printableHeight}px`,
            // Suppression de minHeight qui créait l'espace gris inutile
            border: isRollMode ? '1px solid #e5e7eb' : 'none',
            borderRadius: isRollMode ? '4px' : '0',
            backgroundColor: isRollMode ? '#f9fafb' : 'transparent',
          }}
        >
          {/* CANVAS Fabric.js avec zoom natif */}
          <canvas
            ref={canvasRef}
            className="absolute"
            style={{
              // Le canvas va maintenant prendre ses vraies dimensions zoomées
              backgroundColor: 'transparent',
              top: 0,
              left: isRollMode ? `${offsetX}px` : 0,
              zIndex: 10,
            }}
          />
        </div>
      </div>

      {/* INFORMATIONS EN BAS */}
      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-center">
        <span className="font-medium">{label?.name || 'Aperçu étiquette'}</span>
        <span className="mx-2">•</span>
        <span>
          {isRollMode ? (
            <>
              Imprimable: {layout.width}×{layout.height}mm
              <span className="mx-1 opacity-50">|</span>
              Rouleau: {physicalRollWidth}mm
            </>
          ) : (
            `${layout.width}×${layout.height}mm`
          )}
        </span>
        {zoomLevel !== 100 && (
          <>
            <span className="mx-2">•</span>
            <span className="text-blue-600 dark:text-blue-400 font-medium">Zoom: {zoomLevel}%</span>
          </>
        )}
      </div>
    </div>
  );
};

export default FabricLabelCanvas;
