// src/features/pos/stores/cashierStore.js - APPROCHE POS STANDARD
import { create } from 'zustand';
import salesService from '../../../services/salesService';
import cashierSessionService from '../../../services/cashierSessionService';
import { useSessionStore } from '../../../stores/sessionStore';

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
      const estimatedItemTax = finalItemPrice - finalItemPrice / (1 + taxRate / 100);

      subtotalBeforeDiscounts += originalSubtotal;
      totalItemDiscounts += itemDiscountAmount;
      estimatedTax += estimatedItemTax;

      return {
        ...item,
        total_price: Math.round(finalItemPrice * 100) / 100,
        discount_amount: itemDiscountAmount > 0 ? itemDiscountAmount : undefined,
        tax_amount: Math.round(estimatedItemTax * 100) / 100,
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
    console.log('🔍 [STORE] addToCart appelé:', product.name, quantity);

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

    console.log('🔍 [STORE] Items après ajout:', newItems.length);
    get().recalculatePreviewAndNotify(newItems);

    // ✅ AFFICHAGE LCD
    console.log('🔍 [STORE] Début affichage LCD...');
    setTimeout(async () => {
      console.log('🔍 [STORE] Dans setTimeout LCD...');
      try {
        const sessionState = useSessionStore.getState();
        console.log('🔍 [STORE] sessionState récupéré via import');

        if (sessionState?.lcdStatus?.owned) {
          console.log('🔍 [STORE] LCD owned, affichage...');
          const productNameTruncated =
            product.name.length > 17 ? product.name.substring(0, 17) : product.name;

          await sessionState.lcd.writeMessage(
            `${product.price.toFixed(2)}EUR`,
            productNameTruncated
          );
          console.log(
            `💰 [STORE] Produit LCD affiché: ${productNameTruncated} - ${product.price}€`
          );
        } else {
          console.log('🔍 [STORE] LCD pas owned');
        }
      } catch (error) {
        console.error('❌ [STORE] Erreur affichage produit LCD:', error);
      }
    }, 200);
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

    // ✅ NOUVEAU : Affichage LCD pour modification quantité
    setTimeout(async () => {
      try {
        const sessionState = useSessionStore.getState();
        if (sessionState?.lcdStatus?.owned) {
          const updatedItem = newItems.find((item) => item.product_id === productId);
          if (updatedItem) {
            const productNameTruncated =
              updatedItem.product_name.length > 14
                ? updatedItem.product_name.substring(0, 14)
                : updatedItem.product_name;

            const line1 = `${updatedItem.total_price.toFixed(2)}EUR`;
            const line2 = `${productNameTruncated} x${newQuantity}`;
            await sessionState.lcd.writeMessage(line1, line2);
            console.log(`🔄 [STORE] Quantité LCD: ${line1} - ${line2}`);
          }
        }
      } catch (error) {
        console.debug('❌ [STORE] Erreur affichage quantité LCD:', error.message);
      }
    }, 200);
  },

  removeFromCart: (productId) => {
    const state = get();
    const newItems = state.cart.items.filter((item) => item.product_id !== productId);
    get().recalculatePreviewAndNotify(newItems);
  },

  clearCart: () => {
    console.log('🗑️ [STORE] Vidage du panier...');

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

    console.log('✅ [STORE] Panier vidé');
  },

  // 🆕 ACTIONS RÉDUCTIONS (aperçu frontend)
  applyItemDiscount: (productId, discountData) => {
    const state = get();

    console.log('🔧 [STORE] Application réduction item:', { productId, discountData });

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
      const officialReceipt = response.data.receipt;

      console.log("🎯 [STORE] Calculs officiels reçus de l'API:", officialReceipt);

      set((state) => ({
        ...state,
        loading: false,
        lastReceipt: officialReceipt,
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

// ========================================
// 🆕 ÉCOUTER LA FERMETURE DE SESSION ET VIDER LE PANIER
// ========================================
console.log('🎣 [CASHIER STORE] Initialisation de la subscription à la session...');

useSessionStore.subscribe(
  // Sélecteur: surveiller cashierSession
  (state) => state.cashierSession,
  // Callback: appelé quand cashierSession change
  (currentSession, previousSession) => {
    console.log('🔍 [CASHIER STORE] Session changée:', {
      previous: previousSession?.status,
      current: currentSession?.status,
    });

    // ✅ Si on passe d'une session active à null ou closed
    const hadActiveSession = previousSession?.status === 'active';
    const hasNoSession = !currentSession || currentSession.status === 'closed';

    if (hadActiveSession && hasNoSession) {
      console.log('🗑️ [CASHIER STORE] Session fermée détectée, vidage du panier...');

      // Vider le panier
      useCashierStore.getState().clearCart();

      console.log('✅ [CASHIER STORE] Panier vidé automatiquement suite à la fermeture de session');
    }
  }
);

console.log('✅ [CASHIER STORE] Subscription à la session initialisée');
