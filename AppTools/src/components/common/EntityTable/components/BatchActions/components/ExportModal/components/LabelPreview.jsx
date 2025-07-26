//LabelPreview.jsx - Avec réinitialisation automatique des positions
import React, { useState, useEffect } from 'react';
import { Eye, Ruler, Move, RotateCcw } from 'lucide-react';
import FabricLabelCanvas from './FabricLabelCanvas';

const LabelPreview = ({ labelData, customLayout, labelStyle, onStyleChange }) => {
  if (!labelData || labelData.length === 0) return null;

  const sampleLabel = labelData[0];
  const [customPositions, setCustomPositions] = useState({});

  // ✅ RÉINITIALISATION AUTOMATIQUE quand le contexte change
  useEffect(() => {
    setCustomPositions({});

    if (onStyleChange) {
      onStyleChange({
        customPositions: {},
      });
    }
  }, [
    customLayout.supportType, // ✅ Changement de support (A4 ↔ rouleau)
    customLayout.width, // ✅ Changement de largeur
    customLayout.height, // ✅ Changement de hauteur
    sampleLabel.id, // ✅ Changement de produit
  ]);

  // ✅ Gérer les changements de position depuis le canvas
  const handlePositionChange = (positionData) => {
    const newPositions = {
      ...customPositions,
      [positionData.objectType]: positionData.position,
    };

    setCustomPositions(newPositions);

    // ✅ Remonter vers le parent avec les positions personnalisées
    if (onStyleChange) {
      onStyleChange({
        customPositions: newPositions,
      });
    }
  };

  // ✅ Réinitialiser manuellement les positions personnalisées
  const handleResetPositions = () => {
    setCustomPositions({});

    if (onStyleChange) {
      onStyleChange({
        customPositions: {},
      });
    }
  };

  // ✅ Compter le nombre d'éléments avec positions personnalisées
  const customPositionCount = Object.keys(customPositions).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-4 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Eye className="h-4 w-4 mr-2" />
          Aperçu étiquette - Taille réelle
        </h4>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <Ruler className="h-3 w-3 mr-1" />
            {customLayout.width} × {customLayout.height} mm
          </div>
          {customPositionCount > 0 && (
            <div className="flex items-center">
              <Move className="h-3 w-3 mr-1" />
              {customPositionCount} élément{customPositionCount > 1 ? 's' : ''} repositionné
              {customPositionCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Instructions de déplacement */}
      <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Move className="h-3 w-3 mr-1 text-blue-600" />
            <span className="text-blue-700 dark:text-blue-300">
              Cliquez et déplacez les éléments (prix, nom, code-barres) pour les repositionner
            </span>
          </div>
          {customPositionCount > 0 && (
            <button
              type="button"
              onClick={handleResetPositions}
              className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
              title="Remettre les positions par défaut"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
          <FabricLabelCanvas
            label={sampleLabel}
            layout={customLayout}
            style={{
              ...labelStyle,
              customPositions: customPositions,
            }}
            onPositionChange={handlePositionChange}
          />
        </div>
      </div>

      {/* Debug des positions personnalisées */}
      {customPositionCount > 0 && (
        <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
          <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
            Positions personnalisées :
          </h5>
          <div className="space-y-1">
            {Object.entries(customPositions).map(([type, position]) => (
              <div key={type} className="flex justify-between text-gray-600 dark:text-gray-400">
                <span className="capitalize">{type}:</span>
                <span>
                  x: {position.x?.toFixed(1)}mm, y: {position.y?.toFixed(1)}mm
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelPreview;
