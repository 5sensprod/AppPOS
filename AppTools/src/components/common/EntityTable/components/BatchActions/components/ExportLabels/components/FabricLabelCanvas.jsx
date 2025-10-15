// FabricLabelCanvas.jsx - SOLUTION FINALE AVEC HOOK
import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import fabricExportService from '@services/fabricExportService';

const FabricLabelCanvas = ({ label, layout, style, onPositionChange, onElementSelect }) => {
  const canvasRef = useRef();
  const fabricCanvasRef = useRef();
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  // 🔑 HOOK : Positions initiales capturées UNE SEULE FOIS
  const initialPositionsRef = useRef(null);
  const isFirstRenderRef = useRef(true);

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

  const handleZoomChange = (newZoom) => {
    const clampedZoom = Math.max(50, Math.min(200, newZoom));
    setZoomLevel(clampedZoom);

    if (fabricCanvasRef.current) {
      const zoomFactor = clampedZoom / 100;
      fabricCanvasRef.current.setZoom(zoomFactor);

      const mmToPx = 3.779527559;
      const baseWidth = layout.width * mmToPx;
      const baseHeight = layout.height * mmToPx;

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

  // 🎯 FONCTION : Capturer toutes les positions actuelles du canvas
  const captureAllPositions = (fabricCanvas) => {
    const mmToPx = 3.779527559;
    const positions = {};

    fabricCanvas.getObjects().forEach((obj) => {
      if (obj.objectType) {
        const posInMm = {
          x: obj.left / mmToPx,
          y: obj.top / mmToPx,
          centerX: obj.left / mmToPx,
        };

        console.log(`📏 Capture ${obj.objectType}:`, {
          leftPx: obj.left,
          topPx: obj.top,
          leftMm: posInMm.x,
          topMm: posInMm.y,
        });

        positions[obj.objectType] = posInMm;
      }
    });

    return positions;
  };

  // useEffect principal
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

        const effectivePositions = isFirstRenderRef.current
          ? style.customPositions || {}
          : initialPositionsRef.current || style.customPositions || {};

        const effectiveStyle = {
          ...style,
          customPositions: effectivePositions,
        };

        const fabricCanvas = await fabricExportService.renderLabelPreview(
          canvasEl,
          label,
          layout,
          effectiveStyle,
          {
            highRes: false,
            context: 'preview',
          }
        );

        // 🎯 NOUVEAU : Attendre intelligemment que TOUS les éléments soient ajoutés
        if (isFirstRenderRef.current) {
          // Calculer le nombre d'objets attendus
          let expectedObjects = 0;
          if (style.showBorder) expectedObjects++;
          if (style.showName && label.name?.trim()) expectedObjects++;
          if (style.showPrice && label.price != null) expectedObjects++;
          if (style.showSku && label.sku?.trim()) expectedObjects++;
          if (style.showBrand && label.brand?.trim()) expectedObjects++;
          if (style.showSupplier && label.supplier?.trim()) expectedObjects++;

          // Barcode/QR principal
          if (style.showBarcode && label.barcode?.trim()) {
            expectedObjects++; // L'image
            if (style.showBarcodeText !== false) expectedObjects++; // Le texte sous le code
          }

          // WooQR
          if (style.showWooQR && label.websiteUrl?.trim()) {
            expectedObjects++; // L'image QR
            if (style.showWooQRText !== false) expectedObjects++; // Le texte sous le QR
          }

          // Custom texts
          const enabledCustomTexts =
            style.customTexts?.filter((t) => t.enabled && t.content?.trim()) || [];
          expectedObjects += enabledCustomTexts.length;

          console.log(`⏳ Attente de ${expectedObjects} objets...`);

          // 🎯 Fonction pour vérifier et capturer les positions
          const tryCapture = (attempt = 1, maxAttempts = 5) => {
            const actualObjects = fabricCanvas.getObjects().length;
            console.log(`🔍 Tentative ${attempt}: ${actualObjects}/${expectedObjects} objets`);

            if (actualObjects >= expectedObjects || attempt >= maxAttempts) {
              const capturedPositions = captureAllPositions(fabricCanvas);
              initialPositionsRef.current = capturedPositions;

              console.log('📸 Positions capturées:', capturedPositions);

              if (onPositionChange) {
                Object.entries(capturedPositions).forEach(([objectType, position]) => {
                  if (!style.customPositions?.[objectType]) {
                    onPositionChange({ objectType, position });
                  }
                });
              }

              isFirstRenderRef.current = false;
            } else {
              // Réessayer après 100ms
              setTimeout(() => tryCapture(attempt + 1, maxAttempts), 100);
            }
          };

          // Commencer après 150ms (laisser le temps aux éléments synchrones)
          setTimeout(() => tryCapture(), 150);
        }

        // Gestion de la sélection (code inchangé)
        fabricCanvas.on('selection:created', (e) => {
          handleObjectSelection(e.selected?.[0]);
        });

        fabricCanvas.on('selection:updated', (e) => {
          handleObjectSelection(e.selected?.[0]);
        });

        const handleObjectSelection = (obj) => {
          if (!obj || !onElementSelect) return;

          let elementType = null;

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

        const mmToPx = 3.779527559;

        // Configuration objets mobiles (code inchangé)
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

        // Appliquer le zoom actuel
        if (zoomLevel !== 100) {
          const zoomFactor = zoomLevel / 100;
          fabricCanvas.setZoom(zoomFactor);

          const newWidth = layout.width * mmToPx * zoomFactor;
          const newHeight = layout.height * mmToPx * zoomFactor;
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
              const leftMm = obj.left / mmToPx;
              const topMm = obj.top / mmToPx;

              // Mettre à jour aussi les positions initiales capturées
              if (initialPositionsRef.current) {
                initialPositionsRef.current[obj.objectType] = {
                  x: leftMm,
                  y: topMm,
                  centerX: leftMm,
                };
              }

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
    // Dépendances inchangées
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
  ]);

  useEffect(() => {
    return cleanupCanvas;
  }, []);

  // Calculs dimensions
  const mmToPx = 3.779527559;
  const isRollMode = layout.supportType === 'rouleau';
  const physicalRollWidth = isRollMode ? layout.rouleau?.width || 58 : layout.width;
  const physicalRollHeight = layout.height;

  const maxZoom = 2;
  const containerWidth = (isRollMode ? physicalRollWidth : layout.width) * mmToPx * maxZoom;
  const containerHeight = (isRollMode ? physicalRollHeight : layout.height) * mmToPx * maxZoom;

  if (error) {
    return (
      <div className="inline-block">
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
          <div className="mb-3 flex items-center justify-center gap-1 bg-gray-200 dark:bg-gray-600 p-2 rounded">
            <button
              onClick={handleZoomOut}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={zoomLevel <= 50}
              className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Réduire"
            >
              <ZoomOut className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="text-xs font-mono text-gray-700 dark:text-gray-300 min-w-[40px] text-center px-1">
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
              width: `${containerWidth}px`,
              height: `${containerHeight}px`,
            }}
          >
            <div className="text-red-600 text-xs text-center p-2">
              <div className="font-medium">❌ Erreur d'aperçu</div>
              <div className="mt-1">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-block">
      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
        <div className="mb-3 flex items-center justify-center gap-1 bg-gray-200 dark:bg-gray-600 p-2 rounded">
          <button
            onClick={handleZoomOut}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={zoomLevel <= 50}
            className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Réduire (Ctrl + -)"
          >
            <ZoomOut className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="text-xs font-mono text-gray-700 dark:text-gray-300 min-w-[40px] text-center px-1">
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

        <div
          className="relative rounded border border-gray-300 dark:border-gray-600"
          style={{
            width: `${containerWidth}px`,
            height: `${containerHeight}px`,
            overflow: 'hidden',
            backgroundColor: '#f3f4f6',
            backgroundImage: `
              linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
              linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
              linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="relative shadow-lg"
              style={{
                border: isRollMode ? '2px solid #9ca3af' : '2px solid #d1d5db',
                borderRadius: isRollMode ? '6px' : '2px',
                backgroundColor: '#ffffff',
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  display: 'block',
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 text-center">
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
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Zoom: {zoomLevel}%
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FabricLabelCanvas;
