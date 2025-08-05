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

  // useEffect simple avec les bonnes dépendances
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
    }, 50);

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
  const physicalWidth = layout.width;
  const physicalHeight = layout.height;
  const canvasWidth = physicalWidth * mmToPx;
  const canvasHeight = physicalHeight * mmToPx;

  // Affichage d'erreur
  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-red-50 border border-red-200 rounded"
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
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
    <div className="relative">
      <canvas
        ref={canvasRef}
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      />

      <div className="mt-2 text-xs text-gray-600 text-center">
        <span className="font-medium">{label?.name || 'Aperçu étiquette'}</span>
        <span className="mx-2">•</span>
        <span>
          {physicalWidth}×{physicalHeight}mm
        </span>
      </div>
    </div>
  );
};

export default FabricLabelCanvas;
