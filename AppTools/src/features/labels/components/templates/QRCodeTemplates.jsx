// src/features/labels/components/templates/QRCodeTemplates.jsx
import React from 'react';
import useLabelStore from '../../store/useLabelStore';

const QRCodeTemplates = ({ dataSource, selectedProduct }) => {
  const { addElement, elements, selectedProducts } = useLabelStore();

  const displayProduct =
    selectedProduct || (selectedProducts.length > 0 ? selectedProducts[0] : null);

  const defaultQR = () => {
    if (dataSource === 'data' && displayProduct) {
      return displayProduct.website_url || displayProduct.sku || displayProduct._id || '';
    }
    return 'https://example.com';
    // tu peux mettre '' si tu préfères un QR vide
  };

  const handleAdd = () => {
    addElement({
      type: 'qrcode',
      id: undefined, // sera injecté par le store
      x: 60,
      y: 60 + elements.length * 30,
      size: 160,
      color: '#000000',
      bgColor: '#FFFFFF00',
      qrValue: defaultQR(),
      visible: true,
      locked: false,
      // si tu veux binder d’office en mode data :
      // dataBinding: displayProduct ? (displayProduct.website_url ? 'website_url' : 'sku') : null,
    });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        {dataSource === 'blank'
          ? 'Cliquez pour ajouter un QR code'
          : displayProduct
            ? `QR basé sur : ${displayProduct.name}`
            : 'Sélectionnez un produit pour préremplir la valeur'}
      </div>

      <button
        onClick={handleAdd}
        disabled={dataSource === 'data' && !displayProduct}
        className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">QR Code</div>
        <div className="text-sm">Ajouter un QR Code au canvas</div>
        <div className="text-[11px] text-gray-400 mt-1">
          Valeur par défaut : {defaultQR() || '—'}
        </div>
      </button>
    </div>
  );
};

export default QRCodeTemplates;
