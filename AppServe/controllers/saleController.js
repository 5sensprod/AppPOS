// controllers/saleController.js
const BaseController = require('./base/BaseController');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const ResponseHandler = require('../handlers/ResponseHandler');
const { getEntityEventService } = require('../services/events/entityEvents');

class SaleController extends BaseController {
  constructor() {
    super(Sale);
    this.eventService = getEntityEventService('sales');
    this.productEventService = getEntityEventService('products');
  }

  async createSale(req, res) {
    try {
      // ✅ Extraction avec réductions
      const { items, payment_method = 'cash', ticket_discount = null } = req.body;

      const cashier = req.user;

      // Validation
      if (!items || !Array.isArray(items) || items.length === 0) {
        return ResponseHandler.badRequest(res, 'Articles requis pour créer une vente');
      }

      // 1. Valider et enrichir les articles AVEC réductions
      const enrichedItems = [];
      let subtotalBeforeDiscounts = 0; // Total avant TOUTES réductions
      let totalItemDiscounts = 0; // Total réductions items
      let subtotalAfterItemDiscounts = 0; // Total après réductions items

      for (const item of items) {
        // ✅ Extraire discount
        const { product_id, quantity, discount = null } = item;

        if (!product_id || !quantity || quantity <= 0) {
          return ResponseHandler.badRequest(
            res,
            'product_id et quantity requis pour chaque article'
          );
        }

        // Récupérer le produit
        const product = await Product.findById(product_id);
        if (!product) {
          return ResponseHandler.badRequest(res, `Produit ${product_id} non trouvé`);
        }

        const unitPrice = product.price;
        const itemSubtotal = quantity * unitPrice; // Prix item avant réduction

        // ✅ Calcul réduction item
        let itemDiscountAmount = 0;
        let itemDiscount = { type: null, value: 0, amount: 0, reason: null };

        if (discount && (discount.type === 'percentage' || discount.type === 'fixed')) {
          if (discount.type === 'percentage') {
            itemDiscountAmount = (itemSubtotal * discount.value) / 100;
          } else if (discount.type === 'fixed') {
            itemDiscountAmount = Math.min(discount.value, itemSubtotal);
          }

          itemDiscount = {
            type: discount.type,
            value: discount.value,
            amount: Math.round(itemDiscountAmount * 100) / 100,
            reason: discount.reason || null,
          };
        }

        const itemTotalAfterDiscount = itemSubtotal - itemDiscount.amount;
        totalItemDiscounts += itemDiscount.amount;

        // ✅ Enrichir l'article
        enrichedItems.push({
          product_id,
          product_name: product.name,
          sku: product.sku || '',
          barcode: product.meta_data?.find((m) => m.key === 'barcode')?.value || '',
          quantity,
          unit_price: unitPrice,
          subtotal_price: Math.round(itemSubtotal * 100) / 100,
          discount: itemDiscount,
          discount_amount: itemDiscount.amount,
          total_price: Math.round(itemTotalAfterDiscount * 100) / 100,
          tax_rate: parseFloat(product.tax_rate) || 0,
          tax_amount: 0, // Calculé après
        });

        subtotalBeforeDiscounts += itemSubtotal;
        subtotalAfterItemDiscounts += itemTotalAfterDiscount;
      }

      // 2. ✅ Calcul réduction ticket
      let ticketDiscountData = { type: null, value: 0, amount: 0, reason: null };
      let ticketDiscountAmount = 0;

      if (
        ticket_discount &&
        (ticket_discount.type === 'percentage' || ticket_discount.type === 'fixed')
      ) {
        if (ticket_discount.type === 'percentage') {
          ticketDiscountAmount = (subtotalAfterItemDiscounts * ticket_discount.value) / 100;
        } else if (ticket_discount.type === 'fixed') {
          ticketDiscountAmount = Math.min(ticket_discount.value, subtotalAfterItemDiscounts);
        }

        ticketDiscountData = {
          type: ticket_discount.type,
          value: ticket_discount.value,
          amount: Math.round(ticketDiscountAmount * 100) / 100,
          reason: ticket_discount.reason || null,
        };
      }

      // 3. ✅ Calculs finaux SIMPLES
      const totalDiscounts = totalItemDiscounts + ticketDiscountAmount;
      const finalTotal = subtotalAfterItemDiscounts - ticketDiscountAmount;

      // ✅ TVA calculée sur le montant final (après TOUTES les réductions)
      let finalTaxAmount = 0;
      for (const item of enrichedItems) {
        // Proportion de cet item dans le total final
        const itemRatio = item.total_price / subtotalAfterItemDiscounts;
        const itemFinalPrice = finalTotal * itemRatio;

        // TVA de cet item après réductions
        const taxRate = item.tax_rate;
        const itemTaxAmount = taxRate > 0 ? itemFinalPrice * (taxRate / (100 + taxRate)) : 0;

        // ✅ METTRE À JOUR LA TVA
        item.tax_amount = Math.round(itemTaxAmount * 100) / 100;

        // 🆕 LIGNE MANQUANTE - METTRE À JOUR LE PRIX FINAL
        item.total_price = Math.round(itemFinalPrice * 100) / 100;

        finalTaxAmount += item.tax_amount;
      }

      finalTaxAmount = Math.round(finalTaxAmount * 100) / 100;

      // 4. ✅ Créer la vente
      const saleData = {
        items: enrichedItems,
        subtotal: Math.round(subtotalBeforeDiscounts * 100) / 100, // ✅ Prix AVANT réductions

        // Données réductions
        item_discounts_total: Math.round(totalItemDiscounts * 100) / 100,
        ticket_discount: ticketDiscountData,
        total_discounts: Math.round(totalDiscounts * 100) / 100,

        tax_amount: finalTaxAmount, // ✅ TVA sur montant final
        total_amount: Math.round(finalTotal * 100) / 100, // ✅ Total après réductions
        payment_method,
        cashier_id: cashier.id,
        cashier_name: cashier.username,
        status: 'completed',
      };

      const newSale = await Sale.create(saleData);

      // ✅ GESTION DU FOND DE CAISSE - CORRIGÉ
      if (payment_method === 'cash' || payment_method === 'mixed') {
        try {
          const cashierSessionService = require('../services/cashierSessionService');

          let cashAmount = saleData.total_amount;
          let changeAmount = 0;

          if (req.body.cash_payment_data) {
            const { amount_received, change } = req.body.cash_payment_data;
            cashAmount = amount_received;
            changeAmount = change;

            console.log(
              `💰 [SALE] Vente cash: ${saleData.total_amount}€ - Reçu: ${amount_received}€ - Monnaie: ${change}€`
            );
          }

          // ✅ NOUVEAU : Calculer le montant net cash (entrée - sortie)
          const netCashAmount = cashAmount - changeAmount;

          if (netCashAmount !== 0) {
            // ✅ Ajouter UN SEUL mouvement net
            await cashierSessionService.addCashMovement(cashier.id, {
              type: 'in',
              amount: netCashAmount,
              reason: `Vente ${newSale.transaction_id}`,
              notes:
                changeAmount > 0
                  ? `Vente: ${saleData.total_amount}€ - Reçu: ${cashAmount}€ - Monnaie: ${changeAmount}€`
                  : `Paiement client - Total vente: ${saleData.total_amount}€`,
            });

            console.log(
              `✅ [SALE] Fond de caisse: ${netCashAmount > 0 ? '+' : ''}${netCashAmount}€`
            );
          }
        } catch (drawerError) {
          console.warn('⚠️ [SALE] Erreur mise à jour fond de caisse:', drawerError.message);
        }
      }

      // Paiements mixtes
      if (payment_method === 'mixed' && req.body.mixed_payment_data) {
        try {
          const cashierSessionService = require('../services/cashierSessionService');
          const { cash_amount, card_amount } = req.body.mixed_payment_data;

          if (cash_amount > 0) {
            await cashierSessionService.addCashMovement(cashier.id, {
              type: 'in',
              amount: cash_amount,
              reason: `Vente mixte ${newSale.transaction_id}`,
              notes: `Partie cash - Total: ${saleData.total_amount}€ (Cash: ${cash_amount}€, Carte: ${card_amount}€)`,
            });

            console.log(`✅ [SALE] +${cash_amount}€ cash ajoutés au fond`);
          }
        } catch (drawerError) {
          console.warn('⚠️ [SALE] Erreur mise à jour fond (mixte):', drawerError.message);
        }
      }

      // ✅ METTRE À JOUR STATS SESSION
      try {
        const cashierSessionService = require('../services/cashierSessionService');
        const updatedStats = cashierSessionService.updateSaleStats(
          cashier.id,
          saleData.total_amount
        );

        const sessionEventService = getEntityEventService('cashier_sessions');
        sessionEventService.updated(cashier.id, {
          cashier_id: cashier.id,
          sales_count: updatedStats.sales_count,
          total_sales: updatedStats.total_sales,
          last_sale_at: new Date(),
        });

        console.log(
          `💰 Stats session mises à jour via WebSocket: ${updatedStats.sales_count} ventes, ${updatedStats.total_sales}€`
        );
      } catch (error) {
        console.debug('Erreur mise à jour stats session:', error.message);
      }

      // ✅ DÉCRÉMENTER LES STOCKS ET METTRE À JOUR STATS PRODUITS
      for (const item of enrichedItems) {
        const product = await Product.findById(item.product_id);

        const updateData = {};

        // Décrémenter TOUS les produits sauf type "service"
        if (product.type !== 'service') {
          updateData.stock = (product.stock || 0) - item.quantity;
          console.log(
            `📦 [STOCK] ${product.name}: ${product.stock || 0} → ${updateData.stock} (-${item.quantity})`
          );
        } else {
          console.log(`🚫 [SERVICE] ${product.name}: Stock non décrémenté (service)`);
        }

        // ✅ MISE À JOUR DES STATISTIQUES
        updateData.total_sold = (product.total_sold || 0) + item.quantity;
        updateData.sales_count = (product.sales_count || 0) + 1;
        updateData.last_sold_at = new Date();
        updateData.revenue_total =
          Math.round(((product.revenue_total || 0) + item.total_price) * 100) / 100;
        updateData.updated_at = new Date();

        await Product.update(item.product_id, updateData);

        const updatedProduct = await Product.findById(item.product_id);
        this.productEventService.updated(item.product_id, updatedProduct);

        console.log(
          `📊 Stats produit mises à jour: ${product.name} (${updateData.total_sold} vendus, ${updateData.revenue_total}€ CA)`
        );
      }

      // ✅ RETOUR FINAL
      return ResponseHandler.created(res, {
        sale: newSale,
        message: 'Vente créée avec succès',
        receipt: {
          transaction_id: newSale.transaction_id,
          items: enrichedItems,
          subtotal: saleData.subtotal,

          // Informations réductions
          discounts: {
            items_total: saleData.item_discounts_total,
            ticket: saleData.ticket_discount,
            total: saleData.total_discounts,
          },

          tax_amount: saleData.tax_amount,
          total_amount: saleData.total_amount,
          payment_method: saleData.payment_method,
          cashier: saleData.cashier_name,
          date: newSale.created_at,
          tax_breakdown: this.calculateTaxBreakdown(enrichedItems),

          // Résumé des économies
          savings_summary:
            totalDiscounts > 0
              ? {
                  total_saved: totalDiscounts,
                  original_total: saleData.subtotal,
                  final_total: saleData.total_amount,
                  savings_percentage:
                    Math.round((totalDiscounts / saleData.subtotal) * 100 * 100) / 100,
                }
              : null,
        },
      });
    } catch (error) {
      console.error('Erreur création vente:', error);
      return ResponseHandler.error(res, error);
    }
  }

