import React from 'react';
import { Printer, RotateCcw, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { useAccordion } from '../hooks/useAccordion';
import PresetManager from './PresetManager';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const RollDimensionsConfig = () => {
  const { currentLayout, updateLayout, reset, managePresets, savedPresets } = useLabelExportStore();

  const { toggle, isOpen } = useAccordion([]);

  const handleChange = (field, value) => {
    updateLayout(field, value);
  };

  const handleResetRollLayout = () => {
    reset('layout');
    console.log('🎞️ Layout Rouleau réinitialisé aux valeurs par défaut');
  };

  const handleSavePreset = async (name, isPublic = false) => {
    return await managePresets('save', 'layout', { name, isPublic });
  };

  const handleLoadPreset = async (presetId) => {
    return await managePresets('apply', 'layout', { id: presetId });
  };

  const handleDeletePreset = async (presetId) => {
    return await managePresets('delete', 'layout', { id: presetId });
  };

  const layoutPresets = savedPresets.layout || [];

  const rouleauWidth = currentLayout.rouleau?.width || 29;
  const margeInterieure = 1; // 🎯 MARGE FIXE À 1MM - définie dans le store
  const labelHeight = parseFloat(currentLayout.height) || 15;

  const etiquettePhysique = rouleauWidth - margeInterieure * 2;
  const isValidConfig = etiquettePhysique > 10; // Simplifié car marge = 1mm toujours

  // Recalcul automatique de la largeur imprimable
  React.useEffect(() => {
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
          {/* 🎯 Suppression du champ marge - maintenant fixe */}
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

      <div className="border border-gray-200 dark:border-gray-600 rounded">
        <button
          type="button"
          onClick={() => toggle('presets')}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t"
        >
          <div className="flex items-center">
            <Save className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Presets Rouleau
            </span>
            {layoutPresets.length > 0 && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                {layoutPresets.length}
              </span>
            )}
          </div>
          {isOpen('presets') ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>

        {isOpen('presets') && (
          <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-600">
            <PresetManager
              savedPresets={layoutPresets}
              onSavePreset={handleSavePreset}
              onLoadPreset={handleLoadPreset}
              onDeletePreset={handleDeletePreset}
              title="Presets Rouleau sauvegardés"
              emptyMessage="Aucun preset rouleau sauvegardé"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RollDimensionsConfig;
