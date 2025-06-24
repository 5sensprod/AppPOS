// src/features/pos/components/Cart.jsx
import React, { useState } from 'react';
import { ShoppingCart, CreditCard, Percent } from 'lucide-react';
import { useCashierStore } from '../stores/cashierStore';
import CartItem from './CartItem';
import DiscountModal from './DiscountModal';
import { useSessionStore } from '../../../stores/sessionStore';

const Cart = () => {
  const {
    cart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    setShowPaymentModal,
    applyItemDiscount,
    applyTicketDiscount,
    removeItemDiscount,
    removeTicketDiscount,
  } = useCashierStore();

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountModalType, setDiscountModalType] = useState(null); // 'item' ou 'ticket'
  const [selectedItem, setSelectedItem] = useState(null);

  // Ouvrir la modale de réduction pour un item
  const handleItemDiscount = (item) => {
    console.log('🔍 [Cart] handleItemDiscount appelé avec:', item); // DEBUG
    setDiscountModalType('item');
    setSelectedItem(item);
    setShowDiscountModal(true);
  };

  // Ouvrir la modale de réduction globale
  const handleTicketDiscount = () => {
    setDiscountModalType('ticket');
    setSelectedItem(null);
    setShowDiscountModal(true);
  };

  // Appliquer une réduction depuis la modale
  const handleApplyDiscount = (discountData) => {
    console.log('🔍 [Cart] handleApplyDiscount appelé:', {
      discountModalType,
      selectedItem,
      discountData,
    }); // DEBUG

    if (discountModalType === 'item' && selectedItem) {
      console.log('🔍 [Cart] Applying item discount to:', selectedItem.product_id); // DEBUG
      if (discountData === null) {
        // Supprimer la réduction
        removeItemDiscount(selectedItem.product_id);
      } else {
        // Appliquer/modifier la réduction
        applyItemDiscount(selectedItem.product_id, discountData);
      }
    } else if (discountModalType === 'ticket') {
      if (discountData === null) {
        // Supprimer la réduction ticket
        removeTicketDiscount();
      } else {
        // Appliquer/modifier la réduction ticket
        applyTicketDiscount(discountData);
      }
    }

    console.log('🔍 [Cart] Tentative fermeture modale...'); // DEBUG
    setShowDiscountModal(false);
  };

  // Calculer les détails de TVA par taux
  const getTaxBreakdown = () => {
    const taxBreakdown = {};

    cart.items.forEach((item) => {
      const taxRate = Number(item.tax_rate || 20); // 👈 transforme bien "20" en 20 (number)

      if (!taxBreakdown[taxRate]) {
        taxBreakdown[taxRate] = 0;
      }
      taxBreakdown[taxRate] += item.tax_amount || 0;
    });

    return taxBreakdown;
  };

  const taxBreakdown = getTaxBreakdown();
  console.log('🧾 Détails panier (cart.items):', cart.items); // 👈

  // Calculer les totaux avec réductions
  const subtotalBeforeDiscounts = cart.items.reduce((sum, item) => {
    return sum + item.unit_price * item.quantity;
  }, 0);

  const totalItemDiscounts = cart.items.reduce((sum, item) => {
    return sum + (item.discount?.amount || 0);
  }, 0);

  const subtotalAfterItemDiscounts = subtotalBeforeDiscounts - totalItemDiscounts;
  const ticketDiscountAmount = cart.ticket_discount?.amount || 0;
  const totalDiscounts = totalItemDiscounts + ticketDiscountAmount;

  // Vérifier si le ticket a une réduction globale
  const hasTicketDiscount = cart.ticket_discount && cart.ticket_discount.amount > 0;

  // Récupérer la réduction actuelle pour la modale
  const getCurrentDiscount = () => {
    if (discountModalType === 'item' && selectedItem) {
      return selectedItem.discount || null;
    } else if (discountModalType === 'ticket') {
      return cart.ticket_discount || null;
    }
    return null;
  };

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
                onApplyDiscount={handleItemDiscount}
              />
            ))}
          </div>
        )}
      </div>

      {cart.items.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <div className="space-y-2 mb-4">
            {/* Note d'aperçu */}
            {cart.is_preview && (
              <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-200 dark:border-blue-800">
                💡 Aperçu estimatif - Calculs définitifs à la validation
              </div>
            )}

            {/* Sous-total avant réductions */}
            {totalDiscounts > 0 && (
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Sous-total initial</span>
                <span>{subtotalBeforeDiscounts.toFixed(2)}€</span>
              </div>
            )}

            {/* Réductions items */}
            {totalItemDiscounts > 0 && (
              <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                <span>Réductions articles</span>
                <span>-{totalItemDiscounts.toFixed(2)}€</span>
              </div>
            )}

            {/* Sous-total après réductions items */}
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>Sous-total HT</span>
              <span>{cart.subtotal.toFixed(2)}€</span>
            </div>

            {/* Réduction ticket */}
            {hasTicketDiscount && (
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-red-600 dark:text-red-400">Réduction globale</span>
                  <button
                    onClick={handleTicketDiscount}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    title="Modifier la réduction globale"
                  >
                    <Percent className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-right">
                  <div className="text-red-600 dark:text-red-400">
                    -{ticketDiscountAmount.toFixed(2)}€
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {cart.ticket_discount.reason}
                  </div>
                </div>
              </div>
            )}

            {/* Affichage détaillé de la TVA par taux */}
            {Object.entries(taxBreakdown).map(([taxRate, taxAmount]) => (
              <div
                key={taxRate}
                className="flex justify-between text-sm text-gray-600 dark:text-gray-300"
              >
                <span>TVA ({taxRate}%)</span>
                <span>{taxAmount.toFixed(2)}€</span>
              </div>
            ))}

            {/* Total avec économies */}
            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                <div className="flex items-center space-x-2">
                  <span>Total TTC</span>
                  {!hasTicketDiscount && (
                    <button
                      onClick={handleTicketDiscount}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      title="Appliquer une réduction globale"
                    >
                      <Percent className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <span>{cart.total.toFixed(2)}€</span>
              </div>

              {/* Résumé des économies */}
              {totalDiscounts > 0 && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <div className="flex justify-between text-sm text-green-700 dark:text-green-300">
                    <span>💰 Économies totales</span>
                    <span className="font-medium">{totalDiscounts.toFixed(2)}€</span>
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {((totalDiscounts / subtotalBeforeDiscounts) * 100).toFixed(1)}% d'économies
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                const sessionState = useSessionStore.getState();
                if (sessionState?.lcdStatus?.owned) {
                  // ✅ LIGNE 1 : Montant
                  const line1 = `TOTAL ${cart.total.toFixed(2)}EUR`;
                  // ✅ LIGNE 2 : TOTAL + nombre + singulier/pluriel
                  const line2 = `${cart.itemCount} Article${cart.itemCount > 1 ? 's' : ''}`;

                  await sessionState.lcd.writeMessage(line1, line2);
                }
              } catch (error) {
                console.debug('LCD non disponible');
              }

              setShowPaymentModal(true);
            }}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Procéder au paiement
          </button>
        </div>
      )}

      {/* Modale de réduction */}
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onApply={handleApplyDiscount}
        discountType={discountModalType}
        itemData={selectedItem}
        currentDiscount={getCurrentDiscount()}
        cartTotal={subtotalAfterItemDiscounts} // 🆕 Passer le sous-total pour aperçu
      />
    </div>
  );
};

export default Cart;
