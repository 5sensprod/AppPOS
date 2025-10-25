// src/features/labels/components/templates/FormatPanel.jsx
import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import useLabelStore from '../../store/useLabelStore';

const FormatPanel = () => {
  const canvasSize = useLabelStore((state) => state.canvasSize);
  const setCanvasSize = useLabelStore((state) => state.setCanvasSize);
  const lockCanvasToSheetCell = useLabelStore((s) => s.lockCanvasToSheetCell);

  const [customWidth, setCustomWidth] = useState(canvasSize.width);
  const [customHeight, setCustomHeight] = useState(canvasSize.height);

  const formats = [
    { id: 'a4-portrait', label: 'A4 Portrait', width: 595, height: 842 },
    { id: 'a4-landscape', label: 'A4 Paysage', width: 842, height: 595 },
    { id: 'a5-portrait', label: 'A5 Portrait', width: 420, height: 595 },
    { id: 'a5-landscape', label: 'A5 Paysage', width: 595, height: 420 },
    { id: 'square-small', label: 'Carré 500×500', width: 500, height: 500 },
    { id: 'square-medium', label: 'Carré 800×800', width: 800, height: 800 },
    { id: 'instagram-post', label: 'Instagram Post', width: 1080, height: 1080 },
    { id: 'instagram-story', label: 'Instagram Story', width: 1080, height: 1920 },
    { id: 'facebook-post', label: 'Facebook Post', width: 1200, height: 630 },
    { id: 'twitter-post', label: 'Twitter Post', width: 1200, height: 675 },
    { id: 'flyer', label: 'Flyer', width: 600, height: 800 },
    { id: 'banner', label: 'Bannière', width: 1200, height: 400 },
  ];

  const handleFormatSelect = (width, height) => {
    if (lockCanvasToSheetCell) return; // désactivé si piloté par la planche
    setCanvasSize(width, height);
    setCustomWidth(width);
    setCustomHeight(height);
  };

  const handleCustomSize = () => {
    if (lockCanvasToSheetCell) return; // désactivé si piloté par la planche
    if (customWidth > 0 && customHeight > 0) {
      setCanvasSize(customWidth, customHeight);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {lockCanvasToSheetCell && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700 text-xs text-indigo-900 dark:text-indigo-200">
          Le format du canvas est actuellement <strong>piloté par la planche</strong> (taille d’une
          cellule). Désactivez cette option dans l’onglet <em>Planche</em> pour modifier librement
          le format.
        </div>
      )}

      {/* Taille actuelle */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
          <Maximize2 className="h-4 w-4" />
          <span className="font-medium">
            Taille actuelle : {canvasSize.width} × {canvasSize.height} px
          </span>
        </div>
      </div>

      {/* Formats prédéfinis */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Formats prédéfinis
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {formats.map((format) => (
            <button
              key={format.id}
              onClick={() => handleFormatSelect(format.width, format.height)}
              className={`p-3 border rounded-lg text-left transition-all ${
                canvasSize.width === format.width && canvasSize.height === format.height
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : `border-gray-200 dark:border-gray-700 ${
                      lockCanvasToSheetCell
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                    }`
              }`}
              disabled={lockCanvasToSheetCell}
            >
              <div className="text-sm font-medium">{format.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {format.width} × {format.height}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Taille personnalisée */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Taille personnalisée
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={customWidth}
              onChange={(e) => setCustomWidth(parseInt(e.target.value) || 0)}
              placeholder="Largeur"
              min="100"
              max="5000"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={lockCanvasToSheetCell}
            />
            <span className="text-gray-500">×</span>
            <input
              type="number"
              value={customHeight}
              onChange={(e) => setCustomHeight(parseInt(e.target.value) || 0)}
              placeholder="Hauteur"
              min="100"
              max="5000"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={lockCanvasToSheetCell}
            />
          </div>
          <button
            onClick={handleCustomSize}
            className={`w-full px-4 py-2 text-white rounded transition-colors ${
              lockCanvasToSheetCell
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
            disabled={lockCanvasToSheetCell}
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormatPanel;