  // ✅ NOUVELLE MÉTHODE : Calculer la répartition TVA par taux
  calculateTaxBreakdown(items) {
    const breakdown = {};

    items.forEach((item) => {
      const rate = item.tax_rate || 0;
      const rateKey = `${rate}%`;

      if (!breakdown[rateKey]) {
        breakdown[rateKey] = {
          rate: rate,
          total_ht: 0,
          total_ttc: 0,
          tax_amount: 0,
          items_count: 0,
        };
      }

      // ✅ CORRECTION: Utiliser les valeurs APRÈS réductions
      const totalTTC = item.total_price; // Prix après réductions item
      const taxAmount = item.tax_amount; // TVA sur prix réduit
      const totalHT = totalTTC - taxAmount; // Prix HT après réductions

      breakdown[rateKey].total_ht += totalHT;
      breakdown[rateKey].total_ttc += totalTTC;
      breakdown[rateKey].tax_amount += taxAmount;
      breakdown[rateKey].items_count += item.quantity;
    });

    // Arrondir tous les montants
    Object.keys(breakdown).forEach((key) => {
      breakdown[key].total_ht = Math.round(breakdown[key].total_ht * 100) / 100;
      breakdown[key].total_ttc = Math.round(breakdown[key].total_ttc * 100) / 100;
      breakdown[key].tax_amount = Math.round(breakdown[key].tax_amount * 100) / 100;
    });

    return breakdown;
  }

