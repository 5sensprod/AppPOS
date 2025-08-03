// ===== LabelDimensionsConfig.jsx REFACTORISÉ =====
import React from 'react';
import A4DimensionsConfig from './A4DimensionsConfig';
import RollDimensionsConfig from './RollDimensionsConfig';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const LabelDimensionsConfig = ({
  onReset,
  savedPresets = [],
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}) => {
  const { currentLayout, changeSupportType, getSupportTypes } = useLabelExportStore();

  const supportTypes = getSupportTypes();
  const currentSupportType = currentLayout?.supportType || 'A4';

  return (
    <div className="space-y-4">
      {/* Sélecteur de mode global */}
      <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Type de support
          </h4>
          <select
            value={currentSupportType}
            onChange={(e) => changeSupportType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
          >
            {supportTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} - {type.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Délégation vers le composant spécialisé selon le type de support */}
      {currentSupportType === 'rouleau' ? (
        <RollDimensionsConfig
          onReset={onReset}
          savedPresets={savedPresets}
          onSavePreset={onSavePreset}
          onLoadPreset={onLoadPreset}
          onDeletePreset={onDeletePreset}
        />
      ) : (
        <A4DimensionsConfig
          onReset={onReset}
          savedPresets={savedPresets}
          onSavePreset={onSavePreset}
          onLoadPreset={onLoadPreset}
          onDeletePreset={onDeletePreset}
        />
      )}
    </div>
  );
};

export default LabelDimensionsConfig;
