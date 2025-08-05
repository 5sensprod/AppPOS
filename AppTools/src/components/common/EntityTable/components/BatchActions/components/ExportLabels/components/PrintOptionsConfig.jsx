import React from 'react';
import { Grid } from 'lucide-react';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const PrintOptionsConfig = () => {
  const { labelStyle, updateStyle } = useLabelExportStore();

  const duplicateCount = labelStyle.duplicateCount || 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
        <Grid className="h-4 w-4 mr-2" />
        Options d'impression
      </h4>

      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          Quantité par produit
        </label>
        <input
          type="number"
          min="1"
          max="20"
          value={duplicateCount}
          onChange={(e) => updateStyle({ duplicateCount: parseInt(e.target.value) || 1 })}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
          placeholder="Nombre d'étiquettes identiques par produit"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Chaque produit sera imprimé <strong>{duplicateCount}</strong> fois
        </p>
      </div>
    </div>
  );
};

export default PrintOptionsConfig;
