import React, { useEffect, useRef, useCallback, useState } from 'react';
import fabricExportService from '@services/fabricExportService';

const FabricLabelCanvas = ({ label, layout, style, onPositionChange }) => {
  const canvasRef = useRef();
  const fabricCanvasRef = useRef();

  // 🆕 États pour le feedback utilisateur
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeObject, setActiveObject] = useState(null);

  // 🆕 Cleanup optimisé
  const cleanupCanvas = useCallback(() => {
    if (fabricCanvasRef.current) {
      try {
        fabricCanvasRef.current.dispose();
      } catch (error) {
        console.warn('Erreur dispose canvas:', error);
      } finally {
        fabricCanvasRef.current = null;
      }
    }
  }, []);

  // 🆕 Configuration des objets mobiles optimisée
  const makeObjectsMovable = useCallback(
    (fabricCanvas) => {
      fabricCanvas.getObjects().forEach((obj) => {
        let objectType = 'unknown';

        // 🎯 Détection intelligente du type d'objet
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

        // 🎯 Configuration d'interactivité améliorée
        obj.set({
          selectable: true,
          moveable: true,
          hasControls: false,
          hasBorders: true,
          borderColor: '#0084ff',
          cornerColor: '#0084ff',
          borderDashArray: [5, 5],
          borderScaleFactor: 2, // 🆕 Bordures plus visibles
          padding: 4, // 🆕 Zone de clic plus large
        });

        obj.objectType = objectType;
        obj.originalLeft = obj.left;
        obj.originalTop = obj.top;

        // 🆕 Événements d'interaction améliorés
        obj.on('mouseover', function () {
          this.set({
            borderColor: '#00ff00',
            borderDashArray: [3, 3],
          });
          fabricCanvas.renderAll();
          setActiveObject(this.objectType);
        });

        obj.on('mouseout', function () {
          this.set({
            borderColor: '#0084ff',
            borderDashArray: [5, 5],
          });
          fabricCanvas.renderAll();
          setActiveObject(null);
        });

        // 🆕 Événement de sélection
        obj.on('selected', function () {
          setActiveObject(this.objectType);
        });
      });

      // 🆕 Gestion des modifications avec debouncing
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
        }, 100); // Debounce de 100ms
      });

      // 🆕 Désélection
      fabricCanvas.on('selection:cleared', () => {
        setActiveObject(null);
      });

      fabricCanvas.selection = true;
    },
    [label, onPositionChange]
  );

  // 🆕 Rendu du canvas avec gestion d'erreur
  const renderCanvas = useCallback(async () => {
    const canvasEl = canvasRef.current;
    if (!canvasEl || !label) {
      setError('Canvas ou label manquant');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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
          context: 'preview', // 🆕 Contexte explicite
        }
      );

      fabricCanvasRef.current = fabricCanvas;
      makeObjectsMovable(fabricCanvas);

      setIsLoading(false);
    } catch (error) {
      console.error('Erreur rendu aperçu étiquette:', error);
      setError(`Erreur de rendu: ${error.message}`);
      setIsLoading(false);
    }
  }, [label, layout, style, cleanupCanvas, makeObjectsMovable]);

  // 🆕 Effet principal avec debouncing pour éviter les re-renders intempestifs
  useEffect(() => {
    // 🎯 Debounce pour éviter les re-renders lors de la saisie
    const timeoutId = setTimeout(() => {
      renderCanvas();
    }, 150); // 150ms de délai

    return () => {
      clearTimeout(timeoutId);
      cleanupCanvas();
    };
  }, [
    label?.id,
    layout.width,
    layout.height,
    layout.supportType,
    style.showName,
    style.showPrice,
    style.showBarcode,
    style.customPositions,
  ]);

  // 🆕 Calculs de dimensions optimisés
  const mmToPx = 3.779527559;
  const physicalWidth = layout.width;
  const physicalHeight = layout.height;
  const canvasWidth = physicalWidth * mmToPx;
  const canvasHeight = physicalHeight * mmToPx;

  // 🆕 Gestion des états de chargement et d'erreur
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
      {/* Canvas principal */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            border: '1px solid #ccc',
            cursor: activeObject ? 'move' : 'default',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        />

        {/* 🆕 Overlay de chargement */}
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded"
            style={{ border: '1px solid #ccc' }}
          >
            <div className="text-gray-600 text-xs flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Génération de l'aperçu...
            </div>
          </div>
        )}

        {/* 🆕 Indicateur d'objet actif */}
        {activeObject && !isLoading && (
          <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow">
            {activeObject === 'name' && '📝 Nom'}
            {activeObject === 'price' && '💰 Prix'}
            {activeObject === 'barcode' && '📊 Code-barres'}
            {activeObject === 'barcodeText' && '🔤 Texte code-barres'}
          </div>
        )}
      </div>

      {/* 🆕 Informations et aide contextuelle */}
      <div className="mt-2 space-y-1">
        <div className="text-xs text-gray-600 text-center">
          <span className="font-medium">{label?.name || 'Aperçu étiquette'}</span>
          <span className="mx-2">•</span>
          <span>
            {physicalWidth}×{physicalHeight}mm
          </span>
        </div>

        {!isLoading && !error && (
          <div className="text-xs text-blue-600 text-center">
            💡 Cliquez et déplacez les éléments
            {activeObject && (
              <span className="ml-2 font-medium">
                →{' '}
                {activeObject === 'name'
                  ? 'Nom'
                  : activeObject === 'price'
                    ? 'Prix'
                    : activeObject === 'barcode'
                      ? 'Code-barres'
                      : 'Texte'}{' '}
                sélectionné
              </span>
            )}
          </div>
        )}
      </div>

      {/* 🆕 Bouton de rechargement en cas d'erreur */}
      {error && (
        <div className="mt-2 text-center">
          <button
            onClick={renderCanvas}
            className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            🔄 Recharger l'aperçu
          </button>
        </div>
      )}
    </div>
  );
};

export default FabricLabelCanvas;
