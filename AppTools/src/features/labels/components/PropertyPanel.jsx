// src/features/labels/components/PropertyPanel.jsx
import React from 'react';
import { Palette, Link, Unlink, Sparkles } from 'lucide-react';
import useLabelStore from '../store/useLabelStore';

const PropertyPanel = ({ selectedProduct, onOpenEffects }) => {
  const elements = useLabelStore((s) => s.elements);
  const selectedId = useLabelStore((s) => s.selectedId);
  const updateElement = useLabelStore((s) => s.updateElement);
  const dataSource = useLabelStore((s) => s.dataSource);

  const selectedElement = elements.find((el) => el.id === selectedId);
  if (!selectedElement) return null;

  const isQRCode = selectedElement.type === 'qrcode';
  const isText = selectedElement.type === 'text';
  const isImage = selectedElement.type === 'image';
  const isBarcode = selectedElement.type === 'barcode';

  const dataFields = selectedProduct
    ? [
        { key: 'name', label: 'Nom du produit', value: selectedProduct.name },
        { key: 'price', label: 'Prix', value: `${selectedProduct.price}€` },
        { key: 'brand', label: 'Marque', value: selectedProduct.brand_ref?.name ?? '' },
        { key: 'sku', label: 'Référence', value: selectedProduct.sku },
        { key: 'stock', label: 'Stock', value: `Stock: ${selectedProduct.stock}` },
        { key: 'supplier', label: 'Fournisseur', value: selectedProduct.supplier_ref?.name ?? '' },
        { key: 'website_url', label: 'URL produit', value: selectedProduct.website_url ?? '' },
        {
          key: 'barcode',
          label: 'Code-barres',
          value: selectedProduct?.meta_data?.find?.((m) => m.key === 'barcode')?.value ?? '',
        },
      ]
    : [];

  const handleColorChange = (color) => updateElement(selectedId, { color });

  // ✅ Ne plus “figer” la valeur : on n’écrit que dataBinding
  const handleFieldChange = (fieldKey) => {
    const field = dataFields.find((f) => f.key === fieldKey);
    if (!field) return;

    if (isText) {
      updateElement(selectedId, { dataBinding: field.key });
      return;
    }
    if (isQRCode) {
      updateElement(selectedId, { dataBinding: field.key });
      return;
    }
    if (isBarcode) {
      updateElement(selectedId, { dataBinding: field.key });
      return;
    }
  };

  const handleQRValueChange = (value) => {
    // Valeur fixe quand pas de binding
    updateElement(selectedId, { qrValue: value });
  };

  const handleUnbind = () => {
    updateElement(selectedId, { dataBinding: null });
  };

  const getDefaultQRBindingKey = () => {
    const pref = ['website_url', 'barcode', 'sku'];
    for (const key of pref) {
      const f = dataFields.find((d) => d.key === key);
      if (f && f.value) return key;
    }
    return null;
  };

  /** Lier/Délier un QR au produit (toggle) */
  const handleQRBinding = () => {
    if (!selectedProduct) return;
    if (selectedElement.dataBinding) {
      updateElement(selectedId, { dataBinding: null });
      return;
    }
    const key = getDefaultQRBindingKey();
    if (key) updateElement(selectedId, { dataBinding: key });
  };

  /** Lier/Délier une image au produit */
  const handleImageBinding = () => {
    if (selectedElement.dataBinding) {
      updateElement(selectedId, { dataBinding: null });
    } else {
      updateElement(selectedId, { dataBinding: 'product_image' });
    }
  };

  const handleBarcodeColorChange = (value) => {
    updateElement(selectedId, { lineColor: value });
  };
  const handleBarcodeBgChange = (value) => {
    updateElement(selectedId, { background: value });
  };

  /** Opacité pour les images */
  const handleOpacityChange = (value) => {
    updateElement(selectedId, { opacity: parseFloat(value) });
  };

  return (
    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4 px-4 py-2.5">
        {(isText || isQRCode) && (
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <input
              type="color"
              value={selectedElement.color || '#000000'}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-10 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
              title="Couleur"
            />
          </div>
        )}

        {isQRCode && (
          <>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                Contenu:
              </span>
              <input
                type="text"
                value={selectedElement.qrValue || ''}
                onChange={(e) => handleQRValueChange(e.target.value)}
                placeholder="Texte, URL, SKU..."
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-[220px]"
                disabled={!!selectedElement.dataBinding}
              />
            </div>
          </>
        )}

        {isBarcode && (
          <>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                Couleur:
              </span>
              <input
                type="color"
                value={selectedElement.lineColor || '#000000'}
                onChange={(e) => handleBarcodeColorChange(e.target.value)}
                className="w-10 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                Fond:
              </span>
              <input
                type="color"
                value={selectedElement.background || '#FFFFFF'}
                onChange={(e) => handleBarcodeBgChange(e.target.value)}
                className="w-10 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
              />
            </div>
          </>
        )}

        {isImage && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                Opacité:
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={selectedElement.opacity ?? 1}
                onChange={(e) => handleOpacityChange(e.target.value)}
                className="w-24"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
                {Math.round((selectedElement.opacity ?? 1) * 100)}%
              </span>
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedElement.width ?? 160}×{selectedElement.height ?? 160}px
              </span>
            </div>

            {dataSource === 'data' && selectedProduct && (
              <>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                <button
                  onClick={handleImageBinding}
                  className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                    selectedElement.dataBinding
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                  title={
                    selectedElement.dataBinding
                      ? 'Image liée au produit'
                      : "Lier à l'image du produit"
                  }
                >
                  {selectedElement.dataBinding ? (
                    <>
                      <Link className="h-4 w-4" />
                      Liée
                    </>
                  ) : (
                    <>
                      <Unlink className="h-4 w-4" />
                      Lier
                    </>
                  )}
                </button>
              </>
            )}
          </>
        )}

        {dataSource === 'data' &&
          selectedProduct &&
          selectedElement.dataBinding &&
          (isText || isQRCode || isBarcode) && (
            <>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Champ:
                </span>
                <select
                  value={selectedElement.dataBinding}
                  onChange={(e) => handleFieldChange(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white max-w-[180px]"
                >
                  {dataFields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleUnbind}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Utiliser une valeur fixe"
                >
                  Délier
                </button>
              </div>
            </>
          )}

        {onOpenEffects && (
          <>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 ml-auto" />
            <button
              onClick={onOpenEffects}
              className="px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors flex items-center gap-2 shrink-0"
              title="Ouvrir le panneau Effets"
            >
              <Sparkles className="h-4 w-4" />
              Effets
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;
