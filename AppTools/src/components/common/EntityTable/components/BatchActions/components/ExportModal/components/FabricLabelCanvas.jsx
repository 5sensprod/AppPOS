// FabricLabelCanvas.jsx - Version refactorisée avec LabelRenderer
import React, { useEffect, useRef } from 'react';
import LabelRenderer from '../../../../../../../../services/LabelRenderer';

const FabricLabelCanvas = ({ label, layout, style }) => {
  const canvasRef = useRef();
  const fabricCanvasRef = useRef();

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl || !label) {
      console.log('❌ Canvas ou label manquant:', { canvasEl: !!canvasEl, label: !!label });
      return;
    }

    console.log('🎨 Rendu Canvas avec:', { label: label.name, layout, style });

    // ✅ Nettoyage de l'ancien canvas
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }

    // ✅ Rendu unifié via LabelRenderer
    const renderCanvas = async () => {
      try {
        // ✅ Résolution normale pour aperçu (pas de highRes)
        const fabricCanvas = await LabelRenderer.renderToCanvas(
          canvasEl,
          label,
          layout,
          style,
          { highRes: false } // ✅ Résolution normale pour l'aperçu
        );
        fabricCanvasRef.current = fabricCanvas;
        console.log('✅ Canvas rendu avec succès');
      } catch (error) {
        console.error('❌ Erreur rendu Canvas:', error);
      }
    };

    renderCanvas();

    // ✅ Cleanup
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [label, layout, style]);

  const mmToPx = 3.779527559;

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{
          width: `${layout.width * mmToPx}px`,
          height: `${layout.height * mmToPx}px`,
          border: '1px solid #ccc',
        }}
      />
      {/* Debug info */}
      <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
        {label?.name || 'Pas de label'} - {layout.width}×{layout.height}mm
      </div>
    </div>
  );
};

export default FabricLabelCanvas;
