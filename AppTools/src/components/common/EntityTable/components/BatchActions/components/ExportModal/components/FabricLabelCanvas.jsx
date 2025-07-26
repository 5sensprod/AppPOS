// FabricLabelCanvas.jsx - Version avec capture des positions personnalisées
import React, { useEffect, useRef } from 'react';
import LabelRenderer from '../../../../../../../../services/LabelRenderer';

const FabricLabelCanvas = ({ label, layout, style, onPositionChange }) => {
  const canvasRef = useRef();
  const fabricCanvasRef = useRef();

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl || !label) {
      return;
    }

    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }

    const renderCanvas = async () => {
      try {
        const fabricCanvas = await LabelRenderer.renderToCanvas(canvasEl, label, layout, style, {
          highRes: false,
        });
        fabricCanvasRef.current = fabricCanvas;

        makeObjectsMovable(fabricCanvas);
      } catch (error) {
        // L'erreur est silencieusement ignorée ici — vous pouvez la traiter autrement si nécessaire
      }
    };

    const makeObjectsMovable = (fabricCanvas) => {
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
          borderDashArray: [5, 5],
        });

        obj.objectType = objectType;
        obj.originalLeft = obj.left;
        obj.originalTop = obj.top;

        obj.on('mouseover', function () {
          this.set('borderColor', '#00ff00');
          fabricCanvas.renderAll();
        });

        obj.on('mouseout', function () {
          this.set('borderColor', '#0084ff');
          fabricCanvas.renderAll();
        });
      });

      fabricCanvas.on('object:modified', (e) => {
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
      });

      fabricCanvas.selection = true;
    };

    renderCanvas();

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [label, layout, style, onPositionChange]);

  const mmToPx = 3.779527559;

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{
          width: `${layout.width * mmToPx}px`,
          height: `${layout.height * mmToPx}px`,
          border: '1px solid #ccc',
          cursor: 'move',
        }}
      />
      <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
        {label?.name || 'Pas de label'} - {layout.width}×{layout.height}mm
        <br />
        <span style={{ color: '#0084ff' }}>💡 Cliquez et déplacez les éléments</span>
      </div>
    </div>
  );
};

export default FabricLabelCanvas;
