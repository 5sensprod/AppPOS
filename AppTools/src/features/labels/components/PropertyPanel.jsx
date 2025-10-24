// src/features/labels/components/PropertyPanel.jsx
import React from 'react';
import { X, Palette } from 'lucide-react';
import useLabelStore from '../store/useLabelStore';

const PropertyPanel = ({ selectedProduct }) => {
  const elements = useLabelStore((s) => s.elements);
  const selectedId = useLabelStore((s) => s.selectedId);
  const updateElement = useLabelStore((s) => s.updateElement);
  const clearSelection = useLabelStore((s) => s.clearSelection);
  const dataSource = useLabelStore((s) => s.dataSource);

  const selectedElement = elements.find((el) => el.id === selectedId);
  if (!selectedElement) return null;

  const isQRCode = selectedElement.type === 'qrcode';

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

  const handleFieldChange = (fieldKey) => {
    const field = dataFields.find((f) => f.key === fieldKey);
    if (!field) return;

    if (!isQRCode) {
      updateElement(selectedId, { dataBinding: field.key, text: field.value });
      return;
    }
    updateElement(selectedId, { dataBinding: field.key, qrValue: field.value });
  };

  const handleQRValueChange = (value) => {
    updateElement(selectedId, { qrValue: value });
  };

  const handleQRSizeChange = (value) => {
    const size = Math.max(64, Math.min(1024, Number(value) || 160));
    updateElement(selectedId, { size });
  };

  return (
    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4 px-3 py-2 max-w-4xl w-[min(90vw,800px)]">
        {/* Color Picker */}
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-gray-500" />
          <input
            type="color"
            value={selectedElement.color || '#000000'}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-10 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
          />
        </div>

        {/* Spécifique QR Code */}
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
                placeholder="Texte, URL, SKU, code-barres..."
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-[260px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                Taille:
              </span>
              <input
                type="number"
                min={64}
                max={1024}
                value={selectedElement.size ?? 160}
                onChange={(e) => handleQRSizeChange(e.target.value)}
                className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-xs text-gray-500">px</span>
            </div>
          </>
        )}

        {/* Mode données */}
        {dataSource === 'data' && selectedProduct && selectedElement.dataBinding && (
          <>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                Champ:
              </span>
              <select
                value={selectedElement.dataBinding}
                onChange={(e) => handleFieldChange(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white max-w-[240px]"
              >
                {dataFields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Fermer */}
        <button
          onClick={clearSelection}
          className="ml-auto p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded shrink-0"
          title="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PropertyPanel;
