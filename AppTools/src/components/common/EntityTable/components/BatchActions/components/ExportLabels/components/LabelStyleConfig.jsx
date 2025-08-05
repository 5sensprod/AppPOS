import React from 'react';
import { Palette, RotateCcw } from 'lucide-react';
import PresetManager from './PresetManager';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const LabelStyleConfig = () => {
  const {
    labelStyle,
    updateStyle,
    reset, // 🆕 API unifiée
    managePresets, // 🆕 API unifiée pour presets
    savedPresets, // 🆕 Accès direct aux presets
  } = useLabelExportStore();

  // 🆕 Handler simplifié avec nouvelle API
  const handleResetStyle = () => {
    reset('style'); // 🎯 Au lieu de resetStyleOnly()
    console.log('🎨 Style réinitialisé (duplicateCount préservé)');
  };

  // 🆕 Handlers presets avec nouvelle API
  const handleSavePreset = async (name, isPublic = false) => {
    return await managePresets('save', 'style', { name, isPublic });
  };

  const handleLoadPreset = async (presetId) => {
    return await managePresets('apply', 'style', { id: presetId });
  };

  const handleDeletePreset = async (presetId) => {
    return await managePresets('delete', 'style', { id: presetId });
  };

  // 🆕 Accès direct aux presets depuis le store
  const stylePresets = savedPresets.style || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Palette className="h-4 w-4 mr-2" />
          Style des étiquettes
        </h4>

        <button
          type="button"
          onClick={handleResetStyle}
          className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Réinitialiser le style aux valeurs par défaut"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Réinitialiser style
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={labelStyle.showName}
              onChange={(e) => updateStyle({ showName: e.target.checked })}
              className="mr-2 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Nom produit</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={labelStyle.showPrice}
              onChange={(e) => updateStyle({ showPrice: e.target.checked })}
              className="mr-2 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Prix</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={labelStyle.showBarcode}
              onChange={(e) => updateStyle({ showBarcode: e.target.checked })}
              className="mr-2 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Code-barres</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={labelStyle.showBorder}
              onChange={(e) => updateStyle({ showBorder: e.target.checked })}
              className="mr-2 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Bordure</span>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {labelStyle.showName && (
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Taille nom
              </label>
              <input
                type="number"
                min="6"
                max="20"
                value={labelStyle.nameSize}
                onChange={(e) => updateStyle({ nameSize: parseInt(e.target.value) })}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
              />
            </div>
          )}
          {labelStyle.showPrice && (
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Taille prix
              </label>
              <input
                type="number"
                min="8"
                max="24"
                value={labelStyle.priceSize}
                onChange={(e) => updateStyle({ priceSize: parseInt(e.target.value) })}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
              />
            </div>
          )}
          {labelStyle.showBarcode && (
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Hauteur code-barres
              </label>
              <input
                type="number"
                min="10"
                max="30"
                value={labelStyle.barcodeHeight}
                onChange={(e) => updateStyle({ barcodeHeight: parseInt(e.target.value) })}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
              />
            </div>
          )}
        </div>

        {/* 🆕 PresetManager avec nouveaux handlers */}
        <PresetManager
          savedPresets={stylePresets}
          onSavePreset={handleSavePreset}
          onLoadPreset={handleLoadPreset}
          onDeletePreset={handleDeletePreset}
          title="Presets de style"
          emptyMessage="Aucun preset de style sauvegardé"
        />
      </div>
    </div>
  );
};

export default LabelStyleConfig;
