// 📁 components/LabelStyleConfig.jsx
import React from 'react';
import { Palette, RotateCcw, Save } from 'lucide-react';
import PresetManager from './PresetManager';

const LabelStyleConfig = ({
  labelStyle,
  onStyleChange,
  onReset,
  // 🆕 Props pour presets
  savedPresets = [],
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
        <Palette className="h-4 w-4 mr-2" />
        Style des étiquettes
      </h4>

      {/* Bouton de réinitialisation */}
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

    <div className="space-y-3">
      {/* Éléments à afficher */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={labelStyle.showName}
            onChange={(e) => onStyleChange({ showName: e.target.checked })}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Nom produit</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={labelStyle.showPrice}
            onChange={(e) => onStyleChange({ showPrice: e.target.checked })}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Prix</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={labelStyle.showBarcode}
            onChange={(e) => onStyleChange({ showBarcode: e.target.checked })}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Code-barres</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={labelStyle.showBorder}
            onChange={(e) => onStyleChange({ showBorder: e.target.checked })}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Bordure</span>
        </label>
      </div>

      {/* Tailles de police */}
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
              onChange={(e) => onStyleChange({ nameSize: parseInt(e.target.value) })}
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
              onChange={(e) => onStyleChange({ priceSize: parseInt(e.target.value) })}
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
              onChange={(e) => onStyleChange({ barcodeHeight: parseInt(e.target.value) })}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
        )}
      </div>

      {/* Indicateur de sauvegarde automatique */}
      <div className="flex items-center justify-center pt-2 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center text-xs text-green-600 dark:text-green-400">
          <Save className="h-3 w-3 mr-1" />
          Paramètres sauvegardés automatiquement
        </div>
      </div>

      {/* 🆕 Gestion des presets */}
      {onSavePreset && (
        <PresetManager
          savedPresets={savedPresets}
          onSavePreset={onSavePreset}
          onLoadPreset={onLoadPreset}
          onDeletePreset={onDeletePreset}
        />
      )}
    </div>
    <div className="mb-4">
      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">
        Rotation du contenu de l'étiquette
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onStyleChange({ contentRotation: 0 })}
          className={`flex-1 px-3 py-2 text-xs rounded border flex items-center justify-center ${
            labelStyle.contentRotation === 0
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-gray-50 border-gray-300 text-gray-600'
          }`}
        >
          <div className="w-8 h-5 border border-current mr-2 flex items-center justify-center text-xs">
            ABC
          </div>
          Normal
        </button>
        <button
          type="button"
          onClick={() => onStyleChange({ contentRotation: 90 })}
          className={`flex-1 px-3 py-2 text-xs rounded border flex items-center justify-center ${
            labelStyle.contentRotation === 90
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-gray-50 border-gray-300 text-gray-600'
          }`}
        >
          <div className="w-5 h-8 border border-current mr-2 flex items-center justify-center text-xs transform rotate-90">
            ABC
          </div>
          Pivoté 90°
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {labelStyle.contentRotation === 90
          ? "🔄 Le texte s'affiche verticalement dans l'étiquette"
          : "➡️ Le texte s'affiche horizontalement dans l'étiquette"}
      </p>
    </div>
  </div>
);

export default LabelStyleConfig;
