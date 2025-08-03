//AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\LabelDimensionsConfig.jsx
import React from 'react';
import A4DimensionsConfig from './A4DimensionsConfig';
import RollDimensionsConfig from './RollDimensionsConfig';

const LabelDimensionsConfig = ({
  customLayout,
  onLayoutChange,
  supportTypes = [
    { id: 'A4', name: 'A4 (210×297mm)', description: 'Feuille A4 standard' },
    { id: 'rouleau', name: "Rouleau d'étiquettes", description: 'Support rouleau continu' },
    { id: 'custom', name: 'Format personnalisé', description: 'Dimensions sur mesure' },
  ],
  onSupportTypeChange,
  onReset,
  savedPresets = [],
  loading = false,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}) => {
  const currentSupportType = customLayout?.supportType || 'A4';

  // Délégation vers le composant spécialisé selon le type de support
  if (currentSupportType === 'rouleau') {
    return (
      <RollDimensionsConfig
        customLayout={customLayout}
        onLayoutChange={onLayoutChange}
        onReset={onReset}
        savedPresets={savedPresets}
        loading={loading}
        onSavePreset={onSavePreset}
        onLoadPreset={onLoadPreset}
        onDeletePreset={onDeletePreset}
      />
    );
  }

  // Pour A4 et custom (logique similaire)
  return (
    <A4DimensionsConfig
      customLayout={customLayout}
      onLayoutChange={onLayoutChange}
      supportTypes={supportTypes}
      onSupportTypeChange={onSupportTypeChange}
      onReset={onReset}
      savedPresets={savedPresets}
      loading={loading}
      onSavePreset={onSavePreset}
      onLoadPreset={onLoadPreset}
      onDeletePreset={onDeletePreset}
    />
  );
};

export default LabelDimensionsConfig;
