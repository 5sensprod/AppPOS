// src/features/pos/CashierPage.jsx - VERSION SANS MODAL GENANTE
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCashierStore } from './stores/cashierStore';
import { useAuth } from '../../contexts/AuthContext';
import { useCashierSession } from './hooks/useCashierSession';
import SessionManager from './components/SessionManager';
import {
  Search,
  ShoppingCart,
  CreditCard,
  Trash2,
  Plus,
  Minus,
  Scan,
  User,
  Clock,
  Euro,
  Monitor,
  AlertTriangle,
} from 'lucide-react';

const ProductSearch = ({ onProductFound }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { searchProduct } = useCashierStore();
  const searchInputRef = useRef(null);

  const handleSearch = async (term) => {
    if (!term.trim()) return;

    setIsSearching(true);
    try {
      const product = await searchProduct(term);
      onProductFound(product);
      setSearchTerm('');
    } catch (error) {
      console.error('Produit non trouvé:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(searchTerm);
    }
  };

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center">
        <Scan className="h-5 w-5 mr-2" />
        Recherche produit
      </h3>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Scanner ou saisir code-barres / nom produit..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     text-lg"
          disabled={isSearching}
        />

        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      <button
        onClick={() => handleSearch(searchTerm)}
        disabled={!searchTerm.trim() || isSearching}
        className="mt-3 w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 
                   text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {isSearching ? 'Recherche...' : 'Rechercher'}
      </button>
    </div>
  );
};

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

const Cart = () => {
  const { cart, updateCartItemQuantity, removeFromCart, clearCart, setShowPaymentModal } =
    useCashierStore();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-full flex flex-col">
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
              <p className="text-sm">Scannez un produit pour commencer</p>
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

const PaymentModal = () => {
  const { showPaymentModal, setShowPaymentModal, processSale, cart, loading } = useCashierStore();
  const { canUseLCD, lcd } = useCashierSession();
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const handlePayment = async () => {
    try {
      await processSale(paymentMethod);
      setShowPaymentModal(false);

      // Panier vidé, LCD géré par l'API
    } catch (error) {
      console.error('Erreur paiement:', error);
    }
  };

  if (!showPaymentModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Paiement - {cart.total.toFixed(2)}€
        </h3>

        <div className="space-y-3 mb-6">
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="form-radio"
            />
            <span className="text-gray-700 dark:text-gray-300">Espèces</span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="radio"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="form-radio"
            />
            <span className="text-gray-700 dark:text-gray-300">Carte bancaire</span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="radio"
              value="mixed"
              checked={paymentMethod === 'mixed'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="form-radio"
            />
            <span className="text-gray-700 dark:text-gray-300">Mixte</span>
          </label>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowPaymentModal(false)}
            disabled={loading}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 
                       rounded-lg transition-colors"
          >
            Annuler
          </button>

          <button
            onClick={handlePayment}
            disabled={loading}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 
                       rounded-lg transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Traitement...
              </>
            ) : (
              'Valider le paiement'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReceiptModal = () => {
  const { showReceiptModal, setShowReceiptModal, lastReceipt } = useCashierStore();

  if (!showReceiptModal || !lastReceipt) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full max-h-96 overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white text-center">
          Ticket de caisse
        </h3>

        <div className="text-sm space-y-2 mb-6">
          <div className="text-center border-b pb-2 mb-3">
            <p className="font-bold">MAGASIN POS</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {new Date(lastReceipt.date).toLocaleString('fr-FR')}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Transaction: {lastReceipt.transaction_id}
            </p>
          </div>

          {lastReceipt.items.map((item, index) => (
            <div key={index} className="flex justify-between">
              <div className="flex-1">
                <p className="font-medium">{item.product_name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {item.quantity} x {item.unit_price.toFixed(2)}€
                </p>
              </div>
              <span className="font-medium">{item.total_price.toFixed(2)}€</span>
            </div>
          ))}

          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span>{lastReceipt.subtotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span>TVA</span>
              <span>{lastReceipt.tax_amount.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-1">
              <span>Total</span>
              <span>{lastReceipt.total_amount.toFixed(2)}€</span>
            </div>
          </div>

          <div className="text-center mt-3 pt-2 border-t">
            <p className="text-xs">Paiement: {lastReceipt.payment_method}</p>
            <p className="text-xs">Caissier: {lastReceipt.cashier}</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowReceiptModal(false)}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 
                       rounded-lg transition-colors"
          >
            Fermer
          </button>

          <button
            onClick={() => window.print()}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 
                       rounded-lg transition-colors"
          >
            Imprimer
          </button>
        </div>
      </div>
    </div>
  );
};

// COMPOSANT PRINCIPAL - VERSION SIMPLE QUI MARCHE
const CashierPage = () => {
  const { user } = useAuth();
  const { addToCart, error, setError } = useCashierStore();
  const { hasActiveSession, canUseLCD, lcd, sessionError, lcdError } = useCashierSession();

  // ✅ DEBUG SEULEMENT LORS DES CHANGEMENTS RÉELS
  useEffect(() => {
    console.log(`🖥️ [CASHIER PAGE] Session changed: ${hasActiveSession}`);
  }, [hasActiveSession]);

  useEffect(() => {
    console.log(`📺 [CASHIER PAGE] LCD changed: ${canUseLCD}`);
  }, [canUseLCD]);

  // Gestion ajout produit - Affichage prix seulement
  const handleProductFound = useCallback(
    async (product) => {
      if (product.manage_stock && product.stock <= 0) {
        setError(`Produit "${product.name}" en rupture de stock`);
        return;
      }

      addToCart(product, 1);
      setError(null);

      // Affichage prix produit (l'API gère le résumé panier automatiquement)
      if (canUseLCD) {
        try {
          const productName =
            product.name.length > 20 ? product.name.substring(0, 17) + '...' : product.name;
          await lcd.showPrice(productName, product.price);
        } catch (error) {
          console.debug('Erreur affichage produit LCD:', error.message);
        }
      }
    },
    [addToCart, setError, canUseLCD, lcd]
  );

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'Escape') setError(null);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setError]);

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-4">
      <div className="mb-4">
        <SessionManager />
      </div>

      <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Euro className="h-6 w-6 mr-2" />
              Caisse POS
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {hasActiveSession ? 'Session active' : 'Aucune session'} - {user?.username}
            </p>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              {user?.username}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {new Date().toLocaleTimeString('fr-FR')}
            </div>
            {canUseLCD && (
              <div className="flex items-center text-green-600">
                <Monitor className="h-4 w-4 mr-1" />
                <span className="text-xs">LCD Actif</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {(sessionError || lcdError) && (
        <div className="mb-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span>{sessionError || lcdError}</span>
          </div>
        </div>
      )}

      {/* Interface principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-280px)]">
        <div className="lg:col-span-1">
          <ProductSearch onProductFound={handleProductFound} />
        </div>
        <div className="lg:col-span-2">
          <Cart />
        </div>
      </div>

      <PaymentModal />
      <ReceiptModal />
    </div>
  );
};

export default CashierPage;
