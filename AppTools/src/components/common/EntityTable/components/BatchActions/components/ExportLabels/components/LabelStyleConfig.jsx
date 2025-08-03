//AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\LabelStyleConfig.jsx
import React from 'react';
import { Palette, RotateCcw } from 'lucide-react';
import PresetManager from './PresetManager';

const LabelStyleConfig = ({
  labelStyle,
  onStyleChange,
  onReset,
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

      {onSavePreset && (
        <PresetManager
          savedPresets={savedPresets}
          onSavePreset={onSavePreset}
          onLoadPreset={onLoadPreset}
          onDeletePreset={onDeletePreset}
        />
      )}
    </div>
  </div>
);

export default LabelStyleConfig;
