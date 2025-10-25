// src/features/labels/components/CanvasArea.jsx
import React, { useRef, useEffect, useState } from 'react';
import KonvaCanvas from './KonvaCanvas';
import useLabelStore from '../store/useLabelStore';
import PropertyPanel from './PropertyPanel';

const CanvasArea = ({ dataSource, selectedProduct, onDocNodeReady, onOpenEffects }) => {
  const zoom = useLabelStore((s) => s.zoom);
  const canvasSize = useLabelStore((s) => s.canvasSize);
  const zoomIn = useLabelStore((s) => s.zoomIn);
  const zoomOut = useLabelStore((s) => s.zoomOut);
  const resetZoom = useLabelStore((s) => s.resetZoom);
  const selectedId = useLabelStore((s) => s.selectedId);

  const containerRef = useRef(null);
  const stageRef = useRef(null); // 🆕 Ref pour le Stage
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setViewport({ width: Math.floor(cr.width), height: Math.floor(cr.height) });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Remonte le docNode vers le parent (LabelPage)
  const handleDocNodeReady = (node) => {
    if (onDocNodeReady) onDocNodeReady(node);
  };

  // 🆕 Remonter aussi la ref du Stage au parent si besoin
  useEffect(() => {
    // Si vous avez besoin de la ref dans le parent, vous pouvez la passer via un callback
    // Pour l'instant, elle est utilisée localement pour les templates
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
      {/* Damier plein écran */}
      <div ref={containerRef} className="flex-1 checkerboard relative">
        {/* Stage plein écran avec ref */}
        <KonvaCanvas
          ref={stageRef}
          viewportWidth={viewport.width}
          viewportHeight={viewport.height}
          docWidth={canvasSize.width}
          docHeight={canvasSize.height}
          zoom={zoom}
          onDocNode={handleDocNodeReady}
        />

        {/* 🧰 PropertyPanel en overlay */}
        {selectedId && (
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 z-50">
            <div className="pointer-events-auto">
              <PropertyPanel
                selectedProduct={selectedProduct}
                onOpenEffects={onOpenEffects} // 🆕 Passer la fonction
              />
            </div>
          </div>
        )}
      </div>

      {/* Contrôles zoom uniquement */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-lg shadow-lg px-3 py-2 flex items-center gap-3 border border-gray-200 dark:border-gray-700 z-30">
        <button
          onClick={zoomOut}
          className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded font-bold text-gray-700 dark:text-gray-300"
        >
          −
        </button>
        <button
          onClick={resetZoom}
          className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded min-w-[60px]"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={zoomIn}
          className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded font-bold text-gray-700 dark:text-gray-300"
        >
          +
        </button>
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 select-none">
          Molette : zoom • Espace : pan
        </span>
      </div>
    </div>
  );
};

export default CanvasArea;
