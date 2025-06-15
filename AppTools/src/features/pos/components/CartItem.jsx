// src/features/pos/components/CartItem.jsx
import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';

const CartItem = ({ item, onUpdateQuantity, onRemove }) => {
  const handleQuantityChange = (newQuantity) => {
    onUpdateQuantity(item.product_id, newQuantity);
  };

  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900 dark:text-white">{item.product_name}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          SKU: {item.sku} | {item.unit_price.toFixed(2)}€/unité
          {item.barcode && <span> | CB: {item.barcode}</span>}
        </p>
      </div>

      <div className="flex items-center space-x-2">
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

        <span className="w-20 text-right font-medium text-gray-900 dark:text-white">
          {item.total_price.toFixed(2)}€
        </span>

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
