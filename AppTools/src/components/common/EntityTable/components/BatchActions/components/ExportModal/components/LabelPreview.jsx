//LabelPreview.jsx - Avec restoration des positions depuis les presets
import React, { useState, useEffect } from 'react';
import { Eye, Ruler, Move, RotateCcw, Save } from 'lucide-react';
import FabricLabelCanvas from './FabricLabelCanvas';

const LabelPreview = ({ labelData, customLayout, labelStyle, onStyleChange }) => {
  if (!labelData || labelData.length === 0) return null;

  const sampleLabel = labelData[0];
  const [customPositions, setCustomPositions] = useState({});

  useEffect(() => {
    if (labelStyle.customPositions && Object.keys(labelStyle.customPositions).length > 0) {
      setCustomPositions(labelStyle.customPositions);
    } else {
      setCustomPositions({});
    }
  }, [labelStyle.customPositions]);

  useEffect(() => {
    const shouldReset = true;

    if (shouldReset) {
      setCustomPositions({});

      if (onStyleChange) {
        onStyleChange({
          customPositions: {},
        });
      }
    }
  }, [customLayout.supportType, customLayout.width, customLayout.height, sampleLabel.id]);

  const handlePositionChange = (positionData) => {
    const newPositions = {
      ...customPositions,
      [positionData.objectType]: positionData.position,
    };

    setCustomPositions(newPositions);

    if (onStyleChange) {
      onStyleChange({
        customPositions: newPositions,
      });
    }
  };

  const handleResetPositions = () => {
    setCustomPositions({});

    if (onStyleChange) {
      onStyleChange({
        customPositions: {},
      });
    }
  };

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

      {customPositionCount > 0 && (
        <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs border border-green-200 dark:border-green-800">
          <div className="flex items-center">
            <Save className="h-3 w-3 mr-1 text-green-600" />
            <span className="text-green-700 dark:text-green-300">
              💡 <strong>Astuce :</strong> Vous pouvez sauvegarder cette disposition personnalisée
              en créant un nouveau preset dans "Style des étiquettes"
            </span>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default LabelPreview;
