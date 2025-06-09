// controllers/saleController.js
const BaseController = require('./base/BaseController');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const ResponseHandler = require('../handlers/ResponseHandler');

class SaleController extends BaseController {
  constructor() {
    super(Sale);
  }

  async createSale(req, res) {
    try {
      const { items, payment_method = 'cash' } = req.body;
      const cashier = req.user; // Depuis le middleware auth

      // Validation
      if (!items || !Array.isArray(items) || items.length === 0) {
        return ResponseHandler.badRequest(res, 'Articles requis pour créer une vente');
      }

      // 1. Valider et enrichir les articles
      const enrichedItems = [];
      let subtotal = 0;

      for (const item of items) {
        const { product_id, quantity } = item;

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

        // Vérifier le stock si géré
        if (product.manage_stock && product.stock < quantity) {
          return ResponseHandler.badRequest(
            res,
            `Stock insuffisant pour ${product.name}. Disponible: ${product.stock}, Demandé: ${quantity}`
          );
        }

        // Enrichir l'article
        const unitPrice = product.price;
        const totalPrice = quantity * unitPrice;

        enrichedItems.push({
          product_id,
          product_name: product.name,
          sku: product.sku || '',
          barcode: product.meta_data?.find((m) => m.key === 'barcode')?.value || '',
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
        });

        subtotal += totalPrice;
      }

      // 2. Calculer les taxes (20% par défaut si pas spécifié)
      const taxRate = 0.2; // À adapter selon votre logique
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      // 3. Créer la vente
      const saleData = {
        items: enrichedItems,
        subtotal: Math.round(subtotal * 100) / 100,
        tax_amount: Math.round(taxAmount * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
        payment_method,
        cashier_id: cashier.id,
        cashier_name: cashier.username,
        status: 'completed',
      };

      const newSale = await Sale.create(saleData);

      // 4. Décrémenter les stocks
      for (const item of enrichedItems) {
        const product = await Product.findById(item.product_id);

        const updateData = {};

        // 🔍 CETTE PARTIE DOIT ÊTRE PRÉSENTE :
        if (product.manage_stock) {
          updateData.stock = Math.max(0, product.stock - item.quantity);
        }

        // Mise à jour des statistiques
        updateData.total_sold = (product.total_sold || 0) + item.quantity;
        updateData.sales_count = (product.sales_count || 0) + 1;
        updateData.last_sold_at = new Date();
        updateData.revenue_total =
          Math.round(((product.revenue_total || 0) + item.total_price) * 100) / 100;
        updateData.updated_at = new Date();

        await Product.update(item.product_id, updateData);
      }
      return ResponseHandler.created(res, {
        sale: newSale,
        message: 'Vente créée avec succès',
        receipt: {
          transaction_id: newSale.transaction_id,
          items: enrichedItems,
          subtotal: saleData.subtotal,
          tax_amount: saleData.tax_amount,
          total_amount: saleData.total_amount,
          payment_method: saleData.payment_method,
          cashier: saleData.cashier_name,
          date: newSale.created_at,
        },
      });
    } catch (error) {
      console.error('Erreur création vente:', error);
      return ResponseHandler.error(res, error);
    }
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
