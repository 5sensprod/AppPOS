// src/features/pos/stores/cashierStore.js
import { create } from 'zustand';
import salesService from '../../../services/salesService';
import { useAuth } from '../../../contexts/AuthContext';

export const useCashierStore = create((set, get) => ({
  // État du panier
  cart: {
    items: [],
    total: 0,
    subtotal: 0,
    tax: 0,
    itemCount: 0,
  },

  // État des ventes
  sales: [],
  currentSale: null,
  salesLoading: false,
  salesError: null,

  // État UI
  loading: false,
  error: null,
  showPaymentModal: false,
  showReceiptModal: false,
  lastReceipt: null,

  // Actions du panier
  addToCart: (product, quantity = 1) => {
    set((state) => {
      const existingItemIndex = state.cart.items.findIndex(
        (item) => item.product_id === product._id
      );

      let newItems;
      if (existingItemIndex >= 0) {
        // Produit déjà dans le panier, augmenter la quantité
        newItems = state.cart.items.map((item, index) =>
          index === existingItemIndex ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        // Nouveau produit
        const cartItem = {
          product_id: product._id,
          product_name: product.name,
          sku: product.sku,
          barcode: product.meta_data?.find((m) => m.key === 'barcode')?.value || '',
          quantity,
          unit_price: product.price,
          total_price: product.price * quantity,
        };
        newItems = [...state.cart.items, cartItem];
      }

      // Recalculer les totaux
      const subtotal = newItems.reduce((sum, item) => sum + item.total_price, 0);
      const tax = subtotal * 0.2; // 20% de TVA
      const total = subtotal + tax;

      return {
        ...state,
        cart: {
          items: newItems,
          subtotal: Math.round(subtotal * 100) / 100,
          tax: Math.round(tax * 100) / 100,
          total: Math.round(total * 100) / 100,
          itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
        },
      };
    });
  },

  updateCartItemQuantity: (productId, newQuantity) => {
    set((state) => {
      if (newQuantity <= 0) {
        // Supprimer l'item si quantité = 0
        return get().removeFromCart(productId);
      }

      const newItems = state.cart.items.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity: newQuantity,
              total_price: Math.round(item.unit_price * newQuantity * 100) / 100,
            }
          : item
      );

      // Recalculer les totaux
      const subtotal = newItems.reduce((sum, item) => sum + item.total_price, 0);
      const tax = subtotal * 0.2;
      const total = subtotal + tax;

      return {
        ...state,
        cart: {
          items: newItems,
          subtotal: Math.round(subtotal * 100) / 100,
          tax: Math.round(tax * 100) / 100,
          total: Math.round(total * 100) / 100,
          itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
        },
      };
    });
  },

  removeFromCart: (productId) => {
    set((state) => {
      const newItems = state.cart.items.filter((item) => item.product_id !== productId);

      // Recalculer les totaux
      const subtotal = newItems.reduce((sum, item) => sum + item.total_price, 0);
      const tax = subtotal * 0.2;
      const total = subtotal + tax;

      return {
        ...state,
        cart: {
          items: newItems,
          subtotal: Math.round(subtotal * 100) / 100,
          tax: Math.round(tax * 100) / 100,
          total: Math.round(total * 100) / 100,
          itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
        },
      };
    });
  },

  clearCart: () => {
    set((state) => ({
      ...state,
      cart: {
        items: [],
        total: 0,
        subtotal: 0,
        tax: 0,
        itemCount: 0,
      },
    }));
  },

  // Actions de vente
  processSale: async (paymentMethod = 'cash') => {
    const state = get();

    if (state.cart.items.length === 0) {
      throw new Error('Le panier est vide');
    }

    set({ loading: true, error: null });

    try {
      const saleData = {
        items: state.cart.items,
        payment_method: paymentMethod,
      };

      const response = await salesService.createSale(saleData);

      set((state) => ({
        ...state,
        loading: false,
        lastReceipt: response.data.receipt,
        showReceiptModal: true,
        currentSale: response.data.sale,
      }));

      // Vider le panier après la vente
      get().clearCart();

      return response.data;
    } catch (error) {
      set({
        loading: false,
        error: error.message || 'Erreur lors de la vente',
      });
      throw error;
    }
  },

  // Recherche produit
  searchProduct: async (barcode) => {
    set({ loading: true, error: null });

    try {
      const response = await salesService.searchProductByBarcode(barcode);
      set({ loading: false });
      return response.data;
    } catch (error) {
      set({
        loading: false,
        error: `Produit non trouvé: ${barcode}`,
      });
      throw error;
    }
  },

  // Gestion UI
  setShowPaymentModal: (show) => set({ showPaymentModal: show }),
  setShowReceiptModal: (show) => set({ showReceiptModal: show }),
  setError: (error) => set({ error }),
}));
