// AppTools\src\features\pos\components\PendingCartManager.jsx
import React, { useState, useEffect } from 'react';
import { Pause, Play, Clock, Trash2, Calendar, User, Euro, Package, X } from 'lucide-react';

const PendingCartManager = ({
  currentCart = [],
  onPutOnHold,
  onResumeCart,
  onClearCurrentCart,
}) => {
  const [pendingCarts, setPendingCarts] = useState([]);
  const [showPendingCarts, setShowPendingCarts] = useState(false);

  // Charger les paniers en attente depuis le localStorage au montage
  useEffect(() => {
    const savedPendingCarts = localStorage.getItem('pendingCarts');
    if (savedPendingCarts) {
      try {
        setPendingCarts(JSON.parse(savedPendingCarts));
      } catch (error) {
        console.error('Erreur lors du chargement des paniers en attente:', error);
        localStorage.removeItem('pendingCarts');
      }
    }
  }, []);

  // Sauvegarder dans localStorage à chaque modification
  useEffect(() => {
    try {
      localStorage.setItem('pendingCarts', JSON.stringify(pendingCarts));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paniers en attente:', error);
    }
  }, [pendingCarts]);

  // Calculer le total du panier actuel
  const currentCartTotal = currentCart.reduce((sum, item) => {
    return sum + (item.total_price || item.price * item.quantity || 0);
  }, 0);

  // Calculer le nombre d'articles du panier actuel
  const currentCartItemsCount = currentCart.reduce((sum, item) => {
    return sum + (item.quantity || 1);
  }, 0);

  const putCartOnHold = () => {
    if (currentCart.length === 0) return;

    const newPendingCart = {
      id: Date.now(),
      items: JSON.parse(JSON.stringify(currentCart)), // Deep clone pour éviter les références
      totalAmount: currentCartTotal,
      itemsCount: currentCartItemsCount,
      createdAt: new Date().toISOString(),
      customer: null, // Peut être étendu plus tard
      cashier: null, // Peut être ajouté depuis le contexte utilisateur
    };

    setPendingCarts((prev) => [...prev, newPendingCart]);

    // Notifier le parent pour vider le panier actuel
    if (onClearCurrentCart) {
      onClearCurrentCart();
    }

    // Callback optionnel pour actions supplémentaires
    if (onPutOnHold) {
      onPutOnHold(newPendingCart);
    }

    setShowPendingCarts(false);
  };

  const resumeCart = (cartId) => {
    const cart = pendingCarts.find((c) => c.id === cartId);
    if (!cart) return;

    // Notifier le parent pour restaurer le panier
    if (onResumeCart) {
      onResumeCart(cart.items);
    }

    // Supprimer le panier de la liste d'attente
    setPendingCarts((prev) => prev.filter((c) => c.id !== cartId));
    setShowPendingCarts(false);
  };

  const deletePendingCart = (cartId) => {
    setPendingCarts((prev) => prev.filter((c) => c.id !== cartId));
  };

  const clearAllPendingCarts = () => {
    setPendingCarts([]);
    setShowPendingCarts(false);
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  // Fermer le dropdown si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPendingCarts && !event.target.closest('.pending-cart-dropdown')) {
        setShowPendingCarts(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPendingCarts]);

  return (
    <div className="flex items-center space-x-3">
      {/* Bouton Mettre en attente */}
      <button
        onClick={putCartOnHold}
        disabled={currentCart.length === 0}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          currentCart.length === 0
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            : 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/30'
        }`}
        title={currentCart.length === 0 ? 'Panier vide' : 'Mettre le panier actuel en attente'}
      >
        <Pause className="h-4 w-4" />
        <span className="hidden sm:inline">Attente</span>
      </button>

      {/* Bouton et dropdown Paniers en attente */}
      <div className="relative pending-cart-dropdown">
        <button
          onClick={() => setShowPendingCarts(!showPendingCarts)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pendingCarts.length > 0
              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/30'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}
          title={`${pendingCarts.length} panier(s) en attente`}
        >
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">En attente</span>
          {pendingCarts.length > 0 && (
            <span className="bg-blue-600 dark:bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[18px] text-center leading-none">
              {pendingCarts.length}
            </span>
          )}
        </button>

        {/* Dropdown des paniers en attente */}
        {showPendingCarts && (
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-[80vh] flex flex-col">
            {/* En-tête */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Paniers en attente ({pendingCarts.length})
              </h3>
              <button
                onClick={() => setShowPendingCarts(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Liste des paniers */}
            <div className="flex-1 overflow-y-auto">
              {pendingCarts.length === 0 ? (
                <div className="p-6 text-center">
                  <Clock className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">Aucun panier en attente</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {pendingCarts.map((cart, index) => (
                    <div
                      key={cart.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        {/* Date et heure */}
                        <div className="flex items-center space-x-2 mb-2">
                          <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(cart.createdAt)} à {formatTime(cart.createdAt)}
                          </span>
                        </div>

                        {/* Informations du panier */}
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Package className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {cart.itemsCount} article{cart.itemsCount > 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <Euro className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                            <span className="font-bold text-gray-900 dark:text-gray-100">
                              {cart.totalAmount.toFixed(2)}€
                            </span>
                          </div>
                        </div>

                        {/* Aperçu des articles (optionnel) */}
                        {cart.items.length > 0 && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                            {cart.items
                              .slice(0, 2)
                              .map((item) => item.product_name || item.name)
                              .join(', ')}
                            {cart.items.length > 2 && ` et ${cart.items.length - 2} autre(s)...`}
                          </div>
                        )}

                        {/* Client si présent */}
                        {cart.customer && (
                          <div className="flex items-center space-x-1 mt-1">
                            <User className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                            <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {cart.customer}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                        <button
                          onClick={() => resumeCart(cart.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/30 rounded-md text-sm font-medium transition-colors"
                          title="Reprendre ce panier"
                        >
                          <Play className="h-4 w-4" />
                          <span className="hidden sm:inline">Reprendre</span>
                        </button>

                        <button
                          onClick={() => deletePendingCart(cart.id)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="Supprimer ce panier"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer avec action globale */}
            {pendingCarts.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                <button
                  onClick={clearAllPendingCarts}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Vider tous les paniers</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingCartManager;
