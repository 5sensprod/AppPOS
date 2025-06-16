// src/features/pos/components/Cart.jsx
import React from 'react';
import { ShoppingCart, CreditCard } from 'lucide-react';
import { useCashierStore } from '../stores/cashierStore';
import CartItem from './CartItem';

const Cart = () => {
  const { cart, updateCartItemQuantity, removeFromCart, clearCart, setShowPaymentModal } =
    useCashierStore();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-[60vh] flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Panier ({cart.itemCount} articles)
          </h3>

          {cart.items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300
                         text-sm font-medium"
            >
              Vider le panier
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {cart.items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Panier vide</p>
              <p className="text-sm">Recherchez un produit pour commencer</p>
            </div>
          </div>
        ) : (
          <div>
            {cart.items.map((item) => (
              <CartItem
                key={item.product_id}
                item={item}
                onUpdateQuantity={updateCartItemQuantity}
                onRemove={removeFromCart}
              />
            ))}
          </div>
        )}
      </div>

      {cart.items.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>Sous-total</span>
              <span>{cart.subtotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>TVA (20%)</span>
              <span>{cart.tax.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t pt-2">
              <span>Total</span>
              <span>{cart.total.toFixed(2)}€</span>
            </div>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 
                       rounded-lg transition-colors flex items-center justify-center"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Procéder au paiement
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;
