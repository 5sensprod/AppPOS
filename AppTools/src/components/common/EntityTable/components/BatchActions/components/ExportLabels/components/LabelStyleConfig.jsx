import React, { useState, useEffect } from 'react';
import { RotateCcw, ChevronDown, ChevronRight, Save, Move } from 'lucide-react';
import { useAccordion } from '../hooks/useAccordion';
import FabricLabelCanvas from './FabricLabelCanvas';
import PresetManager from './PresetManager';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const LabelStyleConfig = () => {
  const {
    labelStyle,
    currentLayout,
    updateStyle,
    extractLabelData,
    reset,
    managePresets,
    savedPresets,
  } = useLabelExportStore();

  const { toggle, isOpen } = useAccordion([]);
  const labelData = extractLabelData();
  const sampleLabel = labelData.length > 0 ? labelData[0] : null;
  const [customPositions, setCustomPositions] = useState({});

  // Initialiser les positions depuis le store
  useEffect(() => {
    if (labelStyle.customPositions && Object.keys(labelStyle.customPositions).length > 0) {
      setCustomPositions(labelStyle.customPositions);
    } else {
      setCustomPositions({});
    }
  }, [labelStyle.customPositions]);

  // Reset des positions lors de changements MAJEURS
  useEffect(() => {
    setCustomPositions({});
    updateStyle({ customPositions: {} });
  }, [currentLayout.supportType, sampleLabel?.id, updateStyle]);

  const handlePositionChange = (positionData) => {
    const newPositions = {
      ...customPositions,
      [positionData.objectType]: positionData.position,
    };

    setCustomPositions(newPositions);
    updateStyle({ customPositions: newPositions });
  };

  const handleResetStyle = (e) => {
    reset('style');
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
  const customPositionCount = Object.keys(customPositions).length;

  return (
    <div className="space-y-4">
      {/* 🔧 Aperçu en haut - Canvas principal */}
      {sampleLabel && (
        <div className="flex justify-center">
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <FabricLabelCanvas
              label={sampleLabel}
              layout={currentLayout}
              style={{
                ...labelStyle,
                customPositions: customPositions,
              }}
              onPositionChange={handlePositionChange}
            />
          </div>
        </div>
      )}

      {/* 🔧 Contrôles de style en dessous */}
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
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={labelStyle.showName}
            onChange={(e) => {
              updateStyle({ showName: e.target.checked });
            }}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Nom produit</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={labelStyle.showPrice}
            onChange={(e) => {
              updateStyle({ showPrice: e.target.checked });
            }}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Prix</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={labelStyle.showBarcode}
            onChange={(e) => {
              updateStyle({ showBarcode: e.target.checked });
            }}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Code-barres</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={labelStyle.showBorder}
            onChange={(e) => {
              updateStyle({ showBorder: e.target.checked });
            }}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Bordure</span>
        </label>
      </div>

      {/* Tailles conditionnelles */}
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
              onChange={(e) => {
                updateStyle({ nameSize: parseInt(e.target.value) });
              }}
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
                updateStyle({ priceSize: parseInt(e.target.value) });
              }}
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
                updateStyle({ barcodeHeight: parseInt(e.target.value) });
              }}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
        )}
      </div>

      {/* PresetManager dépliable */}
      <div className="border border-gray-200 dark:border-gray-600 rounded">
        <button
          type="button"
          onClick={(e) => {
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

        {isOpen('presets') && (
          <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-600">
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
