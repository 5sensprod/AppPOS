// src/features/pos/stores/cashierStore.js - APPROCHE POS STANDARD
import { create } from 'zustand';
import salesService from '../../../services/salesService';
import cashierSessionService from '../../../services/cashierSessionService';

export const useCashierStore = create((set, get) => ({
  // ✅ ÉTAT DU PANIER - APERÇU FRONTEND UNIQUEMENT
  cart: {
    items: [],
    total: 0,
    subtotal: 0,
    tax: 0,
    itemCount: 0,
    // 🆕 RÉDUCTIONS (APERÇU FRONTEND)
    ticket_discount: null,
    total_item_discounts: 0,
    total_discounts: 0,
    // 🆕 FLAG POUR INDIQUER QUE C'EST UN APERÇU
    is_preview: true,
  },

  // ✅ ÉTAT DES VENTES
  sales: [],
  currentSale: null,
  salesLoading: false,
  salesError: null,

  // ✅ ÉTAT UI
  loading: false,
  error: null,
  showPaymentModal: false,
  showReceiptModal: false,
  lastReceipt: null,

  // ✅ NOTIFICATION API (inchangée)
  notifyAPICartChange: async () => {
    const state = get();
    try {
      await cashierSessionService.notifyCartChange(state.cart.itemCount, state.cart.total);
    } catch (error) {
      console.debug('⚠️ [STORE] Erreur notification API panier:', error.message);
    }
  },

  // 🆕 CALCUL APERÇU FRONTEND (ESTIMATIF SEULEMENT)
  calculatePreviewTotals: (items, ticketDiscount = null) => {
    let subtotalBeforeDiscounts = 0;
    let totalItemDiscounts = 0;
    let estimatedTax = 0;

    // Calculer aperçu pour chaque item
    const previewItems = items.map((item) => {
      const originalSubtotal = item.unit_price * item.quantity;
      let itemDiscountAmount = 0;

      // Calculer réduction item (aperçu)
      if (item.discount && item.discount.amount > 0) {
        itemDiscountAmount = item.discount.amount;
      }

      const finalItemPrice = originalSubtotal - itemDiscountAmount;
      const taxRate = item.tax_rate || 20;
      const estimatedItemTax = finalItemPrice * (taxRate / (100 + taxRate));

      subtotalBeforeDiscounts += originalSubtotal;
      totalItemDiscounts += itemDiscountAmount;
      estimatedTax += estimatedItemTax;

      return {
        ...item,
        total_price: Math.round(finalItemPrice * 100) / 100,
        discount_amount: itemDiscountAmount > 0 ? itemDiscountAmount : undefined,
        // 🎯 APERÇU SEULEMENT - pas de calcul précis de TVA
        estimated_tax: Math.round(estimatedItemTax * 100) / 100,
      };
    });

    // Calculer réduction ticket (aperçu)
    const subtotalAfterItems = subtotalBeforeDiscounts - totalItemDiscounts;
    let ticketDiscountAmount = 0;

    if (ticketDiscount && ticketDiscount.amount > 0) {
      ticketDiscountAmount = ticketDiscount.amount;
    }

    const estimatedTotal = Math.max(0, subtotalAfterItems - ticketDiscountAmount);
    const totalDiscounts = totalItemDiscounts + ticketDiscountAmount;

    return {
      items: previewItems,
      subtotal: Math.round((estimatedTotal - estimatedTax) * 100) / 100,
      tax: Math.round(estimatedTax * 100) / 100,
      total: Math.round(estimatedTotal * 100) / 100,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      ticket_discount: ticketDiscount,
      total_item_discounts: Math.round(totalItemDiscounts * 100) / 100,
      total_discounts: Math.round(totalDiscounts * 100) / 100,
      // 🚨 IMPORTANT : Marquer comme aperçu
      is_preview: true,
      preview_note: 'Aperçu - calculs définitifs à la validation',
    };
  },

  // ✅ RECALCUL APERÇU + NOTIFICATION
  recalculatePreviewAndNotify: (newItems, ticketDiscount = null) => {
    const state = get();
    const currentTicketDiscount =
      ticketDiscount !== null ? ticketDiscount : state.cart.ticket_discount;

    const newCart = get().calculatePreviewTotals(newItems, currentTicketDiscount);

    set({ cart: newCart });

    // Notification API
    setTimeout(() => {
      get().notifyAPICartChange();
    }, 100);

    return newCart;
  },

  // ✅ ACTIONS PANIER (aperçu frontend)
  addToCart: (product, quantity = 1) => {
    const state = get();
    const existingItemIndex = state.cart.items.findIndex((item) => item.product_id === product._id);

    let newItems;
    if (existingItemIndex >= 0) {
      newItems = state.cart.items.map((item, index) =>
        index === existingItemIndex ? { ...item, quantity: item.quantity + quantity } : item
      );
    } else {
      const cartItem = {
        product_id: product._id,
        product_name: product.name,
        sku: product.sku,
        barcode: product.meta_data?.find((m) => m.key === 'barcode')?.value || '',
        quantity,
        unit_price: product.price,
        total_price: product.price * quantity,
        tax_rate: product.tax_rate || 20,
        discount: null,
      };
      newItems = [...state.cart.items, cartItem];
    }

    get().recalculatePreviewAndNotify(newItems);
  },

  updateCartItemQuantity: (productId, newQuantity) => {
    const state = get();

    if (newQuantity <= 0) {
      return get().removeFromCart(productId);
    }

    const newItems = state.cart.items.map((item) =>
      item.product_id === productId
        ? {
            ...item,
            quantity: newQuantity,
            total_price: Math.round(item.unit_price * newQuantity * 100) / 100,
            // Recalculer réduction si pourcentage
            ...(item.discount &&
              item.discount.type === 'percentage' && {
                discount: {
                  ...item.discount,
                  amount:
                    Math.round(
                      ((item.unit_price * newQuantity * item.discount.value) / 100) * 100
                    ) / 100,
                },
              }),
          }
        : item
    );

    get().recalculatePreviewAndNotify(newItems);
  },

  removeFromCart: (productId) => {
    const state = get();
    const newItems = state.cart.items.filter((item) => item.product_id !== productId);
    get().recalculatePreviewAndNotify(newItems);
  },

  clearCart: () => {
    set({
      cart: {
        items: [],
        total: 0,
        subtotal: 0,
        tax: 0,
        itemCount: 0,
        ticket_discount: null,
        total_item_discounts: 0,
        total_discounts: 0,
        is_preview: true,
      },
    });

    setTimeout(() => {
      get().notifyAPICartChange();
    }, 100);
  },

  // 🆕 ACTIONS RÉDUCTIONS (aperçu frontend)
  applyItemDiscount: (productId, discountData) => {
    const state = get();

    console.log('🔧 [STORE] Application réduction item:', { productId, discountData }); // DEBUG

    const newItems = state.cart.items.map((item) => {
      if (item.product_id === productId) {
        let discountAmount = 0;

        if (discountData.type === 'percentage') {
          discountAmount = (item.unit_price * item.quantity * discountData.value) / 100;
        } else if (discountData.type === 'fixed') {
          discountAmount = Math.min(discountData.value, item.unit_price * item.quantity);
        }

        return {
          ...item,
          discount: {
            type: discountData.type,
            value: discountData.value,
            amount: Math.round(discountAmount * 100) / 100,
            reason: discountData.reason,
          },
        };
      }
      return item;
    });

    get().recalculatePreviewAndNotify(newItems);
    console.log(
      `✅ [STORE] Réduction item appliquée (aperçu): ${discountData.type} ${discountData.value}`
    );
  },

  removeItemDiscount: (productId) => {
    const state = get();

    const newItems = state.cart.items.map((item) => {
      if (item.product_id === productId) {
        return { ...item, discount: null };
      }
      return item;
    });

    get().recalculatePreviewAndNotify(newItems);
    console.log(`✅ [STORE] Réduction item supprimée (aperçu) pour: ${productId}`);
  },

  applyTicketDiscount: (discountData) => {
    const state = get();

    // Calculer sur le sous-total après réductions items
    const subtotalAfterItems = state.cart.items.reduce((sum, item) => {
      const itemTotal = item.unit_price * item.quantity;
      const itemDiscount = item.discount?.amount || 0;
      return sum + (itemTotal - itemDiscount);
    }, 0);

    let discountAmount = 0;
    if (discountData.type === 'percentage') {
      discountAmount = (subtotalAfterItems * discountData.value) / 100;
    } else if (discountData.type === 'fixed') {
      discountAmount = Math.min(discountData.value, subtotalAfterItems);
    }

    const ticketDiscount = {
      type: discountData.type,
      value: discountData.value,
      amount: Math.round(discountAmount * 100) / 100,
      reason: discountData.reason,
    };

    get().recalculatePreviewAndNotify(state.cart.items, ticketDiscount);
    console.log(
      `✅ [STORE] Réduction ticket appliquée (aperçu): ${discountData.type} ${discountData.value}`
    );
  },

  removeTicketDiscount: () => {
    const state = get();
    get().recalculatePreviewAndNotify(state.cart.items, null);
    console.log(`✅ [STORE] Réduction ticket supprimée (aperçu)`);
  },

  // 🎯 VENTE AVEC CALCULS API OFFICIELS
  processSale: async (paymentData = {}) => {
    const state = get();

    if (state.cart.items.length === 0) {
      throw new Error('Le panier est vide');
    }

    set({ loading: true, error: null });

    try {
      // 🎯 ENVOYER DONNÉES BRUTES À L'API (pas les calculs frontend)
      const saleData = {
        items: state.cart.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          ...(item.discount && { discount: item.discount }),
        })),
        ...(state.cart.ticket_discount && {
          ticket_discount: state.cart.ticket_discount,
        }),
        payment_method: paymentData.payment_method || paymentData || 'cash',
        ...(paymentData.cash_payment_data && {
          cash_payment_data: paymentData.cash_payment_data,
        }),
        ...(paymentData.mixed_payment_data && {
          mixed_payment_data: paymentData.mixed_payment_data,
        }),
      };

      console.log("🎯 [STORE] Envoi données brutes à l'API (calculs officiels):", saleData);

      const response = await salesService.createSale(saleData);

      // 🎯 UTILISER LES CALCULS OFFICIELS DE L'API
      const officialReceipt = response.data.receipt;

      console.log("🎯 [STORE] Calculs officiels reçus de l'API:", officialReceipt);

      set((state) => ({
        ...state,
        loading: false,
        lastReceipt: officialReceipt, // 🎯 Calculs officiels de l'API
        showReceiptModal: true,
        currentSale: response.data.sale,
      }));

      // Vider le panier après succès
      get().clearCart();

      console.log('✅ [STORE] Vente validée avec calculs API officiels');
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Erreur lors de la vente';

      set({
        loading: false,
        error: errorMessage,
      });

      console.error('❌ [STORE] Erreur vente:', error);
      throw new Error(errorMessage);
    }
  },

  // ✅ RECHERCHE PRODUIT (inchangée)
  searchProduct: async (code, searchType = 'auto') => {
    set({ loading: true, error: null });

    try {
      const response = await salesService.searchProduct(code, searchType);
      set({ loading: false });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || `Produit non trouvé: ${code}`;
      set({
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  // ✅ GESTION UI (inchangée)
  setShowPaymentModal: (show) => set({ showPaymentModal: show }),
  setShowReceiptModal: (show) => set({ showReceiptModal: show }),
  setError: (error) => set({ error }),
}));
