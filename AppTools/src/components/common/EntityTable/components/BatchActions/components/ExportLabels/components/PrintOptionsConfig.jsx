// ===== PrintOptionsConfig.jsx REFACTORISÉ =====
import React from 'react';
import { Grid } from 'lucide-react';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const PrintOptionsConfig = () => {
  const { labelStyle, updateStyle, extractLabelData } = useLabelExportStore();

  const labelData = extractLabelData();
  const labelDataLength = labelData.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
        <Grid className="h-4 w-4 mr-2" />
        Options d'impression
      </h4>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Quantité par produit
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={labelStyle.duplicateCount}
            onChange={(e) => updateStyle({ duplicateCount: parseInt(e.target.value) || 1 })}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            placeholder="Nombre d'étiquettes identiques par produit"
          />
          <p className="text-xs text-gray-500 mt-1">
            Chaque produit sera imprimé {labelStyle.duplicateCount} fois
          </p>
        </div>

        <div className="flex items-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3 w-full">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Total étiquettes à imprimer
            </div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {labelDataLength} × {labelStyle.duplicateCount} ={' '}
              {labelDataLength * labelStyle.duplicateCount}
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              {labelDataLength} produit{labelDataLength > 1 ? 's' : ''} sélectionné
              {labelDataLength > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintOptionsConfig;