  async getSales(req, res) {
    try {
      const { start_date, end_date, cashier_id, today_only = false } = req.query;

      let sales;

      if (today_only === 'true') {
        sales = await Sale.getTodaysSales();
      } else if (start_date && end_date) {
        sales = await Sale.findByDateRange(start_date, end_date);
      } else if (cashier_id) {
        sales = await Sale.findByCashier(cashier_id);
      } else {
        sales = await Sale.findAll();
      }

      // Trier par date décroissante
      sales.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return ResponseHandler.success(res, {
        sales,
        count: sales.length,
        total_amount: sales.reduce((sum, sale) => sum + sale.total_amount, 0),
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getSaleById(req, res) {
    try {
      const sale = await Sale.findById(req.params.id);
      if (!sale) {
        return ResponseHandler.notFound(res, 'Vente non trouvée');
      }
      return ResponseHandler.success(res, sale);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // Rapport de caisse
  async getCashierReport(req, res) {
    try {
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      const cashierId = req.user.id;

      const startDate = new Date(`${date}T00:00:00.000Z`);
      const endDate = new Date(`${date}T23:59:59.999Z`);

      const sales = await Sale.find({
        cashier_id: cashierId,
        created_at: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const report = {
        date,
        cashier: req.user.username,
        total_sales: sales.length,
        total_amount: sales.reduce((sum, sale) => sum + sale.total_amount, 0),
        payment_methods: {
          cash: sales
            .filter((s) => s.payment_method === 'cash')
            .reduce((sum, s) => sum + s.total_amount, 0),
          card: sales
            .filter((s) => s.payment_method === 'card')
            .reduce((sum, s) => sum + s.total_amount, 0),
          mixed: sales
            .filter((s) => s.payment_method === 'mixed')
            .reduce((sum, s) => sum + s.total_amount, 0),
        },
        sales,
      };

      return ResponseHandler.success(res, report);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

module.exports = new SaleController();
