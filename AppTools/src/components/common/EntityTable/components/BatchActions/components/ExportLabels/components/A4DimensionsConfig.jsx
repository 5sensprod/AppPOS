// components/A4DimensionsConfig.jsx - VERSION CORRIGÉE
import React from 'react';
import { Grid, RotateCcw } from 'lucide-react';
import PresetManager from './PresetManager';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const A4DimensionsConfig = ({
  savedPresets = [],
  loading = false,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}) => {
  const {
    currentLayout,
    updateLayout,
    getGridDimensions,
    resetA4LayoutOnly, // 🎯 Reset ciblé pour le layout A4 spécifiquement
  } = useLabelExportStore();

  const gridDimensions = getGridDimensions();

  const handleChange = (field, value) => {
    updateLayout(field, value);
  };

  const handleResetA4Layout = () => {
    resetA4LayoutOnly();
    console.log('📐 Layout A4 réinitialisé aux valeurs par défaut');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Grid className="h-4 w-4 mr-2" />
          Configuration A4 - Planches d'étiquettes
        </h4>

        <button
          type="button"
          onClick={handleResetA4Layout} // 🎯 Reset spécifique au layout A4
          className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Réinitialiser les dimensions A4 aux valeurs par défaut"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Réinitialiser A4
        </button>
      </div>

      {/* Informations grille A4 */}
      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-blue-700 dark:text-blue-300 font-medium text-sm">
            Grille calculée : {gridDimensions.columns} × {gridDimensions.rows}
          </span>
          <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">
            {gridDimensions.total} étiquettes/page
          </span>
        </div>
        <div className="text-xs text-blue-600 dark:text-blue-300">
          📄 Format A4 (210×297mm) • Impression par planches • Gestion cellules désactivées
        </div>
      </div>

      {/* Configuration dimensions étiquettes */}
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Dimensions des étiquettes
        </h5>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Largeur étiquette (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="10"
              max="200"
              value={currentLayout.width || 48.5}
              onChange={(e) => handleChange('width', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Hauteur étiquette (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="10"
              max="200"
              value={currentLayout.height || 25}
              onChange={(e) => handleChange('height', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Configuration marges et espacements */}
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Marges et espacements
        </h5>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Marge haute (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="50"
              value={currentLayout.offsetTop || 22}
              onChange={(e) => handleChange('offsetTop', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Marge gauche (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="50"
              value={currentLayout.offsetLeft || 8}
              onChange={(e) => handleChange('offsetLeft', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Espacement vertical (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={currentLayout.spacingV || 0}
              onChange={(e) => handleChange('spacingV', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Espacement horizontal (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={currentLayout.spacingH || 0}
              onChange={(e) => handleChange('spacingH', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Alerte si trop peu d'étiquettes par page */}
      {gridDimensions.total < 4 && (
        <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-700">
          <div className="text-xs text-orange-700 dark:text-orange-300">
            ⚠️ Attention : Seulement {gridDimensions.total} étiquette
            {gridDimensions.total > 1 ? 's' : ''} par page. Réduisez les dimensions ou marges pour
            optimiser l'utilisation du papier.
          </div>
        </div>
      )}

      {/* Gestion des presets */}
      {onSavePreset && (
        <PresetManager
          savedPresets={savedPresets}
          loading={loading}
          onSavePreset={onSavePreset}
          onLoadPreset={onLoadPreset}
          onDeletePreset={onDeletePreset}
          title="Presets A4 sauvegardés"
          emptyMessage="Aucun preset A4 sauvegardé"
        />
      )}
    </div>
  );
};

export default A4DimensionsConfig;
