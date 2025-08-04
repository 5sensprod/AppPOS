// components/RollDimensionsConfig.jsx - CORRIGÉ avec logique de positionnement
import React from 'react';
import { Printer, RotateCcw } from 'lucide-react';
import PresetManager from './PresetManager';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const RollDimensionsConfig = ({
  savedPresets = [],
  loading = false,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}) => {
  const { currentLayout, updateLayout, resetRollLayoutOnly } = useLabelExportStore();

  const handleChange = (field, value) => {
    updateLayout(field, value);
  };

  const handleResetRollLayout = () => {
    resetRollLayoutOnly();
    console.log('🎞️ Layout Rouleau réinitialisé aux valeurs par défaut');
  };

  // 🎯 NOUVELLE LOGIQUE : Zone imprimable calculée automatiquement
  const rouleauWidth = currentLayout.rouleau?.width || 58;
  const margeSecurite = parseFloat(currentLayout.offsetLeft) || 5; // Marge de sécurité définie par l'utilisateur
  const labelHeight = parseFloat(currentLayout.height) || 29;

  // Calcul automatique de la zone imprimable
  const zoneImprimable = rouleauWidth - margeSecurite * 2;
  const isValidConfig = zoneImprimable > 10 && margeSecurite >= 3; // Zone min 10mm, marge min 3mm

  // 🆕 Mettre à jour automatiquement la largeur (zone imprimable) dans le store
  React.useEffect(() => {
    if (isValidConfig && zoneImprimable !== parseFloat(currentLayout.width)) {
      handleChange('width', zoneImprimable.toFixed(1));
    }
  }, [rouleauWidth, margeSecurite, zoneImprimable, isValidConfig]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-3">
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

      {/* Status impression avec nouvelle logique */}
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
            Étiquette : {zoneImprimable.toFixed(1)}×{labelHeight}mm (zone imprimable)
          </span>
        </div>
        <div
          className={`text-xs ${
            isValidConfig ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'
          }`}
        >
          🎯 Mode rouleau • Découpe automatique • Zone imprimable : {zoneImprimable.toFixed(1)}mm
          (marges {margeSecurite}mm)
          {!isValidConfig && ' • Réduisez les marges ou augmentez la largeur du rouleau'}
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
              Marge de sécurité (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="3"
              max="20"
              value={margeSecurite}
              onChange={(e) =>
                handleChange('offsetLeft', Math.max(3, parseFloat(e.target.value) || 3))
              }
              className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
              placeholder="5"
            />
            <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
              Minimum 3mm (espacement des bords)
            </div>
          </div>
        </div>
      </div>

      {/* Configuration étiquettes - Seule la hauteur est modifiable */}
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Dimensions des étiquettes
        </h5>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Zone imprimable (calculée)
            </label>
            <div className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
              {zoneImprimable.toFixed(1)} mm
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              = {rouleauWidth}mm - (2 × {margeSecurite}mm)
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
              value={labelHeight}
              onChange={(e) => handleChange('height', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Découpe automatique par l'imprimante
            </div>
          </div>
        </div>
      </div>

      {/* Information sur la preview */}
      <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          📋 L'aperçu reflète l'impression réelle : zone imprimable de{' '}
          <strong>
            {zoneImprimable.toFixed(1)}×{labelHeight}mm
          </strong>
          dans un rouleau de <strong>{rouleauWidth}mm</strong>
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
