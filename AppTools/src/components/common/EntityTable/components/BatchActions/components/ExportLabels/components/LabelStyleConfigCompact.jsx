// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\LabelStyleConfigCompact.jsx
import React, { useState } from 'react';
import {
  Tag,
  Euro,
  Barcode,
  Square,
  Globe,
  Type,
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
          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
        />
        {unit && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
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
    price: true,
    name: false,
    sku: false,
    brand: false,
    supplier: false,
    barcode: false,
    border: false,
    wooqr: false,
    customTexts: false,
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

      {/* PRIX */}
      <SubSection
        title="Prix"
        icon={Euro}
        isOpen={openSections.price}
        onToggle={() => toggleSection('price')}
        enabled={labelStyle.showPrice}
        onToggleEnabled={() => updateStyle({ showPrice: !labelStyle.showPrice })}
      >
        <div className="grid grid-cols-2 gap-2">
          <CompactInput
            label="Taille"
            value={labelStyle.priceSize}
            onChange={(v) => updateStyle({ priceSize: v })}
            min={8}
            max={32}
            unit="pt"
          />
          <CompactInput
            label="Style"
            value={labelStyle.priceWeight || 'bold'}
            onChange={(v) => updateStyle({ priceWeight: v })}
            type="select"
            options={weightOptions}
          />
        </div>
        <CompactInput
          label="Police"
          value={labelStyle.priceFontFamily || 'Arial'}
          onChange={(v) => updateStyle({ priceFontFamily: v })}
          type="select"
          options={fontOptions}
        />
        <ColorPicker
          label="Couleur"
          value={labelStyle.colors?.price || '#000000'}
          onChange={(color) => updateColor('price', color)}
          defaultColor="#000000"
        />
      </SubSection>

      {/* NOM */}
      <SubSection
        title="Nom du produit"
        icon={Tag}
        isOpen={openSections.name}
        onToggle={() => toggleSection('name')}
        enabled={labelStyle.showName}
        onToggleEnabled={() => updateStyle({ showName: !labelStyle.showName })}
      >
        <div className="grid grid-cols-2 gap-2">
          <CompactInput
            label="Taille"
            value={labelStyle.nameSize}
            onChange={(v) => updateStyle({ nameSize: v })}
            min={6}
            max={24}
            unit="pt"
          />
          <CompactInput
            label="Style"
            value={labelStyle.nameWeight || 'bold'}
            onChange={(v) => updateStyle({ nameWeight: v })}
            type="select"
            options={weightOptions}
          />
        </div>
        <CompactInput
          label="Police"
          value={labelStyle.nameFontFamily || 'Arial'}
          onChange={(v) => updateStyle({ nameFontFamily: v })}
          type="select"
          options={fontOptions}
        />
        <ColorPicker
          label="Couleur"
          value={labelStyle.colors?.name || '#000000'}
          onChange={(color) => updateColor('name', color)}
          defaultColor="#000000"
        />
      </SubSection>

      {/* SKU */}
      <SubSection
        title="SKU"
        icon={Tag}
        isOpen={openSections.sku}
        onToggle={() => toggleSection('sku')}
        enabled={labelStyle.showSku}
        onToggleEnabled={() => updateStyle({ showSku: !labelStyle.showSku })}
      >
        <div className="grid grid-cols-2 gap-2">
          <CompactInput
            label="Taille"
            value={labelStyle.skuSize || 10}
            onChange={(v) => updateStyle({ skuSize: v })}
            min={6}
            max={24}
            unit="pt"
          />
          <ColorPicker
            label="Couleur"
            value={labelStyle.colors?.sku || '#000000'}
            onChange={(color) => updateColor('sku', color)}
            defaultColor="#000000"
          />
        </div>
      </SubSection>

      {/* MARQUE */}
      <SubSection
        title="Marque"
        icon={Tag}
        isOpen={openSections.brand}
        onToggle={() => toggleSection('brand')}
        enabled={labelStyle.showBrand}
        onToggleEnabled={() => updateStyle({ showBrand: !labelStyle.showBrand })}
      >
        <div className="grid grid-cols-2 gap-2">
          <CompactInput
            label="Taille"
            value={labelStyle.brandSize || 10}
            onChange={(v) => updateStyle({ brandSize: v })}
            min={6}
            max={24}
            unit="pt"
          />
          <ColorPicker
            label="Couleur"
            value={labelStyle.colors?.brand || '#000000'}
            onChange={(color) => updateColor('brand', color)}
            defaultColor="#000000"
          />
        </div>
      </SubSection>

      {/* FOURNISSEUR */}
      <SubSection
        title="Fournisseur"
        icon={Tag}
        isOpen={openSections.supplier}
        onToggle={() => toggleSection('supplier')}
        enabled={labelStyle.showSupplier}
        onToggleEnabled={() => updateStyle({ showSupplier: !labelStyle.showSupplier })}
      >
        <div className="grid grid-cols-2 gap-2">
          <CompactInput
            label="Taille"
            value={labelStyle.supplierSize || 10}
            onChange={(v) => updateStyle({ supplierSize: v })}
            min={6}
            max={24}
            unit="pt"
          />
          <ColorPicker
            label="Couleur"
            value={labelStyle.colors?.supplier || '#000000'}
            onChange={(color) => updateColor('supplier', color)}
            defaultColor="#000000"
          />
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
              value={labelStyle.qrCodeSize || 5}
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
        <div className="grid grid-cols-3 gap-2">
          <CompactInput
            label="Épaisseur"
            value={labelStyle.borderWidth || 0.1}
            onChange={(v) => updateStyle({ borderWidth: v })}
            min={0.1}
            max={2}
            step={0.1}
            unit="mm"
          />
          <CompactInput
            label="Style"
            value={labelStyle.borderStyle || 'solid'}
            onChange={(v) => updateStyle({ borderStyle: v })}
            type="select"
            options={[
              { value: 'solid', label: 'Continu' },
              { value: 'dashed', label: 'Tirets' },
              { value: 'dotted', label: 'Points' },
            ]}
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

      {/* TEXTES PERSONNALISÉS */}
      <SubSection
        title="Textes personnalisés"
        icon={Type}
        isOpen={openSections.customTexts}
        onToggle={() => toggleSection('customTexts')}
        enabled={true}
      >
        <button
          type="button"
          onClick={addCustomText}
          className="w-full mb-3 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter un texte
        </button>

        {labelStyle.customTexts?.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs">
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
                    <textarea
                      value={text.content}
                      onChange={(e) => updateCustomText(text.id, { content: e.target.value })}
                      placeholder="Contenu du texte..."
                      rows={2}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 resize-none"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Variables: {'{brand}'}, {'{supplier}'}, {'{sku}'}
                    </p>
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
      </SubSection>
    </div>
  );
};

export default LabelStyleConfigCompact;
