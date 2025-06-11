// src/features/pos/stores/cashierStore.js - Avec sync API automatique
import { create } from 'zustand';
import salesService from '../../../services/salesService';
import cashierSessionService from '../../../services/cashierSessionService';

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

  // ✅ NOUVEAU : Fonction pour notifier l'API des changements de panier
  notifyAPICartChange: async () => {
    const state = get();
    try {
      console.log(
        `🔄 [STORE] Notification API: ${state.cart.itemCount} articles, ${state.cart.total.toFixed(2)}€`
      );
      await cashierSessionService.notifyCartChange(state.cart.itemCount, state.cart.total);
    } catch (error) {
      console.debug('⚠️ [STORE] Erreur notification API panier:', error.message);
      // Ne pas faire échouer l'action si la notification API échoue
    }
  },

  // ✅ Fonction helper pour recalculer et notifier
  recalculateCartAndNotify: (newItems) => {
    const subtotal = newItems.reduce((sum, item) => sum + item.total_price, 0);
    const tax = subtotal * 0.2; // 20% de TVA
    const total = subtotal + tax;
    const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

    const newCart = {
      items: newItems,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      itemCount,
    };

    set({ cart: newCart });

    // ✅ NOTIFICATION API AUTOMATIQUE
    setTimeout(() => {
      get().notifyAPICartChange();
    }, 100); // Petit délai pour s'assurer que l'état est mis à jour

    return newCart;
  },

  // Actions du panier MODIFIÉES pour sync API
  addToCart: (product, quantity = 1) => {
    const state = get();
    const existingItemIndex = state.cart.items.findIndex((item) => item.product_id === product._id);

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

    // ✅ RECALCUL + NOTIFICATION API
    get().recalculateCartAndNotify(newItems);
  },

  updateCartItemQuantity: (productId, newQuantity) => {
    const state = get();

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

    // ✅ RECALCUL + NOTIFICATION API
    get().recalculateCartAndNotify(newItems);
  },

  removeFromCart: (productId) => {
    const state = get();
    const newItems = state.cart.items.filter((item) => item.product_id !== productId);

    // ✅ RECALCUL + NOTIFICATION API
    get().recalculateCartAndNotify(newItems);
  },

  clearCart: () => {
    // ✅ VIDER + NOTIFICATION API
    set({
      cart: {
        items: [],
        total: 0,
        subtotal: 0,
        tax: 0,
        itemCount: 0,
      },
    });

    // ✅ NOTIFICATION API PANIER VIDE
    setTimeout(() => {
      get().notifyAPICartChange();
    }, 100);
  },

  // Actions de vente MODIFIÉES
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

      // ✅ VIDER LE PANIER après la vente (avec notification API automatique)
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

  // Recherche produit (inchangé)
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

  // Gestion UI (inchangé)
  setShowPaymentModal: (show) => set({ showPaymentModal: show }),
  setShowReceiptModal: (show) => set({ showReceiptModal: show }),
  setError: (error) => set({ error }),
}));
