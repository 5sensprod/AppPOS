// LabelStyleConfig.jsx - VERSION AVEC COULEURS INTÉGRÉES
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
  Globe,
} from 'lucide-react';
import { useAccordion } from '../hooks/useAccordion';
import FabricLabelCanvas from './FabricLabelCanvas';
import PresetManager from './PresetManager';
import ColorPicker from './ColorPicker'; // 🎨 IMPORT DU COLOR PICKER
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

    {onToggle && (
      <span
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
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
    )}
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

const InfoStylePanel = ({ style, onUpdate, onUpdateColor }) => (
  <ControlGroup title="Informations produit">
    {/* NOM */}
    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
      <label className="flex items-center mb-2">
        <input
          type="checkbox"
          checked={style.showName}
          onChange={(e) => onUpdate({ showName: e.target.checked })}
          className="mr-2 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Afficher le nom
        </span>
      </label>

      {style.showName && (
        <div className="ml-6 pl-4 border-l-2 border-blue-200 dark:border-blue-700 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Taille"
              value={style.nameSize}
              onChange={(value) => onUpdate({ nameSize: value })}
              min={6}
              max={24}
              unit="pt"
            />
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Style</label>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Police</label>
              <select
                value={style.nameFontFamily || 'Arial'}
                onChange={(e) => onUpdate({ nameFontFamily: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
              >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>
            </div>
            <ColorPicker
              label="Couleur"
              value={style.colors?.name || '#000000'}
              onChange={(color) => onUpdateColor('name', color)}
              defaultColor="#000000"
            />
          </div>
        </div>
      )}
    </div>

    {/* PRIX */}
    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
      <label className="flex items-center mb-2">
        <input
          type="checkbox"
          checked={style.showPrice}
          onChange={(e) => onUpdate({ showPrice: e.target.checked })}
          className="mr-2 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Afficher le prix
        </span>
      </label>

      {style.showPrice && (
        <div className="ml-6 pl-4 border-l-2 border-green-200 dark:border-green-700 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Taille"
              value={style.priceSize}
              onChange={(value) => onUpdate({ priceSize: value })}
              min={8}
              max={32}
              unit="pt"
            />
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Style</label>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Police</label>
              <select
                value={style.priceFontFamily || 'Arial'}
                onChange={(e) => onUpdate({ priceFontFamily: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
              >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>
            </div>
            <ColorPicker
              label="Couleur"
              value={style.colors?.price || '#000000'}
              onChange={(color) => onUpdateColor('price', color)}
              defaultColor="#000000"
            />
          </div>
        </div>
      )}
    </div>

    {/* SKU */}
    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
      <label className="flex items-center mb-2">
        <input
          type="checkbox"
          checked={style.showSku}
          onChange={(e) => onUpdate({ showSku: e.target.checked })}
          className="mr-2 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Afficher le SKU
        </span>
      </label>

      {style.showSku && (
        <div className="ml-6 pl-4 border-l-2 border-purple-200 dark:border-purple-700 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Taille"
              value={style.skuSize || 10}
              onChange={(value) => onUpdate({ skuSize: value })}
              min={6}
              max={24}
              unit="pt"
            />
            <ColorPicker
              label="Couleur"
              value={style.colors?.sku || '#000000'}
              onChange={(color) => onUpdateColor('sku', color)}
              defaultColor="#000000"
            />
          </div>
        </div>
      )}
    </div>

    {/* MARQUE */}
    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
      <label className="flex items-center mb-2">
        <input
          type="checkbox"
          checked={style.showBrand}
          onChange={(e) => onUpdate({ showBrand: e.target.checked })}
          className="mr-2 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Afficher la marque
        </span>
      </label>

      {style.showBrand && (
        <div className="ml-6 pl-4 border-l-2 border-orange-200 dark:border-orange-700 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Taille"
              value={style.brandSize || 10}
              onChange={(value) => onUpdate({ brandSize: value })}
              min={6}
              max={24}
              unit="pt"
            />
            <ColorPicker
              label="Couleur"
              value={style.colors?.brand || '#000000'}
              onChange={(color) => onUpdateColor('brand', color)}
              defaultColor="#000000"
            />
          </div>
        </div>
      )}
    </div>

    {/* FOURNISSEUR */}
    <div className="mb-4">
      <label className="flex items-center mb-2">
        <input
          type="checkbox"
          checked={style.showSupplier}
          onChange={(e) => onUpdate({ showSupplier: e.target.checked })}
          className="mr-2 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Afficher le fournisseur
        </span>
      </label>

      {style.showSupplier && (
        <div className="ml-6 pl-4 border-l-2 border-red-200 dark:border-red-700 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Taille"
              value={style.supplierSize || 10}
              onChange={(value) => onUpdate({ supplierSize: value })}
              min={6}
              max={24}
              unit="pt"
            />
            <ColorPicker
              label="Couleur"
              value={style.colors?.supplier || '#000000'}
              onChange={(color) => onUpdateColor('supplier', color)}
              defaultColor="#000000"
            />
          </div>
        </div>
      )}
    </div>
  </ControlGroup>
);

// 🎨 MISE À JOUR : Panneau Code-barres avec ColorPicker
const BarcodeStylePanel = ({ style, onUpdate, onUpdateColor }) => (
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

        {/* 🎨 NOUVEAU : ColorPicker pour le code-barres */}
        <div className="mb-3">
          <ColorPicker
            label="Couleur des barres"
            value={style.colors?.barcode || '#000000'}
            onChange={(color) => onUpdateColor('barcode', color)}
            defaultColor="#000000"
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
          <div className="ml-5 pl-3 border-l-2 border-gray-200 dark:border-gray-600 space-y-3">
            <NumberInput
              label="Taille des numéros"
              value={style.barcodeTextSize || 8}
              onChange={(value) => onUpdate({ barcodeTextSize: value })}
              min={6}
              max={12}
              unit="pt"
            />

            {/* 🎨 NOUVEAU : ColorPicker pour le texte du code */}
            <ColorPicker
              label="Couleur du texte"
              value={style.colors?.barcodeText || '#000000'}
              onChange={(color) => onUpdateColor('barcodeText', color)}
              defaultColor="#000000"
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

        {/* 🎨 NOUVEAU : ColorPicker pour le QR Code */}
        <div className="mb-3">
          <ColorPicker
            label="Couleur du QR Code"
            value={style.colors?.barcode || '#000000'}
            onChange={(color) => onUpdateColor('barcode', color)}
            defaultColor="#000000"
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
          <div className="ml-5 pl-3 border-l-2 border-gray-200 dark:border-gray-600 space-y-3">
            <NumberInput
              label="Taille du texte"
              value={style.barcodeTextSize || 8}
              onChange={(value) => onUpdate({ barcodeTextSize: value })}
              min={6}
              max={12}
              unit="pt"
            />

            {/* 🎨 NOUVEAU : ColorPicker pour le texte du QR Code */}
            <ColorPicker
              label="Couleur du texte"
              value={style.colors?.barcodeText || '#000000'}
              onChange={(color) => onUpdateColor('barcodeText', color)}
              defaultColor="#000000"
            />
          </div>
        )}
      </>
    )}
  </ControlGroup>
);

// 🎨 MISE À JOUR : Panneau Bordure avec ColorPicker
const BorderStylePanel = ({ style, onUpdate, onUpdateColor }) => (
  <ControlGroup title="Configuration de la bordure">
    <div className="grid grid-cols-3 gap-4 mb-4">
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

      {/* 🎨 NOUVEAU : ColorPicker pour la bordure */}
      <ColorPicker
        label="Couleur"
        value={style.colors?.border || style.borderColor || '#000000'}
        onChange={(color) => onUpdateColor('border', color)}
        defaultColor="#000000"
      />
    </div>
  </ControlGroup>
);

// 🎨 MISE À JOUR : Panneau WooQR avec ColorPicker
const WooQRStylePanel = ({ style, onUpdate, onUpdateColor }) => (
  <ControlGroup title="Configuration du lien WooCommerce">
    <div className="mb-3">
      <NumberInput
        label="Taille du QR Code"
        value={style.wooQRSize || 10}
        onChange={(value) => onUpdate({ wooQRSize: value })}
        min={5}
        max={30}
        unit="mm"
      />
    </div>

    {/* 🎨 NOUVEAU : ColorPicker pour le QR Code WooCommerce */}
    <div className="mb-3">
      <ColorPicker
        label="Couleur du QR Code"
        value={style.colors?.wooQR || '#000000'}
        onChange={(color) => onUpdateColor('wooQR', color)}
        defaultColor="#000000"
      />
    </div>

    <label className="flex items-center mb-2">
      <input
        type="checkbox"
        checked={style.showWooQRText !== false}
        onChange={(e) => onUpdate({ showWooQRText: e.target.checked })}
        className="mr-2.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
      />
      <span className="text-xs text-gray-700 dark:text-gray-300">
        Afficher le texte sous le QR Code
      </span>
    </label>

    {style.showWooQRText !== false && (
      <div className="ml-5 pl-3 border-l-2 border-gray-200 dark:border-gray-600 space-y-3">
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Texte à afficher
          </label>
          <input
            type="text"
            value={style.wooQRText || 'Voir en ligne'}
            onChange={(e) => onUpdate({ wooQRText: e.target.value })}
            placeholder="Voir en ligne"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
        </div>

        <NumberInput
          label="Taille du texte"
          value={style.wooQRTextSize || 7}
          onChange={(value) => onUpdate({ wooQRTextSize: value })}
          min={6}
          max={12}
          unit="pt"
        />

        {/* 🎨 NOUVEAU : ColorPicker pour le texte WooQR */}
        <ColorPicker
          label="Couleur du texte"
          value={style.colors?.wooQRText || '#000000'}
          onChange={(color) => onUpdateColor('wooQRText', color)}
          defaultColor="#000000"
        />
      </div>
    )}

    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded text-xs text-blue-700 dark:text-blue-300">
      <div className="flex items-start gap-2">
        <svg
          className="h-4 w-4 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <div className="font-medium mb-0.5">URL WooCommerce</div>
          <div className="text-xs opacity-90">
            Le QR code pointera vers l'URL du produit sur votre boutique
          </div>
        </div>
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
    updateColor,
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

  // Configuration des onglets (SANS l'onglet Couleurs séparé)
  const tabs = [
    {
      id: 'info',
      label: 'Info',
      icon: Tag, // ou Info de lucide-react
      enabled:
        labelStyle.showName ||
        labelStyle.showPrice ||
        labelStyle.showSku ||
        labelStyle.showBrand ||
        labelStyle.showSupplier,
      toggle: null, // Pas de toggle global
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
    {
      id: 'wooqr',
      label: 'Lien Web',
      icon: Globe,
      enabled: labelStyle.showWooQR,
      toggle: () => updateStyle({ showWooQR: !labelStyle.showWooQR }),
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
  }, [currentLayout.supportType, sampleLabel?.id]);

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

  // Panneau actuel selon l'onglet sélectionné (avec onUpdateColor)
  const renderActivePanel = () => {
    switch (activeTab) {
      case 'info':
        return (
          <InfoStylePanel style={labelStyle} onUpdate={updateStyle} onUpdateColor={updateColor} />
        );
      case 'barcode':
        return (
          labelStyle.showBarcode && (
            <BarcodeStylePanel
              style={labelStyle}
              onUpdate={updateStyle}
              onUpdateColor={updateColor}
            />
          )
        );
      case 'border':
        return (
          labelStyle.showBorder && (
            <BorderStylePanel
              style={labelStyle}
              onUpdate={updateStyle}
              onUpdateColor={updateColor}
            />
          )
        );
      case 'wooqr':
        return (
          labelStyle.showWooQR && (
            <WooQRStylePanel
              style={labelStyle}
              onUpdate={updateStyle}
              onUpdateColor={updateColor}
            />
          )
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
