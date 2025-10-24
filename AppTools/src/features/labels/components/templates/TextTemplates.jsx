// src/features/labels/components/templates/TextTemplates.jsx
import React from 'react';
import useLabelStore from '../../store/useLabelStore';

const TextTemplates = ({ dataSource, selectedProduct }) => {
  const { addElement, elements, selectedProducts } = useLabelStore();

  // En mode données, utilise selectedProduct (prop) ou le premier de selectedProducts
  const displayProduct =
    selectedProduct || (selectedProducts.length > 0 ? selectedProducts[0] : null);

  const templates = [
    { id: 'heading', label: 'Titre', preview: 'Titre Principal', fontSize: 32, bold: true },
    { id: 'subtitle', label: 'Sous-titre', preview: 'Sous-titre', fontSize: 24, bold: false },
    { id: 'price', label: 'Prix', preview: '19,99€', fontSize: 48, bold: true, color: '#ef4444' },
    {
      id: 'discount',
      label: 'Promotion',
      preview: '-30%',
      fontSize: 36,
      bold: true,
      color: '#22c55e',
    },
    { id: 'body', label: 'Corps', preview: 'Texte normal', fontSize: 16, bold: false },
    { id: 'small', label: 'Petit', preview: 'Petit texte', fontSize: 12, bold: false },
  ];

  const handleAddText = (template) => {
    // En mode données, on prend le premier produit de la liste
    const text = dataSource === 'data' && displayProduct ? displayProduct.name : template.preview;

    const dataBinding = dataSource === 'data' && displayProduct ? 'name' : null;

    addElement({
      type: 'text',
      text,
      x: 50,
      y: 50 + elements.length * 40, // Décalage vertical
      fontSize: template.fontSize,
      bold: template.bold,
      color: template.color || '#000000',
      dataBinding,
    });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        {dataSource === 'blank'
          ? 'Cliquez pour ajouter du texte'
          : displayProduct
            ? `Ajoutez un champ (basé sur : ${displayProduct.name})`
            : 'Sélectionnez un ou plusieurs produits'}
      </div>

      {templates.map((template) => (
        <button
          key={template.id}
          onClick={() => handleAddText(template)}
          disabled={dataSource === 'data' && !displayProduct}
          className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{template.label}</div>
          <div
            style={{
              fontSize: `${Math.min(template.fontSize, 24)}px`,
              fontWeight: template.bold ? 'bold' : 'normal',
              color: template.color || 'inherit',
            }}
          >
            {template.preview}
          </div>
        </button>
      ))}

      {dataSource === 'data' && !displayProduct && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">Aucun produit sélectionné</p>
        </div>
      )}
    </div>
  );
};

export default TextTemplates;
