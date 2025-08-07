import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Save,
  Tag,
  Euro,
  Barcode,
  Square,
  Eye,
  EyeOff,
  Palette,
} from 'lucide-react';
import { useAccordion } from '../hooks/useAccordion';
import FabricLabelCanvas from './FabricLabelCanvas';
import PresetManager from './PresetManager';
import { useLabelExportStore } from '../stores/useLabelExportStore';

// ===== COMPOSANTS UI COMMUNS =====
const TabButton = ({ active, onClick, icon: Icon, label, enabled, onToggle }) => (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }}
    className={`
      relative px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 flex items-center gap-2
      ${
        active
          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          : enabled
            ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500'
      }
    `}
  >
    <Icon className="h-4 w-4" />
    <span>{label}</span>

    {/* Toggle visibility */}
    <span
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle?.();
      }}
      className={`
    ml-1 p-0.5 rounded transition-colors cursor-pointer
    ${
      enabled
        ? 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
        : 'text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400'
    }
  `}
      title={enabled ? 'Masquer' : 'Afficher'}
    >
      {enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
    </span>
  </button>
);

const ControlGroup = ({ title, children, className = '' }) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4 ${className}`}
  >
    {title && (
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
        <Palette className="h-4 w-4 mr-2 text-gray-500" />
        {title}
      </h4>
    )}
    {children}
  </div>
);

const NumberInput = ({ label, value, onChange, min, max, step = 1, unit = '' }) => (
  <div>
    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</label>
    <div className="relative">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 pr-8"
      />
      {unit && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          {unit}
        </span>
      )}
    </div>
  </div>
);

// ===== PANNEAUX DE CONFIGURATION =====
const NameStylePanel = ({ style, onUpdate }) => (
  <ControlGroup title="Configuration du nom">
    <div className="grid grid-cols-2 gap-4">
      <NumberInput
        label="Taille de police"
        value={style.nameSize}
        onChange={(value) => onUpdate({ nameSize: value })}
        min={6}
        max={24}
        unit="pt"
      />
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Police</label>
        <select
          value={style.nameFontFamily || style.fontFamily || 'Arial'}
          onChange={(e) => onUpdate({ nameFontFamily: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
        >
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Impact">Impact</option>
        </select>
      </div>
    </div>
    <div className="mt-4">
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          Style de police
        </label>
        <select
          value={style.nameWeight || 'bold'}
          onChange={(e) => onUpdate({ nameWeight: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
        >
          <option value="normal">Normal</option>
          <option value="bold">Gras</option>
        </select>
      </div>
    </div>
  </ControlGroup>
);

const PriceStylePanel = ({ style, onUpdate }) => (
  <ControlGroup title="Configuration du prix">
    <div className="grid grid-cols-2 gap-4">
      <NumberInput
        label="Taille de police"
        value={style.priceSize}
        onChange={(value) => onUpdate({ priceSize: value })}
        min={8}
        max={32}
        unit="pt"
      />
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          Style de police
        </label>
        <select
          value={style.priceWeight || 'bold'}
          onChange={(e) => onUpdate({ priceWeight: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
        >
          <option value="normal">Normal</option>
          <option value="bold">Gras</option>
        </select>
      </div>
    </div>
    <div className="mt-4">
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Police</label>
        <select
          value={style.priceFontFamily || style.fontFamily || 'Arial'}
          onChange={(e) => onUpdate({ priceFontFamily: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
        >
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Impact">Impact</option>
        </select>
      </div>
    </div>
  </ControlGroup>
);

const BarcodeStylePanel = ({ style, onUpdate }) => (
  <ControlGroup title="Configuration du code">
    {/* Toggle Code-barres/QR Code */}
    <div className="mb-3">
      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">Type de code</label>
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
        <button
          type="button"
          onClick={() => onUpdate({ barcodeType: 'barcode' })}
          className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
            style.barcodeType === 'barcode'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Barcode className="h-3.5 w-3.5" />
          Code-barres
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ barcodeType: 'qrcode' })}
          className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
            style.barcodeType === 'qrcode'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Square className="h-3.5 w-3.5" />
          QR Code
        </button>
      </div>
    </div>

    {/* Configuration conditionnelle selon le type */}
    {style.barcodeType === 'barcode' ? (
      <>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <NumberInput
            label="Hauteur"
            value={style.barcodeHeight}
            onChange={(value) => onUpdate({ barcodeHeight: value })}
            min={10}
            max={30}
            unit="mm"
          />
          <NumberInput
            label="Largeur"
            value={style.barcodeWidth || 60}
            onChange={(value) => onUpdate({ barcodeWidth: value })}
            min={40}
            max={100}
            step={5}
            unit="%"
          />
        </div>

        <label className="flex items-center mb-2">
          <input
            type="checkbox"
            checked={style.showBarcodeText !== false}
            onChange={(e) => onUpdate({ showBarcodeText: e.target.checked })}
            className="mr-2.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300">
            Afficher les numéros sous le code-barres
          </span>
        </label>

        {style.showBarcodeText !== false && (
          <div className="ml-5 pl-3 border-l-2 border-gray-200 dark:border-gray-600">
            <NumberInput
              label="Taille des numéros"
              value={style.barcodeTextSize || 8}
              onChange={(value) => onUpdate({ barcodeTextSize: value })}
              min={6}
              max={12}
              unit="pt"
            />
          </div>
        )}
      </>
    ) : (
      <>
        <div className="mb-3">
          <NumberInput
            label="Taille du QR Code"
            value={style.qrCodeSize || 5}
            onChange={(value) => onUpdate({ qrCodeSize: value })}
            min={5}
            max={30}
            unit="mm"
          />
        </div>

        <label className="flex items-center mb-2">
          <input
            type="checkbox"
            checked={style.showBarcodeText !== false}
            onChange={(e) => onUpdate({ showBarcodeText: e.target.checked })}
            className="mr-2.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300">
            Afficher le texte sous le QR Code
          </span>
        </label>

        {style.showBarcodeText !== false && (
          <div className="ml-5 pl-3 border-l-2 border-gray-200 dark:border-gray-600">
            <NumberInput
              label="Taille du texte"
              value={style.barcodeTextSize || 8}
              onChange={(value) => onUpdate({ barcodeTextSize: value })}
              min={6}
              max={12}
              unit="pt"
            />
          </div>
        )}
      </>
    )}
  </ControlGroup>
);

const BorderStylePanel = ({ style, onUpdate }) => (
  <ControlGroup title="Configuration de la bordure">
    <div className="grid grid-cols-3 gap-4">
      <NumberInput
        label="Épaisseur"
        value={style.borderWidth || 0.1}
        onChange={(value) => onUpdate({ borderWidth: value })}
        min={0.1}
        max={2}
        step={0.1}
        unit="mm"
      />
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Couleur</label>
        <input
          type="color"
          value={style.borderColor || '#000000'}
          onChange={(e) => onUpdate({ borderColor: e.target.value })}
          className="w-full h-9 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Style</label>
        <select
          value={style.borderStyle || 'solid'}
          onChange={(e) => onUpdate({ borderStyle: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
        >
          <option value="solid">Continu</option>
          <option value="dashed">Tirets</option>
          <option value="dotted">Points</option>
        </select>
      </div>
    </div>
  </ControlGroup>
);

// ===== COMPOSANT PRINCIPAL =====
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

  const { toggle, isOpen } = useAccordion(['']);
  const labelData = extractLabelData();
  const sampleLabel = labelData.length > 0 ? labelData[0] : null;
  const [customPositions, setCustomPositions] = useState({});
  const [activeTab, setActiveTab] = useState('name');

  // Configuration des onglets
  const tabs = [
    {
      id: 'name',
      label: 'Nom',
      icon: Tag,
      enabled: labelStyle.showName,
      toggle: () => updateStyle({ showName: !labelStyle.showName }),
    },
    {
      id: 'price',
      label: 'Prix',
      icon: Euro,
      enabled: labelStyle.showPrice,
      toggle: () => updateStyle({ showPrice: !labelStyle.showPrice }),
    },
    {
      id: 'barcode',
      label: 'Code-barres',
      icon: Barcode,
      enabled: labelStyle.showBarcode,
      toggle: () => updateStyle({ showBarcode: !labelStyle.showBarcode }),
    },
    {
      id: 'border',
      label: 'Bordure',
      icon: Square,
      enabled: labelStyle.showBorder,
      toggle: () => updateStyle({ showBorder: !labelStyle.showBorder }),
    },
  ];

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
  }, [currentLayout.supportType, sampleLabel?.id]); // ⭐ SUPPRESSION de updateStyle

  // Sélectionner automatiquement le premier onglet activé
  useEffect(() => {
    const enabledTab = tabs.find((tab) => tab.enabled);
    if (enabledTab && !tabs.find((tab) => tab.id === activeTab)?.enabled) {
      setActiveTab(enabledTab.id);
    }
  }, [labelStyle.showName, labelStyle.showPrice, labelStyle.showBarcode, labelStyle.showBorder]);

  const handlePositionChange = (positionData) => {
    const newPositions = {
      ...customPositions,
      [positionData.objectType]: positionData.position,
    };

    setCustomPositions(newPositions);
    updateStyle({ customPositions: newPositions });
  };

  const handleResetStyle = () => {
    reset('style');
    setCustomPositions({});
  };

  // Handlers presets
  const handleSavePreset = async (name, isPublic = false) => {
    return await managePresets('save', { name, isPublic });
  };

  const handleLoadPreset = async (presetId) => {
    return await managePresets('apply', { id: presetId });
  };

  const handleDeletePreset = async (presetId) => {
    return await managePresets('delete', { id: presetId });
  };

  const allPresets = savedPresets || [];

  const stylePresets = savedPresets.style || [];

  // Panneau actuel selon l'onglet sélectionné
  const renderActivePanel = () => {
    switch (activeTab) {
      case 'name':
        return labelStyle.showName && <NameStylePanel style={labelStyle} onUpdate={updateStyle} />;
      case 'price':
        return (
          labelStyle.showPrice && <PriceStylePanel style={labelStyle} onUpdate={updateStyle} />
        );
      case 'barcode':
        return (
          labelStyle.showBarcode && <BarcodeStylePanel style={labelStyle} onUpdate={updateStyle} />
        );
      case 'border':
        return (
          labelStyle.showBorder && <BorderStylePanel style={labelStyle} onUpdate={updateStyle} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* 💾 Presets Manager */}
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggle('presets');
          }}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
        >
          <div className="flex items-center">
            <Save className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Presets de style
            </span>
            {stylePresets.length > 0 && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
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
              savedPresets={allPresets}
              onSavePreset={handleSavePreset}
              onLoadPreset={handleLoadPreset}
              onDeletePreset={handleDeletePreset}
              title="Presets d'étiquettes"
              emptyMessage="Aucun preset sauvegardé"
            />
          </div>
        )}
      </div>
      {/* 🎨 Aperçu en haut */}
      {sampleLabel && (
        <div className="flex justify-center">
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
      )}

      {/* 🎛️ ONGLETS DE CONFIGURATION */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        {/* Header avec reset */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Style d'étiquette
          </h3>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleResetStyle();
            }}
            className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Réinitialiser le style"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Réinitialiser
          </button>
        </div>

        {/* Onglets */}
        <div className="flex justify-center flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id && tab.enabled}
              onClick={() => tab.enabled && setActiveTab(tab.id)}
              icon={tab.icon}
              label={tab.label}
              enabled={tab.enabled}
              onToggle={tab.toggle}
            />
          ))}
        </div>

        {/* Panneau de configuration actuel */}
        <div className="min-h-[120px]">
          {renderActivePanel()}
          {!tabs.some((tab) => tab.enabled) && (
            <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Activez au moins un élément pour configurer le style</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabelStyleConfig;
