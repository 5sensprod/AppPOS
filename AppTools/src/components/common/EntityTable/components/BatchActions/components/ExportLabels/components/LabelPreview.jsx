import React, { useState, useEffect } from 'react';
import { Eye, Ruler, Move, RotateCcw } from 'lucide-react';
import FabricLabelCanvas from './FabricLabelCanvas';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const LabelPreview = () => {
  const {
    labelStyle,
    currentLayout,
    updateStyle,
    extractLabelData,
    reset, // 🆕 API unifiée
  } = useLabelExportStore();

  const labelData = extractLabelData();

  if (!labelData || labelData.length === 0) return null;

  const sampleLabel = labelData[0];
  const [customPositions, setCustomPositions] = useState({});

  // Initialiser les positions depuis le store
  useEffect(() => {
    if (labelStyle.customPositions && Object.keys(labelStyle.customPositions).length > 0) {
      setCustomPositions(labelStyle.customPositions);
    } else {
      setCustomPositions({});
    }
  }, [labelStyle.customPositions]);

  // Reset des positions lors de changements MAJEURS seulement (pas les dimensions)
  useEffect(() => {
    setCustomPositions({});
    updateStyle({ customPositions: {} });
  }, [
    currentLayout.supportType, // Seul le type de support reset les positions
    sampleLabel.id, // Changement de produit
    updateStyle,
  ]);

  // 🆕 Handler pour changement de position
  const handlePositionChange = (positionData) => {
    const newPositions = {
      ...customPositions,
      [positionData.objectType]: positionData.position,
    };

    setCustomPositions(newPositions);
    updateStyle({ customPositions: newPositions });
  };

  // 🆕 Handler reset simplifié avec nouvelle API
  const handleResetPositions = () => {
    setCustomPositions({});
    reset('positions'); // 🎯 Au lieu de resetCustomPositionsOnly()
    console.log('📍 Positions personnalisées réinitialisées');
  };

  const customPositionCount = Object.keys(customPositions).length;
  const physicalWidth = currentLayout.width;
  const physicalHeight = currentLayout.height;

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
            {physicalWidth} × {physicalHeight} mm
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

      {/* 🆕 Bannière d'aide interactive améliorée */}
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
              Réinitialiser positions
            </button>
          )}
        </div>

        {/* 🆕 Aide contextuelle selon le mode */}
        <div className="mt-1 text-blue-600 dark:text-blue-300">
          {currentLayout.supportType === 'rouleau'
            ? "🎞️ Mode rouleau - Les positions seront conservées pour l'impression directe"
            : '📄 Mode A4 - Les positions seront appliquées à toutes les étiquettes du PDF'}
        </div>
      </div>

      {/* Canvas d'aperçu */}
      <div className="flex justify-center">
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
          <FabricLabelCanvas
            label={sampleLabel}
            layout={currentLayout}
            style={{
              ...labelStyle,
              customPositions: customPositions,
            }}
            onPositionChange={handlePositionChange}
          />
        </div>
      </div>

      {/* 🆕 Statistiques de positionnement */}
      {customPositionCount > 0 && (
        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
          <div className="text-xs text-green-700 dark:text-green-300">
            <div className="font-medium mb-1">📍 Positions personnalisées actives :</div>
            <div className="space-y-1">
              {Object.entries(customPositions).map(([type, position]) => (
                <div key={type} className="flex justify-between">
                  <span className="capitalize">{type} :</span>
                  <span>
                    x:{position.x?.toFixed(1)}mm, y:{position.y?.toFixed(1)}mm
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Aide pour les utilisateurs sans positions custom */}
      {customPositionCount === 0 && (
        <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            💡 <strong>Astuce :</strong> Les éléments sont positionnés automatiquement. Vous pouvez
            les déplacer en cliquant et glissant sur l'aperçu ci-dessus.
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelPreview;
