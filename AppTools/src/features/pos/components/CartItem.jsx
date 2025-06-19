// src/features/pos/components/CartItem.jsx
import React from 'react';
import { Plus, Minus, Trash2, Percent } from 'lucide-react';

const CartItem = ({ item, onUpdateQuantity, onRemove, onApplyDiscount }) => {
  const handleQuantityChange = (newQuantity) => {
    onUpdateQuantity(item.product_id, newQuantity);
  };

  const handleDiscountClick = () => {
    console.log('🔍 [CartItem] handleDiscountClick appelé avec item:', item); // DEBUG
    onApplyDiscount(item); // Notez: c'est onApplyDiscount pas onApplyDiscount('item', item)
  };

  // Vérifier si l'item a une réduction
  const hasDiscount = item.discount && item.discount.amount > 0;

  console.log('🔍 [CartItem] Debug item:', {
    productName: item.product_name,
    hasDiscount,
    discount: item.discount,
    discount_amount: item.discount_amount,
    unit_price: item.unit_price,
    total_price: item.total_price,
  }); // 🆕 DEBUG TEMPORAIRE

  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900 dark:text-white">{item.product_name}</h4>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <span>SKU: {item.sku}</span>
          {item.barcode && <span> | CB: {item.barcode}</span>}

          {/* Affichage prix avec réduction */}
          <div className="mt-1">
            {hasDiscount ? (
              <div className="flex items-center space-x-2">
                <span className="line-through text-gray-400">
                  {item.unit_price.toFixed(2)}€/unité
                </span>
                <span className="text-green-600 font-medium">
                  {(item.unit_price - item.discount.amount / item.quantity).toFixed(2)}€/unité
                </span>
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded">
                  {item.discount.type === 'percentage'
                    ? `-${item.discount.value}%`
                    : `-${item.discount.amount.toFixed(2)}€`}
                </span>
              </div>
            ) : (
              <span>{item.unit_price.toFixed(2)}€/unité</span>
            )}
          </div>

          {/* Motif de réduction */}
          {hasDiscount && item.discount.reason && (
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Motif: {item.discount.reason}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Bouton réduction */}
        <button
          onClick={handleDiscountClick}
          className={`p-1.5 rounded transition-colors ${
            hasDiscount
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
          }`}
          title={hasDiscount ? 'Modifier la réduction' : 'Appliquer une réduction'}
        >
          <Percent className="h-4 w-4" />
        </button>

        {/* Contrôles quantité */}
        <button
          onClick={() => handleQuantityChange(item.quantity - 1)}
          className="p-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
        >
          <Minus className="h-4 w-4" />
        </button>

        <span className="w-12 text-center font-medium text-gray-900 dark:text-white">
          {item.quantity}
        </span>

        <button
          onClick={() => handleQuantityChange(item.quantity + 1)}
          className="p-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
        >
          <Plus className="h-4 w-4" />
        </button>

        {/* Prix total */}
        <div className="w-20 text-right">
          {hasDiscount ? (
            <div className="space-y-1">
              <div className="line-through text-gray-400 text-xs">
                {(item.unit_price * item.quantity).toFixed(2)}€
              </div>
              <div className="font-medium text-green-600 dark:text-green-400">
                {item.total_price.toFixed(2)}€
              </div>
            </div>
          ) : (
            <span className="font-medium text-gray-900 dark:text-white">
              {item.total_price.toFixed(2)}€
            </span>
          )}
        </div>

        {/* Bouton suppression */}
        <button
          onClick={() => onRemove(item.product_id)}
          className="p-1 rounded bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 
                     hover:bg-red-200 dark:hover:bg-red-800"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CartItem;
