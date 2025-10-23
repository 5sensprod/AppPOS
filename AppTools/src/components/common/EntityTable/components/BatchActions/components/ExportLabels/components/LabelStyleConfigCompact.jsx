// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\LabelStyleConfigCompact.jsx
import React, { useState } from 'react';
import {
  Type,
  Barcode,
  Square,
  Globe,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
} from 'lucide-react';
import ColorPicker from './ColorPicker';
import { useLabelExportStore } from '../stores/useLabelExportStore';

// Sous-section pliable
const SubSection = ({
  title,
  isOpen,
  onToggle,
  enabled,
  onToggleEnabled,
  children,
  icon: Icon,
}) => (
  <div className="mb-3">
    <div className="flex items-center justify-between mb-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {onToggleEnabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled();
          }}
          className={`p-1 rounded transition-colors ${
            enabled
              ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title={enabled ? 'Masquer' : 'Afficher'}
        >
          {enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>

    {isOpen && enabled && (
      <div className="ml-4 pl-3 border-l-2 border-gray-200 dark:border-gray-600 space-y-2">
        {children}
      </div>
    )}
  </div>
);

// Input compact
const CompactInput = ({
  label,
  value,
  onChange,
  type = 'number',
  min,
  max,
  step,
  unit,
  options,
  placeholder,
}) => (
  <div>
    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</label>
    {type === 'select' ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ) : type === 'textarea' ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 resize-none"
      />
    ) : (
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) =>
            onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)
          }
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className={`w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 ${unit ? 'pr-2' : ''}`}
        />
        {unit && (
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            {' '}
            {unit}
          </span>
        )}
      </div>
    )}
  </div>
);

const LabelStyleConfigCompact = () => {
  const {
    labelStyle,
    updateStyle,
    updateColor,
    updateCustomText,
    addCustomText,
    removeCustomText,
    duplicateCustomText,
    reset,
  } = useLabelExportStore();

  const [openSections, setOpenSections] = useState({
    texts: true,
    barcode: false,
    border: false,
    wooqr: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const fontOptions = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Verdana', label: 'Verdana' },
  ];

  const weightOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'bold', label: 'Gras' },
  ];

  // 🎯 TEXTES PRÉDÉFINIS (remplace les anciennes sections séparées)
  const predefinedTexts = [
    {
      id: 'name',
      label: 'Nom du produit',
      content: '{name}',
      sizeKey: 'nameSize',
      weightKey: 'nameWeight',
      fontKey: 'nameFontFamily',
      showKey: 'showName',
      colorKey: 'name',
    },
    {
      id: 'price',
      label: 'Prix',
      content: '{price}',
      sizeKey: 'priceSize',
      weightKey: 'priceWeight',
      fontKey: 'priceFontFamily',
      showKey: 'showPrice',
      colorKey: 'price',
    },
    {
      id: 'sku',
      label: 'SKU / Référence',
      content: '{sku}',
      sizeKey: 'skuSize',
      weightKey: 'skuWeight',
      fontKey: 'skuFontFamily',
      showKey: 'showSku',
      colorKey: 'sku',
    },
    {
      id: 'brand',
      label: 'Marque',
      content: '{brand}',
      sizeKey: 'brandSize',
      weightKey: 'brandWeight',
      fontKey: 'brandFontFamily',
      showKey: 'showBrand',
      colorKey: 'brand',
    },
    {
      id: 'supplier',
      label: 'Fournisseur',
      content: '{supplier}',
      sizeKey: 'supplierSize',
      weightKey: 'supplierWeight',
      fontKey: 'supplierFontFamily',
      showKey: 'showSupplier',
      colorKey: 'supplier',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header avec reset */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Éléments de l'étiquette
        </span>
        <button
          type="button"
          onClick={() => reset('style')}
          className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Réinitialiser le style"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </button>
      </div>

      {/* 🎯 TEXTES UNIFIÉS (prédéfinis + personnalisés) */}
      <SubSection
        title="Textes sur l'étiquette"
        icon={Type}
        isOpen={openSections.texts}
        onToggle={() => toggleSection('texts')}
        enabled={true}
      >
        {/* Info sur les variables */}
        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
          <div className="font-medium text-blue-900 dark:text-blue-300 mb-1">
            💡 Variables disponibles
          </div>
          <div className="text-blue-700 dark:text-blue-400 space-y-0.5">
            <div>
              <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{name}'}</code> = Nom du
              produit
            </div>
            <div>
              <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{price}'}</code> = Prix
              formaté
            </div>
            <div>
              <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{sku}'}</code> =
              Référence
            </div>
            <div>
              <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{brand}'}</code> =
              Marque
            </div>
            <div>
              <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{supplier}'}</code> =
              Fournisseur
            </div>
            <div>
              <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{barcode}'}</code> =
              Code-barres
            </div>
          </div>
        </div>

        {/* Textes prédéfinis */}
        <div className="space-y-3 mb-4">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Textes standards
          </div>
          {predefinedTexts.map((textDef) => (
            <div
              key={textDef.id}
              className="border border-gray-200 dark:border-gray-600 rounded p-2 space-y-2"
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={labelStyle[textDef.showKey]}
                    onChange={(e) => updateStyle({ [textDef.showKey]: e.target.checked })}
                    className="mr-2 text-blue-600 rounded"
                  />
                  {textDef.label}
                </label>
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                  {textDef.content}
                </code>
              </div>

              {labelStyle[textDef.showKey] && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <CompactInput
                      label="Taille"
                      value={labelStyle[textDef.sizeKey] || 10}
                      onChange={(v) => updateStyle({ [textDef.sizeKey]: v })}
                      min={6}
                      max={32}
                      unit="pt"
                    />
                    <CompactInput
                      label="Style"
                      value={labelStyle[textDef.weightKey] || 'normal'}
                      onChange={(v) => updateStyle({ [textDef.weightKey]: v })}
                      type="select"
                      options={weightOptions}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <CompactInput
                      label="Police"
                      value={labelStyle[textDef.fontKey] || 'Arial'}
                      onChange={(v) => updateStyle({ [textDef.fontKey]: v })}
                      type="select"
                      options={fontOptions}
                    />
                    <ColorPicker
                      label="Couleur"
                      value={labelStyle.colors?.[textDef.colorKey] || '#000000'}
                      onChange={(color) => updateColor(textDef.colorKey, color)}
                      defaultColor="#000000"
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Textes personnalisés */}
        <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Textes personnalisés
            </div>
            <button
              type="button"
              onClick={addCustomText}
              className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded flex items-center gap-1 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </button>
          </div>

          {labelStyle.customTexts?.length === 0 ? (
            <div className="text-center py-3 text-gray-500 dark:text-gray-400 text-xs">
              Aucun texte personnalisé
            </div>
          ) : (
            <div className="space-y-2">
              {labelStyle.customTexts?.map((text) => (
                <div
                  key={text.id}
                  className="border border-gray-200 dark:border-gray-600 rounded p-2"
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center text-xs font-medium flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={text.enabled}
                        onChange={(e) => updateCustomText(text.id, { enabled: e.target.checked })}
                        className="mr-2 text-blue-600 rounded"
                      />
                      <span className="truncate">{text.content || 'Texte vide'}</span>
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => duplicateCustomText(text.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Dupliquer"
                      >
                        <Copy className="h-3 w-3 text-blue-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomText(text.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {text.enabled && (
                    <div className="space-y-2">
                      <CompactInput
                        label="Contenu (utilisez les variables)"
                        value={text.content}
                        onChange={(v) => updateCustomText(text.id, { content: v })}
                        type="textarea"
                        placeholder="Ex: Marque: {brand} - Ref: {sku}"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <CompactInput
                          label="Taille"
                          value={text.fontSize}
                          onChange={(v) => updateCustomText(text.id, { fontSize: v })}
                          min={6}
                          max={32}
                          unit="pt"
                        />
                        <CompactInput
                          label="Police"
                          value={text.fontFamily}
                          onChange={(v) => updateCustomText(text.id, { fontFamily: v })}
                          type="select"
                          options={fontOptions}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <CompactInput
                          label="Style"
                          value={text.fontWeight}
                          onChange={(v) => updateCustomText(text.id, { fontWeight: v })}
                          type="select"
                          options={weightOptions}
                        />
                        <ColorPicker
                          label="Couleur"
                          value={text.color}
                          onChange={(color) => updateCustomText(text.id, { color })}
                          defaultColor="#000000"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SubSection>

      {/* CODE-BARRES */}
      <SubSection
        title="Code-barres / QR Code"
        icon={Barcode}
        isOpen={openSections.barcode}
        onToggle={() => toggleSection('barcode')}
        enabled={labelStyle.showBarcode}
        onToggleEnabled={() => updateStyle({ showBarcode: !labelStyle.showBarcode })}
      >
        {/* Toggle Barcode/QR */}
        <div className="mb-2">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Type</label>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-0.5">
            <button
              type="button"
              onClick={() => updateStyle({ barcodeType: 'barcode' })}
              className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                labelStyle.barcodeType === 'barcode'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Barres
            </button>
            <button
              type="button"
              onClick={() => updateStyle({ barcodeType: 'qrcode' })}
              className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                labelStyle.barcodeType === 'qrcode'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              QR Code
            </button>
          </div>
        </div>

        {labelStyle.barcodeType === 'barcode' ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <CompactInput
                label="Hauteur"
                value={labelStyle.barcodeHeight}
                onChange={(v) => updateStyle({ barcodeHeight: v })}
                min={10}
                max={30}
                unit="mm"
              />
              <CompactInput
                label="Largeur"
                value={labelStyle.barcodeWidth || 60}
                onChange={(v) => updateStyle({ barcodeWidth: v })}
                min={40}
                max={100}
                step={5}
                unit="%"
              />
            </div>
            <ColorPicker
              label="Couleur barres"
              value={labelStyle.colors?.barcode || '#000000'}
              onChange={(color) => updateColor('barcode', color)}
              defaultColor="#000000"
            />
            <label className="flex items-center text-xs mt-2">
              <input
                type="checkbox"
                checked={labelStyle.showBarcodeText !== false}
                onChange={(e) => updateStyle({ showBarcodeText: e.target.checked })}
                className="mr-2 text-blue-600 rounded"
              />
              Afficher les numéros
            </label>
            {labelStyle.showBarcodeText !== false && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <CompactInput
                  label="Taille texte"
                  value={labelStyle.barcodeTextSize || 8}
                  onChange={(v) => updateStyle({ barcodeTextSize: v })}
                  min={6}
                  max={12}
                  unit="pt"
                />
                <ColorPicker
                  label="Couleur texte"
                  value={labelStyle.colors?.barcodeText || '#000000'}
                  onChange={(color) => updateColor('barcodeText', color)}
                  defaultColor="#000000"
                />
              </div>
            )}
          </>
        ) : (
          <>
            <CompactInput
              label="Taille QR"
              value={labelStyle.qrCodeSize || 20}
              onChange={(v) => updateStyle({ qrCodeSize: v })}
              min={5}
              max={30}
              unit="mm"
            />
            <ColorPicker
              label="Couleur QR"
              value={labelStyle.colors?.barcode || '#000000'}
              onChange={(color) => updateColor('barcode', color)}
              defaultColor="#000000"
            />
          </>
        )}
      </SubSection>

      {/* BORDURE */}
      <SubSection
        title="Bordure"
        icon={Square}
        isOpen={openSections.border}
        onToggle={() => toggleSection('border')}
        enabled={labelStyle.showBorder}
        onToggleEnabled={() => updateStyle({ showBorder: !labelStyle.showBorder })}
      >
        <div className="grid grid-cols-2 gap-2">
          <CompactInput
            label="Épaisseur"
            value={labelStyle.borderWidth || 0.1}
            onChange={(v) => updateStyle({ borderWidth: v })}
            min={0.1}
            max={2}
            step={0.1}
            unit="mm"
          />
          <ColorPicker
            label="Couleur"
            value={labelStyle.colors?.border || '#000000'}
            onChange={(color) => updateColor('border', color)}
            defaultColor="#000000"
          />
        </div>
      </SubSection>

      {/* LIEN WEB (WooQR) */}
      <SubSection
        title="Lien Web (QR Code)"
        icon={Globe}
        isOpen={openSections.wooqr}
        onToggle={() => toggleSection('wooqr')}
        enabled={labelStyle.showWooQR}
        onToggleEnabled={() => updateStyle({ showWooQR: !labelStyle.showWooQR })}
      >
        <CompactInput
          label="Taille QR"
          value={labelStyle.wooQRSize || 10}
          onChange={(v) => updateStyle({ wooQRSize: v })}
          min={5}
          max={30}
          unit="mm"
        />
        <ColorPicker
          label="Couleur QR"
          value={labelStyle.colors?.wooQR || '#000000'}
          onChange={(color) => updateColor('wooQR', color)}
          defaultColor="#000000"
        />
        <label className="flex items-center text-xs mt-2">
          <input
            type="checkbox"
            checked={labelStyle.showWooQRText !== false}
            onChange={(e) => updateStyle({ showWooQRText: e.target.checked })}
            className="mr-2 text-blue-600 rounded"
          />
          Afficher le texte
        </label>
        {labelStyle.showWooQRText !== false && (
          <div className="space-y-2 mt-2">
            <CompactInput
              label="Texte"
              value={labelStyle.wooQRText || 'Voir en ligne'}
              onChange={(v) => updateStyle({ wooQRText: v })}
              type="text"
            />
            <div className="grid grid-cols-2 gap-2">
              <CompactInput
                label="Taille"
                value={labelStyle.wooQRTextSize || 7}
                onChange={(v) => updateStyle({ wooQRTextSize: v })}
                min={6}
                max={12}
                unit="pt"
              />
              <ColorPicker
                label="Couleur"
                value={labelStyle.colors?.wooQRText || '#000000'}
                onChange={(color) => updateColor('wooQRText', color)}
                defaultColor="#000000"
              />
            </div>
          </div>
        )}
      </SubSection>
    </div>
  );
};

export default LabelStyleConfigCompact;
