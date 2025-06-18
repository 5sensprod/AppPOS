// ===== controllers/product/productStatsController.js =====
const BaseController = require('../base/BaseController');
const Product = require('../../models/Product');
const Sale = require('../../models/Sale');
const productWooCommerceService = require('../../services/ProductWooCommerceService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const exportController = require('../../utils/exportController');

class ProductStatsController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      image: { type: 'gallery' },
      deleteFromWoo: (id) => productWooCommerceService.deleteProduct(id),
    });
  }

  async getBestSellers(req, res) {
    try {
      const { limit = 10 } = req.query;

      const products = await this.model.findAll();

      const bestSellers = products
        .filter((p) => (p.total_sold || 0) > 0)
        .sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0))
        .slice(0, parseInt(limit))
        .map((p) => ({
          _id: p._id,
          name: p.name,
          sku: p.sku,
          total_sold: p.total_sold || 0,
          sales_count: p.sales_count || 0,
          revenue_total: p.revenue_total || 0,
          last_sold_at: p.last_sold_at,
        }));

      return ResponseHandler.success(res, {
        best_sellers: bestSellers,
        count: bestSellers.length,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getProductStats(req, res) {
    try {
      const product = await this.getByIdOr404(req.params.id, res);
      if (!product) return;

      const stats = {
        product_id: product._id,
        product_name: product.name,
        sku: product.sku,

        total_sold: product.total_sold || 0,
        sales_count: product.sales_count || 0,
        last_sold_at: product.last_sold_at,
        revenue_total: Math.round((product.revenue_total || 0) * 100) / 100,

        current_stock: product.stock || 0,

        avg_quantity_per_sale:
          product.sales_count > 0
            ? Math.round(((product.total_sold || 0) / product.sales_count) * 100) / 100
            : 0,
        avg_revenue_per_sale:
          product.sales_count > 0
            ? Math.round(((product.revenue_total || 0) / product.sales_count) * 100) / 100
            : 0,
      };

      return ResponseHandler.success(res, stats);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async recalculateProductStats(req, res) {
    try {
      const products = await this.model.findAll();
      const sales = await Sale.findAll();

      let updated = 0;

      for (const product of products) {
        let totalSold = 0;
        let salesCount = 0;
        let revenueTotal = 0;
        let lastSoldAt = null;

        for (const sale of sales) {
          const productItems = sale.items.filter((item) => item.product_id === product._id);

          if (productItems.length > 0) {
            salesCount++;

            for (const item of productItems) {
              totalSold += item.quantity;
              revenueTotal += item.total_price;
            }

            if (!lastSoldAt || new Date(sale.created_at) > new Date(lastSoldAt)) {
              lastSoldAt = sale.created_at;
            }
          }
        }

        await this.model.update(product._id, {
          total_sold: totalSold,
          sales_count: salesCount,
          last_sold_at: lastSoldAt,
          revenue_total: Math.round(revenueTotal * 100) / 100,
        });

        updated++;
      }

      return ResponseHandler.success(res, {
        message: `Statistiques recalculées pour ${updated} produits`,
        products_updated: updated,
        sales_analyzed: sales.length,
      });
    } catch (error) {
      console.error('Erreur recalcul stats:', error);
      return ResponseHandler.error(res, error);
    }
  }
}

const productStatsController = new ProductStatsController();

module.exports = exportController(productStatsController, [
  'getBestSellers',
  'getProductStats',
  'recalculateProductStats',
]);
