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

  // Observer pour que le Stage prenne toute la place dispo
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setViewport({ width: Math.floor(cr.width), height: Math.floor(cr.height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Padding autour de la preview (optionnel)
  const padding = 100;

  return (
    <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
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

      {/* Le Stage doit prendre 100% de l'espace disponible */}
      <div className="flex-1 overflow-auto">
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `${padding}px`,
            boxSizing: 'border-box',
          }}
        >
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
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-2 flex items-center gap-3 border border-gray-200 dark:border-gray-700 z-50">
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
          title="Reset zoom"
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
          Molette pour zoomer • Espace pour panner
        </span>
      </div>
    </div>
  );
};

export default CanvasArea;
