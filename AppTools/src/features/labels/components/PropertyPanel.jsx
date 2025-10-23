// src/features/labels/components/PropertyPanel.jsx
import React from 'react';
import { X, Palette } from 'lucide-react';
import useLabelStore from '../store/useLabelStore';

const PropertyPanel = ({ selectedProduct }) => {
  const elements = useLabelStore((state) => state.elements);
  const selectedId = useLabelStore((state) => state.selectedId);
  const updateElement = useLabelStore((state) => state.updateElement);
  const clearSelection = useLabelStore((state) => state.clearSelection);
  const dataSource = useLabelStore((state) => state.dataSource);

  const selectedElement = elements.find((el) => el.id === selectedId);

  if (!selectedElement) return null;

  const dataFields = selectedProduct
    ? [
        { key: 'name', label: 'Nom du produit', value: selectedProduct.name },
        { key: 'price', label: 'Prix', value: `${selectedProduct.price}€` },
        { key: 'brand', label: 'Marque', value: selectedProduct.brand_ref?.name },
        { key: 'sku', label: 'Référence', value: selectedProduct.sku },
        { key: 'stock', label: 'Stock', value: `Stock: ${selectedProduct.stock}` },
      ]
    : [];

  const handleColorChange = (color) => {
    updateElement(selectedId, { color });
  };

  const handleFieldChange = (fieldKey) => {
    const field = dataFields.find((f) => f.key === fieldKey);
    if (field) {
      updateElement(selectedId, {
        dataBinding: field.key,
        text: field.value,
      });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-center gap-4 px-4 py-2 max-w-4xl mx-auto">
        {/* Info élément */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Élément sélectionné
          </span>
          <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
            {selectedElement.type}
          </span>
        </div>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

        {/* Color Picker */}
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-gray-500" />
          <input
            type="color"
            value={selectedElement.color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-10 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
          />
        </div>

        {/* Mode données : Changer le champ */}
        {dataSource === 'data' && selectedProduct && selectedElement.dataBinding && (
          <>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Champ:</span>
              <select
                value={selectedElement.dataBinding}
                onChange={(e) => handleFieldChange(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

        {/* Bouton fermer */}
        <button
          onClick={clearSelection}
          className="ml-auto p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PropertyPanel;
