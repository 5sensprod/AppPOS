//AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportModal\components\LabelDimensionsConfig.jsx
import React from 'react';
import { Settings, RotateCcw } from 'lucide-react';
import PresetManager from './PresetManager';

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
  // Calcul des dimensions selon le type de support
  const calculateGridDimensions = () => {
    if (customLayout.supportType === 'rouleau') {
      // Mode rouleau : 1 colonne, hauteur infinie
      const rouleauWidth = customLayout.rouleau?.width || 58;
      const labelWidth = customLayout.width || 48.5;
      const offsetLeft = customLayout.offsetLeft || 5;

      // Vérifier si l'étiquette rentre dans le rouleau
      const maxLabelWidth = rouleauWidth - offsetLeft * 2;
      const canFit = labelWidth <= maxLabelWidth;

      return {
        columns: 1,
        rows: '∞',
        total: '1 par ligne',
        canFit,
        maxLabelWidth: maxLabelWidth.toFixed(1),
      };
    } else {
      // Mode A4 : grille classique
      const pageWidth = 210;
      const pageHeight = 297;
      const usableWidth = pageWidth - (customLayout.offsetLeft || 8) * 2;
      const usableHeight = pageHeight - (customLayout.offsetTop || 22) * 2;
      const columns = Math.floor(
        usableWidth / ((customLayout.width || 48.5) + (customLayout.spacingH || 0))
      );
      const rows = Math.floor(
        usableHeight / ((customLayout.height || 25) + (customLayout.spacingV || 0))
      );
      return { columns, rows, total: columns * rows, canFit: true };
    }
  };

  const gridDimensions = calculateGridDimensions();

  // Gestion des changements
  const handleChange = (field, value) => {
    if (onLayoutChange && typeof onLayoutChange === 'function') {
      onLayoutChange(field, value);
    }
  };

  const handleSupportTypeChange = (newType) => {
    if (onSupportTypeChange && typeof onSupportTypeChange === 'function') {
      onSupportTypeChange(newType);
    }
  };

  return (
    <div
      key={`config-${customLayout?.supportType || 'default'}`}
      className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          Configuration du support
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

      {/* Informations selon le type de support */}
      {customLayout.supportType === 'rouleau' ? (
        // Mode rouleau : informations simplifiées
        <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <span className="text-green-700 dark:text-green-300 font-medium">
              Mode rouleau: 1 étiquette par ligne
            </span>
            <span className="text-green-600 dark:text-green-400">Impression continue</span>
          </div>
        </div>
      ) : (
        // Mode A4 : grille classique
        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
          <div className="flex items-center justify-between">
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              Grille: {gridDimensions.columns} × {gridDimensions.rows}
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              Total: {gridDimensions.total} étiquettes/page
            </span>
          </div>
        </div>
      )}

      {/* Sélecteur de type de support */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Type de support
        </h5>
        <select
          value={customLayout.supportType || 'A4'}
          onChange={(e) => handleSupportTypeChange(e.target.value)}
          className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
        >
          {supportTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} - {type.description}
            </option>
          ))}
        </select>
      </div>

      {/* Configuration spécifique au rouleau */}
      {customLayout.supportType === 'rouleau' && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700">
          {/* <h5 className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Configuration rouleau
          </h5> */}
          <div>
            <label className="block text-xs text-yellow-700 dark:text-yellow-300 mb-1">
              Largeur rouleau (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="20"
              max="200"
              value={customLayout.rouleau?.width || 58}
              onChange={(e) => handleChange('rouleau.width', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-yellow-300 dark:border-yellow-600 rounded focus:ring-1 focus:ring-yellow-500 bg-white dark:bg-gray-700"
              placeholder="58"
            />
          </div>
        </div>
      )}

      {/* Configuration des dimensions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Largeur Cellule (mm)
          </label>
          <input
            type="number"
            step="0.1"
            value={customLayout.width}
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
            value={customLayout.height}
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
            value={customLayout.offsetTop}
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
            value={customLayout.offsetLeft}
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
            value={customLayout.spacingV}
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
            value={customLayout.spacingH}
            onChange={(e) => handleChange('spacingH', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            disabled={customLayout.supportType === 'rouleau'}
            title={customLayout.supportType === 'rouleau' ? 'Non applicable en mode rouleau' : ''}
          />
        </div>
      </div>

      {/* Gestion des presets */}
      {onSavePreset && (
        <PresetManager
          savedPresets={savedPresets}
          loading={loading}
          onSavePreset={onSavePreset}
          onLoadPreset={onLoadPreset}
          onDeletePreset={onDeletePreset}
          title="Mes presets de layout"
          emptyMessage="Aucun preset de layout sauvegardé"
        />
      )}
    </div>
  );
};

export default LabelDimensionsConfig;
