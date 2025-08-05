import React from 'react';
import { Printer, RotateCcw } from 'lucide-react';
import PresetManager from './PresetManager';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const RollDimensionsConfig = () => {
  const {
    currentLayout,
    updateLayout,
    reset, // 🆕 API unifiée
    managePresets, // 🆕 API unifiée pour presets
    savedPresets, // 🆕 Accès direct aux presets
  } = useLabelExportStore();

  const handleChange = (field, value) => {
    updateLayout(field, value);
  };

  // 🆕 Handler reset simplifié avec nouvelle API
  const handleResetRollLayout = () => {
    reset('layout'); // 🎯 Au lieu de resetRollLayoutOnly()
    console.log('🎞️ Layout Rouleau réinitialisé aux valeurs par défaut');
  };

  // 🆕 Handlers presets avec API unifiée
  const handleSavePreset = async (name, isPublic = false) => {
    return await managePresets('save', 'layout', { name, isPublic });
  };

  const handleLoadPreset = async (presetId) => {
    return await managePresets('apply', 'layout', { id: presetId });
  };

  const handleDeletePreset = async (presetId) => {
    return await managePresets('delete', 'layout', { id: presetId });
  };

  // 🆕 Accès direct aux presets depuis le store
  const layoutPresets = savedPresets.layout || [];

  // Logique de calcul automatique des dimensions
  const rouleauWidth = currentLayout.rouleau?.width || 58;
  const margeInterieure = parseFloat(currentLayout.padding) || 3;
  const labelHeight = parseFloat(currentLayout.height) || 29;

  // Calcul automatique de l'étiquette physique
  const etiquettePhysique = rouleauWidth - margeInterieure * 2;
  const isValidConfig = etiquettePhysique > 10 && margeInterieure >= 1;

  // 🆕 Mettre à jour automatiquement la largeur physique
  React.useEffect(() => {
    if (isValidConfig && etiquettePhysique !== parseFloat(currentLayout.width)) {
      handleChange('width', etiquettePhysique.toFixed(1));
    }
  }, [rouleauWidth, margeInterieure, etiquettePhysique, isValidConfig]);

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

      {/* Status impression avec validation intelligente */}
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
          {!isValidConfig && ' • Réduisez la marge ou augmentez la largeur du rouleau'}
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
              min="1"
              max="10"
              value={margeInterieure}
              onChange={(e) =>
                handleChange('padding', Math.max(1, parseFloat(e.target.value) || 1))
              }
              className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
              placeholder="3"
            />
            <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
              Marge tout autour de l'étiquette
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
              Largeur étiquette (calculée automatiquement)
            </label>
            <div className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-mono">
              {etiquettePhysique.toFixed(1)} mm
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              = {rouleauWidth}mm - (2 × {margeInterieure}mm)
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

      {/* 🆕 Récapitulatif visuel amélioré */}
      <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          📋 L'aperçu reflète l'étiquette physique de{' '}
          <strong className={isValidConfig ? 'text-green-600' : 'text-red-600'}>
            {etiquettePhysique.toFixed(1)}×{labelHeight}mm
          </strong>{' '}
          avec une marge intérieure de <strong>{margeInterieure}mm</strong>
          {isValidConfig && ' ✅'}
        </div>
      </div>

      {/* 🆕 Gestion des presets avec API unifiée */}
      <PresetManager
        savedPresets={layoutPresets}
        onSavePreset={handleSavePreset}
        onLoadPreset={handleLoadPreset}
        onDeletePreset={handleDeletePreset}
        title="Presets Rouleau sauvegardés"
        emptyMessage="Aucun preset rouleau sauvegardé"
      />
    </div>
  );
};

export default RollDimensionsConfig;
