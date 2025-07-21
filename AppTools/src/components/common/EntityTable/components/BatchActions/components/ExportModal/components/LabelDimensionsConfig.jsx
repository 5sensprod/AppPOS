// 📁 components/LabelDimensionsConfig.jsx
import React from 'react';
import { Settings } from 'lucide-react';

const LabelDimensionsConfig = ({ customLayout, onLayoutChange }) => (
  <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
      <Settings className="h-4 w-4 mr-2" />
      Configuration
    </h4>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          Largeur Cellule (mm)
        </label>
        <input
          type="number"
          step="0.1"
          value={customLayout.width}
          onChange={(e) => onLayoutChange('width', e.target.value)}
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
          value={customLayout.height}
          onChange={(e) => onLayoutChange('height', e.target.value)}
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
          value={customLayout.offsetTop}
          onChange={(e) => onLayoutChange('offsetTop', e.target.value)}
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
          value={customLayout.offsetLeft}
          onChange={(e) => onLayoutChange('offsetLeft', e.target.value)}
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
          value={customLayout.spacingV}
          onChange={(e) => onLayoutChange('spacingV', e.target.value)}
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
          value={customLayout.spacingH}
          onChange={(e) => onLayoutChange('spacingH', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
        />
      </div>
    </div>
  </div>
);

export default LabelDimensionsConfig;
