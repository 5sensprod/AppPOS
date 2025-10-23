import React, { useState, useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import A4DimensionsConfig from './A4DimensionsConfig';
import RollDimensionsConfig from './RollDimensionsConfig';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const LabelDimensionsConfig = () => {
  const { currentLayout, changeSupportType, getSupportTypes, labelStyle, reset } =
    useLabelExportStore();

  const [showPositionWarning, setShowPositionWarning] = useState(false);
  const [previousDimensions, setPreviousDimensions] = useState(null);

  const supportTypes = getSupportTypes();
  const currentSupportType = currentLayout?.supportType || 'A4';
  const hasCustomPositions = Object.keys(labelStyle.customPositions || {}).length > 0;

  // Détecter les changements de dimensions
  useEffect(() => {
    const currentDims = {
      width: currentLayout?.width,
      height: currentLayout?.height,
      supportType: currentLayout?.supportType,
    };

    // Si c'est la première fois, stocker les dimensions
    if (!previousDimensions) {
      setPreviousDimensions(currentDims);
      return;
    }

    // Vérifier si les dimensions ont changé
    const dimensionsChanged =
      previousDimensions.width !== currentDims.width ||
      previousDimensions.height !== currentDims.height ||
      previousDimensions.supportType !== currentDims.supportType;

    // Afficher l'avertissement si dimensions changées ET positions personnalisées existent
    if (dimensionsChanged && hasCustomPositions) {
      setShowPositionWarning(true);
      // Auto-masquer après 5 secondes
      const timeout = setTimeout(() => setShowPositionWarning(false), 5000);
      return () => clearTimeout(timeout);
    }

    setPreviousDimensions(currentDims);
  }, [currentLayout?.width, currentLayout?.height, currentLayout?.supportType, hasCustomPositions]);

  const handleResetPositions = () => {
    reset('positions');
    setShowPositionWarning(false);
  };

  return (
    <div className="space-y-4">
      {/* 🆕 Avertissement de réinitialisation des positions */}
      {showPositionWarning && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-md p-3 animate-pulse">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">
                Positions réinitialisées
              </div>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Les positions personnalisées des éléments ont été réinitialisées car les dimensions
                du canvas ont changé. Les éléments sont repositionnés par défaut.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPositionWarning(false)}
              className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Sélecteur de mode global */}
      <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Type de support
            </h4>
            {hasCustomPositions && (
              <button
                type="button"
                onClick={handleResetPositions}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
                title="Réinitialiser les positions personnalisées"
              >
                <RotateCcw className="h-3 w-3" />
                Reset positions
              </button>
            )}
          </div>
          <select
            value={currentSupportType}
            onChange={(e) => changeSupportType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
          >
            {supportTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} - {type.description}
              </option>
            ))}
          </select>
        </div>

        {/* Info sur les positions personnalisées */}
        {hasCustomPositions && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
            💡 {Object.keys(labelStyle.customPositions).length} élément(s) avec position
            personnalisée
          </div>
        )}
      </div>

      {/* 🎯 Délégation vers le composant spécialisé - Composants autonomes ! */}
      {currentSupportType === 'rouleau' ? <RollDimensionsConfig /> : <A4DimensionsConfig />}
    </div>
  );
};

export default LabelDimensionsConfig;
