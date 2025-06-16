// src/features/pos/stores/cashierStore.js - AVEC LOGIQUE TVA CORRIGÉE
import { create } from 'zustand';
import salesService from '../../../services/salesService';
import cashierSessionService from '../../../services/cashierSessionService';

export const useCashierStore = create((set, get) => ({
  // ✅ ÉTAT DU PANIER (inchangé)
  cart: {
    items: [],
    total: 0,
    subtotal: 0,
    tax: 0,
    itemCount: 0,
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

  // ✅ NOTIFICATION API SIMPLIFIÉE (comme avant)
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

  // 🆕 FONCTION HELPER POUR CALCULER LA TVA D'UN PRODUIT
  calculateProductTax: (product, quantity) => {
    const taxRate = product.tax_rate || 20; // Utiliser le tax_rate du produit ou 20% par défaut
    const priceTTC = product.price; // Le prix est déjà TTC
    const priceHT = priceTTC / (1 + taxRate / 100); // Calculer le prix HT
    const taxAmount = (priceTTC - priceHT) * quantity; // TVA pour cette quantité

    return {
      priceHT: Math.round(priceHT * 100) / 100,
      priceTTC: priceTTC,
      taxAmount: Math.round(taxAmount * 100) / 100,
      taxRate: taxRate,
    };
  },

  // ✅ FONCTION HELPER POUR RECALCULER CORRECTEMENT (modifiée)
  recalculateCartAndNotify: (newItems) => {
    let totalHT = 0;
    let totalTVA = 0;
    let totalTTC = 0;

    // Calculer pour chaque item avec son propre taux de TVA
    const itemsWithTax = newItems.map((item) => {
      // Retrouver le produit pour avoir ses infos de TVA
      // Pour l'instant, on utilise un taux par défaut de 20%
      // TODO: Il faudrait stocker tax_rate dans l'item du panier
      const taxRate = item.tax_rate || 20;
      const priceTTC = item.unit_price;
      const priceHT = priceTTC / (1 + taxRate / 100);
      const taxAmountForItem = (priceTTC - priceHT) * item.quantity;

      totalHT += priceHT * item.quantity;
      totalTVA += taxAmountForItem;
      totalTTC += priceTTC * item.quantity;

      return {
        ...item,
        tax_rate: taxRate,
        unit_price_ht: Math.round(priceHT * 100) / 100,
        unit_price_ttc: priceTTC,
        total_price_ht: Math.round(priceHT * item.quantity * 100) / 100,
        total_price_ttc: Math.round(priceTTC * item.quantity * 100) / 100,
        tax_amount: Math.round(taxAmountForItem * 100) / 100,
      };
    });

    const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

    const newCart = {
      items: itemsWithTax,
      subtotal: Math.round(totalHT * 100) / 100, // Sous-total HT
      tax: Math.round(totalTVA * 100) / 100, // Total TVA
      total: Math.round(totalTTC * 100) / 100, // Total TTC
      itemCount,
    };

    set({ cart: newCart });

    // ✅ NOTIFICATION API AUTOMATIQUE (comme avant)
    setTimeout(() => {
      get().notifyAPICartChange();
    }, 100);

    return newCart;
  },

  // ✅ ACTIONS DU PANIER MODIFIÉES (tax_rate ajouté)
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
        unit_price: product.price, // Prix TTC
        total_price: product.price * quantity, // Total TTC
        tax_rate: product.tax_rate || 20, // 🆕 Stocker le taux de TVA du produit
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

  // ✅ ACTIONS DE VENTE MODIFIÉES (restaurées)
  processSale: async (paymentData = {}) => {
    const state = get();

    if (state.cart.items.length === 0) {
      throw new Error('Le panier est vide');
    }

    set({ loading: true, error: null });

    try {
      // ✅ NOUVEAU : Construire les données de vente complètes
      const saleData = {
        items: state.cart.items,
        // Support ancien format (rétrocompatibilité)
        payment_method: paymentData.payment_method || paymentData || 'cash',
        // ✅ NOUVEAU : Données de paiement détaillées
        ...(paymentData.cash_payment_data && {
          cash_payment_data: paymentData.cash_payment_data,
        }),
        ...(paymentData.mixed_payment_data && {
          mixed_payment_data: paymentData.mixed_payment_data,
        }),
      };

      console.log('🛒 [STORE] Données vente envoyées:', saleData);

      const response = await salesService.createSale(saleData);

      set((state) => ({
        ...state,
        loading: false,
        lastReceipt: response.data.receipt,
        showReceiptModal: true,
        currentSale: response.data.sale,
      }));

      // Vider le panier après la vente (avec notification API automatique)
      get().clearCart();

      console.log('✅ [STORE] Vente créée avec succès:', response.data);
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

  // ✅ RECHERCHE PRODUIT (inchangé)
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

  // ✅ GESTION UI (inchangé)
  setShowPaymentModal: (show) => set({ showPaymentModal: show }),
  setShowReceiptModal: (show) => set({ showReceiptModal: show }),
  setError: (error) => set({ error }),
}));
