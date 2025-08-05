import React from 'react';
import { Grid, RotateCcw, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { useAccordion } from '../hooks/useAccordion';
import PresetManager from './PresetManager';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const A4DimensionsConfig = () => {
  const { currentLayout, updateLayout, getGridDimensions, reset, managePresets, savedPresets } =
    useLabelExportStore();

  // 🔧 Utiliser le hook useAccordion pour les presets
  const { toggle, isOpen } = useAccordion([]); // Fermé par défaut

  const gridDimensions = getGridDimensions();

  const handleChange = (field, value) => {
    updateLayout(field, value);
  };

  const handleResetA4Layout = (e) => {
    e.stopPropagation();
    reset('layout');
    console.log('📐 Layout A4 réinitialisé aux valeurs par défaut');
  };

  // Handlers presets
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

  return (
    <div className="space-y-4">
      {/* Header avec bouton reset */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Grid className="h-4 w-4 mr-2" />
          Configuration A4 - Planches d'étiquettes
        </h4>

        <button
          type="button"
          onClick={handleResetA4Layout}
          className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Réinitialiser les dimensions A4 aux valeurs par défaut"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Réinitialiser A4
        </button>
      </div>

      {/* Informations grille A4 */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
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
      <div>
        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Dimensions des étiquettes
        </h5>
        <div className="grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
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
              onChange={(e) => {
                e.stopPropagation();
                handleChange('width', e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
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
              onChange={(e) => {
                e.stopPropagation();
                handleChange('height', e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Configuration marges et espacements */}
      <div>
        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Marges et espacements
        </h5>
        <div className="grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
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
              onChange={(e) => {
                e.stopPropagation();
                handleChange('offsetTop', e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
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
              onChange={(e) => {
                e.stopPropagation();
                handleChange('offsetLeft', e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
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
              onChange={(e) => {
                e.stopPropagation();
                handleChange('spacingV', e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
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
              onChange={(e) => {
                e.stopPropagation();
                handleChange('spacingH', e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Alerte si trop peu d'étiquettes par page */}
      {gridDimensions.total < 4 && (
        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-700">
          <div className="text-xs text-orange-700 dark:text-orange-300">
            ⚠️ Attention : Seulement {gridDimensions.total} étiquette
            {gridDimensions.total > 1 ? 's' : ''} par page. Réduisez les dimensions ou marges pour
            optimiser l'utilisation du papier.
          </div>
        </div>
      )}

      {/* PresetManager dépliable */}
      <div className="border border-gray-200 dark:border-gray-600 rounded">
        {/* Header cliquable pour les presets */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle('presets');
          }}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t"
        >
          <div className="flex items-center">
            <Save className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Presets A4</span>
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

        {/* Contenu PresetManager */}
        {isOpen('presets') && (
          <div
            className="px-3 pb-3 border-t border-gray-200 dark:border-gray-600"
            onClick={(e) => e.stopPropagation()}
          >
            <PresetManager
              savedPresets={layoutPresets}
              onSavePreset={handleSavePreset}
              onLoadPreset={handleLoadPreset}
              onDeletePreset={handleDeletePreset}
              title="Presets A4 sauvegardés"
              emptyMessage="Aucun preset A4 sauvegardé"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default A4DimensionsConfig;
