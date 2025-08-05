import React from 'react';
import { Palette, RotateCcw, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { useAccordion } from '../hooks/useAccordion';
import PresetManager from './PresetManager';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const LabelStyleConfig = () => {
  const { labelStyle, updateStyle, reset, managePresets, savedPresets } = useLabelExportStore();

  // 🔧 Utiliser le hook useAccordion pour les presets
  const { toggle, isOpen } = useAccordion([]); // Fermé par défaut

  const handleResetStyle = (e) => {
    e.stopPropagation();
    reset('style');
    console.log('🎨 Style réinitialisé (duplicateCount préservé)');
  };

  // Handlers presets
  const handleSavePreset = async (name, isPublic = false) => {
    return await managePresets('save', 'style', { name, isPublic });
  };

  const handleLoadPreset = async (presetId) => {
    return await managePresets('apply', 'style', { id: presetId });
  };

  const handleDeletePreset = async (presetId) => {
    return await managePresets('delete', 'style', { id: presetId });
  };

  const stylePresets = savedPresets.style || [];

  return (
    <div className="space-y-4">
      {/* Bouton reset en haut à droite, sans titre redondant */}
      <div className="flex justify-end">
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

      {/* Checkboxes pour les éléments à afficher */}
      <div className="flex flex-wrap gap-4" onClick={(e) => e.stopPropagation()}>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={labelStyle.showName}
            onChange={(e) => {
              e.stopPropagation();
              updateStyle({ showName: e.target.checked });
            }}
            onClick={(e) => e.stopPropagation()}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Nom produit</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={labelStyle.showPrice}
            onChange={(e) => {
              e.stopPropagation();
              updateStyle({ showPrice: e.target.checked });
            }}
            onClick={(e) => e.stopPropagation()}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Prix</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={labelStyle.showBarcode}
            onChange={(e) => {
              e.stopPropagation();
              updateStyle({ showBarcode: e.target.checked });
            }}
            onClick={(e) => e.stopPropagation()}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Code-barres</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={labelStyle.showBorder}
            onChange={(e) => {
              e.stopPropagation();
              updateStyle({ showBorder: e.target.checked });
            }}
            onClick={(e) => e.stopPropagation()}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Bordure</span>
        </label>
      </div>

      {/* Tailles conditionnelles */}
      <div className="grid grid-cols-3 gap-3" onClick={(e) => e.stopPropagation()}>
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
              onChange={(e) => {
                e.stopPropagation();
                updateStyle({ nameSize: parseInt(e.target.value) });
              }}
              onClick={(e) => e.stopPropagation()}
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
              onChange={(e) => {
                e.stopPropagation();
                updateStyle({ priceSize: parseInt(e.target.value) });
              }}
              onClick={(e) => e.stopPropagation()}
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
              onChange={(e) => {
                e.stopPropagation();
                updateStyle({ barcodeHeight: parseInt(e.target.value) });
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
        )}
      </div>

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
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Presets de style
            </span>
            {stylePresets.length > 0 && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                {stylePresets.length}
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
              savedPresets={stylePresets}
              onSavePreset={handleSavePreset}
              onLoadPreset={handleLoadPreset}
              onDeletePreset={handleDeletePreset}
              title="Presets de style"
              emptyMessage="Aucun preset de style sauvegardé"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LabelStyleConfig;
