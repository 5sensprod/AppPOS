// 📁 components/LabelDimensionsConfig.jsx - Avec presets
import React from 'react';
import { Settings, RotateCcw, Save } from 'lucide-react';
import { usePrintLayoutConfiguration } from '../hooks/usePrintLayoutConfiguration';
import PresetManager from './PresetManager';

const LabelDimensionsConfig = ({ customLayout, onLayoutChange }) => {
  const {
    currentLayout,
    savedPresets,
    loading,
    handleLayoutChange: handlePrintLayoutChange,
    savePreset,
    loadPreset,
    deletePreset,
    resetLayout,
    calculateGridDimensions,
  } = usePrintLayoutConfiguration(onLayoutChange);

  // Utiliser les valeurs du hook si disponibles, sinon fallback sur les props
  const activeLayout = currentLayout || customLayout;
  const gridDimensions = calculateGridDimensions();

  // Wrapper pour les changements de layout
  const handleChange = (field, value) => {
    // Mettre à jour le hook interne
    handlePrintLayoutChange(field, value);

    // Notifier aussi le parent via les props (compatibilité)
    if (onLayoutChange && typeof onLayoutChange === 'function') {
      onLayoutChange(field, value);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          Configuration du support
        </h4>

        {/* Bouton de réinitialisation */}
        <button
          type="button"
          onClick={resetLayout}
          className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Réinitialiser aux valeurs par défaut"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Réinitialiser
        </button>
      </div>

      {/* Informations de grille */}
      <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
        <div className="flex items-center justify-between">
          <span className="text-blue-700 dark:text-blue-300 font-medium">
            📐 Grille: {gridDimensions.columns} × {gridDimensions.rows}
          </span>
          <span className="text-blue-600 dark:text-blue-400">
            🏷️ Total: {gridDimensions.total} étiquettes/page
          </span>
        </div>
      </div>

      {/* Configuration des dimensions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Largeur Cellule (mm)
          </label>
          <input
            type="number"
            step="0.1"
            value={activeLayout.width}
            onChange={(e) => handleChange('width', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Hauteur Cellule (mm)
          </label>
          <input
            type="number"
            step="0.1"
            value={activeLayout.height}
            onChange={(e) => handleChange('height', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Offset Haut (mm)
          </label>
          <input
            type="number"
            step="0.1"
            value={activeLayout.offsetTop}
            onChange={(e) => handleChange('offsetTop', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Offset Gauche (mm)
          </label>
          <input
            type="number"
            step="0.1"
            value={activeLayout.offsetLeft}
            onChange={(e) => handleChange('offsetLeft', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Espacement Vertical (mm)
          </label>
          <input
            type="number"
            step="0.1"
            value={activeLayout.spacingV}
            onChange={(e) => handleChange('spacingV', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Espacement Horizontal (mm)
          </label>
          <input
            type="number"
            step="0.1"
            value={activeLayout.spacingH}
            onChange={(e) => handleChange('spacingH', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
        </div>
      </div>

      {/* Indicateur de sauvegarde automatique */}
      <div className="flex items-center justify-center pt-2 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center text-xs text-green-600 dark:text-green-400">
          <Save className="h-3 w-3 mr-1" />
          Dimensions sauvegardées automatiquement
        </div>
      </div>

      {/* Gestion des presets */}
      <PresetManager
        savedPresets={savedPresets}
        loading={loading}
        onSavePreset={savePreset}
        onLoadPreset={loadPreset}
        onDeletePreset={deletePreset}
        title="Mes presets de layout"
        emptyMessage="Aucun preset de layout sauvegardé"
      />
    </div>
  );
};

export default LabelDimensionsConfig;
