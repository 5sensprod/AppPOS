import React from 'react';
import { useEffect } from 'react';
import { Printer, RotateCcw } from 'lucide-react';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const RollDimensionsConfig = () => {
  const { currentLayout, updateLayout, reset } = useLabelExportStore();

  const handleChange = (field, value) => {
    updateLayout(field, value);
  };

  const handleResetRollLayout = () => {
    reset('layout');
  };

  const rouleauWidth = currentLayout.rouleau?.width || 29;
  const margeInterieure = 1;
  const labelHeight = parseFloat(currentLayout.height) || 15;

  const etiquettePhysique = rouleauWidth - margeInterieure * 2;
  const isValidConfig = etiquettePhysique > 10;

  useEffect(() => {
    if (isValidConfig && etiquettePhysique !== parseFloat(currentLayout.width)) {
      handleChange('width', etiquettePhysique.toFixed(1));
    }
  }, [rouleauWidth, etiquettePhysique, isValidConfig]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Printer className="h-4 w-4 mr-2" />
          Configuration Rouleau - Impression continue
        </h4>

        <button
          type="button"
          onClick={handleResetRollLayout}
          className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Réinitialiser les dimensions rouleau aux valeurs par défaut"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Réinitialiser Rouleau
        </button>
      </div>

      <div
        className={`p-3 rounded border ${
          isValidConfig
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className={`font-medium text-sm ${
              isValidConfig
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}
          >
            {isValidConfig ? '✅ Configuration valide' : '❌ Configuration invalide'}
          </span>
          <span
            className={`text-sm font-semibold ${
              isValidConfig
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            Étiquette : {etiquettePhysique.toFixed(1)}×{labelHeight}mm
          </span>
        </div>
        <div
          className={`text-xs ${
            isValidConfig ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'
          }`}
        >
          🎯 Mode rouleau • Découpe automatique • Marge intérieure : {margeInterieure}mm tout autour
          (optimisée)
          {!isValidConfig && ' • Augmentez la largeur du rouleau'}
        </div>
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
        <h5 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center">
          <Printer className="h-3 w-3 mr-1" />
          Paramètres du rouleau et de l'étiquette
        </h5>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-blue-600 dark:text-blue-300 mb-1">
              Largeur rouleau (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="20"
              max="200"
              value={rouleauWidth}
              onChange={(e) => handleChange('rouleau.width', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
              placeholder="29"
            />
          </div>

          <div>
            <label className="block text-xs text-blue-600 dark:text-blue-300 mb-1">
              Hauteur étiquette (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="15"
              max="200"
              value={labelHeight}
              onChange={(e) => handleChange('height', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RollDimensionsConfig;
