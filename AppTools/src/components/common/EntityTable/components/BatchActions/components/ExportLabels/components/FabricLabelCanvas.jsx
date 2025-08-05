import React, { useEffect, useRef, useState } from 'react';
import fabricExportService from '@services/fabricExportService';

const FabricLabelCanvas = ({ label, layout, style, onPositionChange }) => {
  const canvasRef = useRef();
  const fabricCanvasRef = useRef();
  const [error, setError] = useState(null);

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

  // useEffect simple avec les bonnes dépendances (comme l'original)
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

        // Configuration objets mobiles
        fabricCanvas.getObjects().forEach((obj) => {
          let objectType = 'unknown';

          if (obj.type === 'text') {
            const text = obj.text;
            if (text === label.name) {
              objectType = 'name';
            } else if (text.includes('€') || text.includes(label.price)) {
              objectType = 'price';
            } else {
              objectType = 'barcodeText';
            }
          } else if (obj.type === 'image') {
            objectType = 'barcode';
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

        // Gestion modifications
        let modificationTimeout;
        fabricCanvas.on('object:modified', (e) => {
          clearTimeout(modificationTimeout);
          modificationTimeout = setTimeout(() => {
            const obj = e.target;
            if (obj && obj.objectType && onPositionChange) {
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
      } catch (err) {
        console.error('Erreur rendu aperçu étiquette:', err);
        setError(`Erreur de rendu: ${err.message}`);
      }
    }, 50); // 🎯 Timeout original de 50ms

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    label?.id,
    label?.name,
    label?.price,
    label?.barcode,
    layout.width,
    layout.height,
    layout.supportType,
    style.showName,
    style.showPrice,
    style.showBarcode,
    style.showBorder,
    style.nameSize,
    style.priceSize,
    style.barcodeHeight,
    JSON.stringify(style.customPositions), // Simple stringify pour éviter les re-renders d'objet
    // duplicateCount volontairement exclu
  ]);

  // Cleanup au démontage
  useEffect(() => {
    return cleanupCanvas;
  }, []);

  // Calculs dimensions
  const mmToPx = 3.779527559;

  // 🎯 NOUVELLES DIMENSIONS POUR LE FOND ROULEAU
  const isRollMode = layout.supportType === 'rouleau';
  const physicalRollWidth = isRollMode ? layout.rouleau?.width || 58 : layout.width;
  const physicalRollHeight = layout.height;
  const margeInterieure = isRollMode ? layout.padding || 3 : 0;

  // Dimensions du fond physique du rouleau
  const rollBgWidth = physicalRollWidth * mmToPx;
  const rollBgHeight = physicalRollHeight * mmToPx;

  // Dimensions de la zone imprimable (canvas actuel)
  const printableWidth = layout.width * mmToPx;
  const printableHeight = layout.height * mmToPx;

  // Calcul de l'offset pour centrer la zone imprimable
  const offsetX = isRollMode ? (rollBgWidth - printableWidth) / 2 : 0;

  // Affichage d'erreur
  if (error) {
    const errorWidth = isRollMode ? rollBgWidth : printableWidth;
    const errorHeight = isRollMode ? rollBgHeight : printableHeight;

    return (
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
    );
  }

  return (
    <div className="relative inline-block">
      {/* 🎯 FOND DU ROULEAU PHYSIQUE (visible uniquement en mode rouleau) */}
      {isRollMode && (
        <div
          className="absolute bg-gray-200 dark:bg-gray-600 rounded-sm border border-gray-300 dark:border-gray-500 z-0"
          style={{
            width: `${rollBgWidth}px`,
            height: `${rollBgHeight}px`,
            top: 0,
            left: 0,
          }}
        >
          {/* Indication des marges */}
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 text-[10px] font-medium pointer-events-none">
            <div className="text-center">
              <div>Rouleau {physicalRollWidth}mm</div>
              <div className="mt-1 opacity-75">Marge {margeInterieure}mm</div>
            </div>
          </div>

          {/* Lignes de marge (optionnel, pour plus de clarté) */}
          <div
            className="absolute top-0 bottom-0 border-l border-dashed border-gray-400 dark:border-gray-500 opacity-50"
            style={{ left: `${margeInterieure * mmToPx}px` }}
          />
          <div
            className="absolute top-0 bottom-0 border-r border-dashed border-gray-400 dark:border-gray-500 opacity-50"
            style={{ right: `${margeInterieure * mmToPx}px` }}
          />
        </div>
      )}

      {/* 🎯 FOND BLANC POUR LA ZONE IMPRIMABLE (seulement en mode rouleau) */}
      {isRollMode && (
        <div
          className="absolute bg-white border border-gray-300 z-5"
          style={{
            width: `${printableWidth}px`,
            height: `${printableHeight}px`,
            top: 0,
            left: `${offsetX}px`,
          }}
        />
      )}

      {/* 🎯 CANVAS DE LA ZONE IMPRIMABLE (transparent pour voir le fond) */}
      <canvas
        ref={canvasRef}
        style={{
          width: `${printableWidth}px`,
          height: `${printableHeight}px`,
          border: isRollMode ? 'none' : '1px solid #ccc', // Pas de bordure en mode rouleau
          borderRadius: '0px',
          boxShadow: isRollMode ? 'none' : '0 2px 4px rgba(0,0,0,0.1)', // Pas d'ombre en mode rouleau
          backgroundColor: isRollMode ? 'transparent' : '#ffffff',
          position: 'relative',
          zIndex: 10,
          // Position absolue pour un centrage parfait en mode rouleau
          ...(isRollMode && {
            position: 'absolute',
            left: `${offsetX}px`,
            top: 0,
            marginLeft: 0,
          }),
        }}
      />

      {/* 🎯 INFORMATIONS MISE À JOUR */}
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
            `${layout.width}×{layout.height}mm`
          )}
        </span>
      </div>
    </div>
  );
};

export default FabricLabelCanvas;
