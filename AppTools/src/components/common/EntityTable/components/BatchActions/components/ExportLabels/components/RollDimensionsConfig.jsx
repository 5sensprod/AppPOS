//AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\RollDimensionsConfig.jsx
import React from 'react';
import { Printer, RotateCcw, AlertCircle } from 'lucide-react';
import PresetManager from './PresetManager';

const RollDimensionsConfig = ({
  customLayout,
  onLayoutChange,
  onReset,
  savedPresets = [],
  loading = false,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}) => {
  const handleChange = (field, value) => {
    if (onLayoutChange && typeof onLayoutChange === 'function') {
      onLayoutChange(field, value);
    }
  };

  // Calculs automatiques
  const rouleauWidth = customLayout.rouleau?.width || 58;
  const offsetLeft = Math.max(customLayout.offsetLeft || 5, 3); // Minimum 3mm
  const calculatedLabelWidth = rouleauWidth - offsetLeft * 2;

  // Mettre à jour automatiquement la largeur d'étiquette calculée
  React.useEffect(() => {
    if (calculatedLabelWidth > 0) {
      handleChange('width', calculatedLabelWidth.toFixed(1));
    }
  }, [rouleauWidth, offsetLeft]);

  const isValidConfig = calculatedLabelWidth > 10; // Au moins 10mm d'étiquette utile

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Printer className="h-4 w-4 mr-2" />
          Configuration Rouleau - Impression continue
        </h4>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Réinitialiser aux valeurs par défaut"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Status impression */}
      <div
        className={`mb-3 p-3 rounded border ${
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
            className={`text-sm ${
              isValidConfig
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            Étiquette : {calculatedLabelWidth.toFixed(1)}mm
          </span>
        </div>
        <div
          className={`text-xs ${
            isValidConfig ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'
          }`}
        >
          🎯 Mode rouleau • Découpe automatique • Largeur calculée automatiquement
          {!isValidConfig && ' • Augmentez la largeur du rouleau ou réduisez les marges'}
        </div>
      </div>

      {/* Configuration rouleau */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
        <h5 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center">
          <Printer className="h-3 w-3 mr-1" />
          Paramètres du rouleau
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
              placeholder="58"
            />
            <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
              Largeur physique du support
            </div>
          </div>

          <div>
            <label className="block text-xs text-blue-600 dark:text-blue-300 mb-1">
              Marge intérieure (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="3"
              max="20"
              value={offsetLeft}
              onChange={(e) =>
                handleChange('offsetLeft', Math.max(3, parseFloat(e.target.value) || 3))
              }
              className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
              placeholder="5"
            />
            <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
              Minimum 3mm (sécurité)
            </div>
          </div>
        </div>
      </div>

      {/* Configuration étiquettes - Largeur calculée automatiquement */}
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Dimensions des étiquettes
        </h5>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Largeur étiquette (calculée)
            </label>
            <div className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
              {calculatedLabelWidth.toFixed(1)} mm
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              = {rouleauWidth}mm - (2 × {offsetLeft}mm)
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Hauteur étiquette (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="15"
              max="200"
              value={customLayout.height || 29}
              onChange={(e) => handleChange('height', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Découpe automatique par l'étiqueteuse
            </div>
          </div>
        </div>
      </div>

      {/* Configuration marge de début uniquement */}
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Marges d'impression
        </h5>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Marge de début (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={customLayout.offsetTop || 2}
              onChange={(e) => handleChange('offsetTop', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Espace avant la première étiquette (optionnel)
            </div>
          </div>
        </div>
      </div>

      {/* Information sur la preview */}
      <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          📋 L'aperçu reflète l'impression réelle : étiquette de{' '}
          <strong>
            {calculatedLabelWidth.toFixed(1)}×{customLayout.height || 29}mm
          </strong>
          centrée dans un rouleau de <strong>{rouleauWidth}mm</strong>
        </div>
      </div>

      {/* Gestion des presets */}
      {onSavePreset && (
        <PresetManager
          savedPresets={savedPresets}
          loading={loading}
          onSavePreset={onSavePreset}
          onLoadPreset={onLoadPreset}
          onDeletePreset={onDeletePreset}
          title="Presets Rouleau sauvegardés"
          emptyMessage="Aucun preset rouleau sauvegardé"
        />
      )}
    </div>
  );
};

export default RollDimensionsConfig;
