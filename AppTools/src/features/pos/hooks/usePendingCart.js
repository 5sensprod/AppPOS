// AppTools\src\features\pos\hooks\usePendingCart.js
import { useState, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer les paniers en attente
 * @param {Function} onCartChange - Callback appelé quand le panier change
 * @returns {Object} - Méthodes et état pour gérer les paniers en attente
 */
export const usePendingCart = (onCartChange) => {
  const [currentCart, setCurrentCart] = useState([]);

  // Vider le panier actuel
  const clearCurrentCart = useCallback(() => {
    setCurrentCart([]);
    if (onCartChange) {
      onCartChange([]);
    }
  }, [onCartChange]);

  // Restaurer un panier depuis l'attente
  const resumeCart = useCallback(
    (cartItems) => {
      setCurrentCart(cartItems);
      if (onCartChange) {
        onCartChange(cartItems);
      }
    },
    [onCartChange]
  );

  // Ajouter un article au panier
  const addToCart = useCallback(
    (product) => {
      setCurrentCart((prev) => {
        const existingItemIndex = prev.findIndex(
          (item) => item.id === product.id || item.product_id === product.id
        );

        let newCart;
        if (existingItemIndex >= 0) {
          // Augmenter la quantité si l'article existe déjà
          newCart = prev.map((item, index) =>
            index === existingItemIndex
              ? {
                  ...item,
                  quantity: (item.quantity || 1) + 1,
                  total_price: (item.unit_price || item.price) * ((item.quantity || 1) + 1),
                }
              : item
          );
        } else {
          // Ajouter nouvel article
          const newItem = {
            id: product.id,
            product_id: product.id,
            product_name: product.name,
            unit_price: product.price,
            quantity: 1,
            total_price: product.price,
            sku: product.sku || product.barcode,
            ...product,
          };
          newCart = [...prev, newItem];
        }

        if (onCartChange) {
          onCartChange(newCart);
        }
        return newCart;
      });
    },
    [onCartChange]
  );

  // Supprimer un article du panier
  const removeFromCart = useCallback(
    (productId) => {
      setCurrentCart((prev) => {
        const newCart = prev.filter(
          (item) => item.id !== productId && item.product_id !== productId
        );
        if (onCartChange) {
          onCartChange(newCart);
        }
        return newCart;
      });
    },
    [onCartChange]
  );

  // Modifier la quantité d'un article
  const updateQuantity = useCallback(
    (productId, quantity) => {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }

      setCurrentCart((prev) => {
        const newCart = prev.map((item) => {
          if (item.id === productId || item.product_id === productId) {
            return {
              ...item,
              quantity,
              total_price: (item.unit_price || item.price) * quantity,
            };
          }
          return item;
        });

        if (onCartChange) {
          onCartChange(newCart);
        }
        return newCart;
      });
    },
    [onCartChange, removeFromCart]
  );

  // Callback pour quand un panier est mis en attente
  const handlePutOnHold = useCallback((pendingCart) => {
    console.log('Panier mis en attente:', pendingCart);
    // Ici vous pouvez ajouter d'autres actions comme :
    // - Logger l'action
    // - Envoyer une notification
    // - Sauvegarder en base de données
    // - etc.
  }, []);

  return {
    currentCart,
    setCurrentCart,
    clearCurrentCart,
    resumeCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    handlePutOnHold,
  };
};
