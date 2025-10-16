// FabricLabelCanvas.jsx - VERSION CORRIGÉE
import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import fabricExportService from '@services/fabricExportService';

const FabricLabelCanvas = ({ label, layout, style, onPositionChange, onElementSelect }) => {
  const canvasRef = useRef();
  const fabricCanvasRef = useRef();
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  // 🆕 REF pour éviter les re-renders inutiles
  const isUpdatingPositionRef = useRef(false);

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

  // Handlers de zoom
  const handleZoomChange = (newZoom) => {
    const clampedZoom = Math.max(100, Math.min(200, newZoom));
    setZoomLevel(clampedZoom);

    if (fabricCanvasRef.current) {
      const zoomFactor = clampedZoom / 100;
      fabricCanvasRef.current.setZoom(zoomFactor);

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

  // 🆕 EFFET SÉPARÉ pour les mises à jour de positions (sans recréer le canvas)
  useEffect(() => {
    if (!fabricCanvasRef.current || !style.customPositions) return;
    if (isUpdatingPositionRef.current) return; // Éviter les boucles

    const mmToPx = 3.779527559;
    const fabricCanvas = fabricCanvasRef.current;

    // Mettre à jour les positions de tous les objets
    fabricCanvas.getObjects().forEach((obj) => {
      if (!obj.objectType) return;

      const savedPosition = style.customPositions[obj.objectType];
      if (savedPosition) {
        obj.set({
          left: savedPosition.x * mmToPx,
          top: savedPosition.y * mmToPx,
        });
      }
    });

    fabricCanvas.renderAll();
  }, [style.customPositions]); // ✅ Dépend uniquement des positions

  // useEffect principal pour le rendu INITIAL
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

        // Gestion de la sélection d'objet
        fabricCanvas.on('selection:created', (e) => {
          handleObjectSelection(e.selected?.[0]);
        });

        fabricCanvas.on('selection:updated', (e) => {
          handleObjectSelection(e.selected?.[0]);
        });

        // Fonction helper pour identifier l'élément
        const handleObjectSelection = (obj) => {
          if (!obj || !onElementSelect) return;

          let elementType = null;

          if (obj.type === 'text') {
            const text = obj.text;

            // Vérifier texte personnalisé
            const customText = style.customTexts?.find((t) => {
              let content = t.content;
              content = content.replace(/\{brand\}/gi, label.brand || '');
              content = content.replace(/\{supplier\}/gi, label.supplier || '');
              content = content.replace(/\{sku\}/gi, label.sku || '');
              return content === text;
            });

            if (customText) {
              elementType = 'customText';
            } else if (text === label.name) {
              elementType = 'info';
            } else if (text.includes('€') || text.includes(label.price)) {
              elementType = 'info';
            } else if (text === label.sku) {
              elementType = 'info';
            } else if (text === label.brand) {
              elementType = 'info';
            } else if (text === label.supplier) {
              elementType = 'info';
            } else if (text === (style.wooQRText || 'Voir en ligne')) {
              elementType = 'wooqr';
            } else {
              elementType = 'barcode';
            }
          } else if (obj.type === 'image') {
            if (obj.wooQRCode) {
              elementType = 'wooqr';
            } else if (obj.objectType && obj.objectType.startsWith('img_')) {
              // 🆕 C'est une image personnalisée
              elementType = 'customImage';
            } else {
              elementType = 'barcode';
            }
          } else if (obj.type === 'rect') {
            elementType = 'border';
          }

          if (elementType) {
            onElementSelect(elementType);
          }
        };

        fabricCanvasRef.current = fabricCanvas;

        // Stocker les dimensions de base pour le zoom
        const mmToPx = 3.779527559;
        window.basePrintableWidth = layout.width * mmToPx;
        window.basePrintableHeight = layout.height * mmToPx;

        // Configuration objets mobiles
        fabricCanvas.getObjects().forEach((obj) => {
          let objectType = 'unknown';

          if (obj.type === 'text') {
            const text = obj.text;
            const customText = style.customTexts?.find((t) => {
              let content = t.content;
              content = content.replace(/\{brand\}/gi, label.brand || '');
              content = content.replace(/\{supplier\}/gi, label.supplier || '');
              content = content.replace(/\{sku\}/gi, label.sku || '');
              return content === text;
            });

            if (customText) {
              objectType = customText.id;
            } else if (text === label.name) {
              objectType = 'name';
            } else if (text.includes('€') || text.includes(label.price)) {
              objectType = 'price';
            } else if (text === label.sku) {
              objectType = 'sku';
            } else if (text === label.brand) {
              objectType = 'brand';
            } else if (text === label.supplier) {
              objectType = 'supplier';
            } else if (text === (style.wooQRText || 'Voir en ligne')) {
              objectType = 'wooQRText';
            } else {
              objectType = 'barcodeText';
            }
          } else if (obj.type === 'image') {
            if (obj.wooQRCode) {
              objectType = 'wooQR';
            } else {
              objectType = 'barcode';
            }
          }

          if (obj.type === 'image' && !obj.wooQRCode && obj.objectType) {
            // C'est une image personnalisée
            objectType = obj.objectType;
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

          const newWidth = window.basePrintableWidth * zoomFactor;
          const newHeight = window.basePrintableHeight * zoomFactor;
          fabricCanvas.setWidth(newWidth);
          fabricCanvas.setHeight(newHeight);
        }

        // 🆕 Gestion modifications - AVEC FLAG pour éviter boucles
        let modificationTimeout;
        fabricCanvas.on('object:modified', (e) => {
          clearTimeout(modificationTimeout);
          modificationTimeout = setTimeout(() => {
            const obj = e.target;
            if (obj && obj.objectType && onPositionChange) {
              isUpdatingPositionRef.current = true; // 🔒 Bloquer l'effet de position

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

              // 🔓 Débloquer après un court délai
              setTimeout(() => {
                isUpdatingPositionRef.current = false;
              }, 50);
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
    // ⚠️ RETIRER style.customPositions d'ici !
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

    JSON.stringify(style.colors),
    JSON.stringify(style.customTexts),
    JSON.stringify(style.customImages),
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

  const zoomFactor = zoomLevel / 100;

  const baseRollBgWidth = physicalRollWidth * mmToPx;
  const baseRollBgHeight = physicalRollHeight * mmToPx;
  const basePrintableWidth = layout.width * mmToPx;
  const basePrintableHeight = layout.height * mmToPx;

  const rollBgWidth = baseRollBgWidth * zoomFactor;
  const rollBgHeight = baseRollBgHeight * zoomFactor;
  const printableWidth = basePrintableWidth * zoomFactor;
  const printableHeight = basePrintableHeight * zoomFactor;

  const offsetX = isRollMode ? (rollBgWidth - printableWidth) / 2 : 0;

  // Affichage d'erreur
  if (error) {
    const errorWidth = isRollMode ? rollBgWidth : printableWidth;
    const errorHeight = isRollMode ? rollBgHeight : printableHeight;

    return (
      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
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
      {/* CONTRÔLES DE ZOOM */}
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

      {/* CONTENEUR */}
      <div className="relative overflow-visible">
        <div
          className="relative mx-auto"
          style={{
            width: `${isRollMode ? rollBgWidth : printableWidth}px`,
            height: `${isRollMode ? rollBgHeight : printableHeight}px`,
            border: isRollMode ? '1px solid #e5e7eb' : 'none',
            borderRadius: isRollMode ? '4px' : '0',
            backgroundColor: isRollMode ? '#f9fafb' : 'transparent',
          }}
        >
          <canvas
            ref={canvasRef}
            className="absolute"
            style={{
              backgroundColor: 'transparent',
              top: 0,
              left: isRollMode ? `${offsetX}px` : 0,
              zIndex: 10,
            }}
          />
        </div>
      </div>

      {/* INFORMATIONS */}
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
