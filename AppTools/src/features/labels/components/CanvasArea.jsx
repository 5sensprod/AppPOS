import React, { useRef, useEffect, useState } from 'react';
import KonvaCanvas from './KonvaCanvas';
import useLabelStore from '../store/useLabelStore';

const CanvasArea = ({ dataSource, selectedProduct }) => {
  const zoom = useLabelStore((state) => state.zoom);
  const canvasSize = useLabelStore((state) => state.canvasSize);
  const zoomIn = useLabelStore((state) => state.zoomIn);
  const zoomOut = useLabelStore((state) => state.zoomOut);
  const resetZoom = useLabelStore((state) => state.resetZoom);

  const containerRef = useRef(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  // Le Stage prend 100% de la place dispo
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

  return (
    <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
      {/* Header badge (optionnel) */}
      {dataSource && (
        <div className="absolute top-4 right-4 z-10 pointer-events-none">
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${
              dataSource === 'blank' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
            }`}
          >
            {dataSource === 'blank' ? '📄 Mode vierge' : '🔗 Mode données actif'}
          </div>
        </div>
      )}

      {/* Zone de travail (le Stage remplit 100%) */}
      <div className="flex-1 overflow-hidden">
        <div ref={containerRef} className="w-full h-full checkerboard">
          <KonvaCanvas
            viewportWidth={viewport.width}
            viewportHeight={viewport.height}
            docWidth={canvasSize.width}
            docHeight={canvasSize.height}
            zoom={zoom}
          />
        </div>
      </div>

      {/* Contrôles zoom */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-lg shadow-lg px-3 py-2 flex items-center gap-3 border border-gray-200 dark:border-gray-700 z-50">
        <button
          onClick={zoomOut}
          className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded font-bold text-gray-700 dark:text-gray-300"
          title="Zoom -"
        >
          −
        </button>
        <button
          onClick={resetZoom}
          className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded min-w-[60px]"
          title="Réinitialiser zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={zoomIn}
          className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded font-bold text-gray-700 dark:text-gray-300"
          title="Zoom +"
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
