// services/stockStatisticsService.js - VERSION CORRIGÉE HT

const Product = require('../models/Product');
const apiEventEmitter = require('./apiEventEmitter');
const Category = require('../models/Category');

class StockStatisticsService {
  async recalculateAndEmit() {
    try {
      console.log('[STOCK-STATS] Recalcul des statistiques en cours...');

      const stats = await this.calculateStockStatistics();
      const chartData = await this.calculateCategoryChartData();

      apiEventEmitter.stockStatisticsChanged(stats);
      apiEventEmitter.categoryChartUpdated(chartData);

      console.log('[STOCK-STATS] Statistiques recalculées et événement émis');
      return stats;
    } catch (error) {
      console.error('[STOCK-STATS] Erreur lors du recalcul:', error);
      throw error;
    }
  }

  async calculateCategoryChartData() {
    const allCategories = await Category.findAll();
    const products = await Product.findAll();

    const rootCategories = {};
    let totalValue = 0;
    let totalProducts = 0;
    let totalMargin = 0;

    const categoryMap = {};
    allCategories.forEach((cat) => {
      categoryMap[cat._id] = cat;
    });

    const findRootCategory = (categoryId) => {
      if (!categoryId || !categoryMap[categoryId]) return null;
      let current = categoryMap[categoryId];
      while (current.parent_id && categoryMap[current.parent_id]) {
        current = categoryMap[current.parent_id];
      }
      return current;
    };

    products.forEach((product) => {
      const stock = product.stock || 0;
      if (stock <= 0 || product.type !== 'simple') return;

      const purchasePrice = product.purchase_price || 0;
      const taxRate = product.tax_rate || 0;
      const priceTTC = product.price || 0;

      // ✅ Prix de vente HT :
      //   - regular_price si renseigné (HT natif)
      //   - sinon recalcul depuis TTC
      const priceHT =
        product.regular_price > 0
          ? product.regular_price
          : taxRate > 0
            ? priceTTC / (1 + taxRate / 100)
            : priceTTC;

      const productValue = stock * purchasePrice; // Achat HT
      const productMargin = stock * (priceHT - purchasePrice); // Marge HT ✅
      const productCategories = product.categories || [];

      const rootName = (() => {
        if (productCategories.length > 0) {
          const rootCategory = findRootCategory(productCategories[0]);
          return rootCategory ? rootCategory.name || 'Sans nom' : 'Sans catégorie';
        }
        return 'Sans catégorie';
      })();

      const rootId =
        productCategories.length > 0 ? findRootCategory(productCategories[0])?._id || null : null;

      if (!rootCategories[rootName]) {
        rootCategories[rootName] = {
          id: rootId,
          name: rootName,
          value: 0,
          products: 0,
          margin: 0,
        };
      }

      rootCategories[rootName].value += productValue;
      rootCategories[rootName].products += 1;
      rootCategories[rootName].margin += productMargin;

      totalValue += productValue;
      totalProducts += 1;
      totalMargin += productMargin;
    });

    return {
      rootCategories: Object.values(rootCategories).sort((a, b) => b.value - a.value),
      totals: { totalValue, totalProducts, totalMargin },
      lastCalculated: new Date(),
    };
  }

  async calculateStockStatistics() {
    const products = await Product.findAll();

    const simpleProducts = products.filter(
      (product) => product.type === 'simple' || (!product.type && product.sku && product.name)
    );

    const productsInStock = simpleProducts.filter(
      (product) => product.stock > 0 && product.purchase_price > 0 && product.price > 0
    );

    let inventoryValue = 0; // Achat HT
    let retailValueHT = 0; // Vente HT
    let retailValueTTC = 0; // Vente TTC (conservé pour info)
    let taxAmount = 0;
    const taxBreakdown = {};

    productsInStock.forEach((product) => {
      const stock = product.stock || 0;
      const purchasePrice = product.purchase_price || 0;
      const priceTTC = product.price || 0;
      const taxRate = product.tax_rate || 0;

      // ✅ Prix de vente HT :
      //   - regular_price si renseigné (HT natif)
      //   - sinon recalcul depuis TTC
      const priceHT =
        product.regular_price > 0
          ? product.regular_price
          : taxRate > 0
            ? priceTTC / (1 + taxRate / 100)
            : priceTTC;

      // ✅ Valeurs HT
      inventoryValue += stock * purchasePrice;
      retailValueHT += stock * priceHT;
      retailValueTTC += stock * priceTTC;

      // ✅ TVA calculée sur base HT
      const productTaxAmount = taxRate > 0 ? (stock * priceHT * taxRate) / 100 : 0;
      taxAmount += productTaxAmount;

      const rateKey = `rate_${taxRate}`;
      if (!taxBreakdown[rateKey]) {
        taxBreakdown[rateKey] = {
          rate: taxRate,
          product_count: 0,
          inventory_value: 0,
          retail_value: 0, // HT
          retail_value_ttc: 0, // TTC
          tax_amount: 0,
        };
      }

      taxBreakdown[rateKey].product_count++;
      taxBreakdown[rateKey].inventory_value += stock * purchasePrice;
      taxBreakdown[rateKey].retail_value += stock * priceHT;
      taxBreakdown[rateKey].retail_value_ttc += stock * priceTTC;
      taxBreakdown[rateKey].tax_amount += productTaxAmount;
    });

    // ✅ Marge en HT
    const potentialMargin = retailValueHT - inventoryValue;
    const marginPercentage = inventoryValue > 0 ? (potentialMargin / inventoryValue) * 100 : 0;

    return {
      summary: {
        total_products: products.length,
        simple_products: simpleProducts.length,
        products_in_stock: productsInStock.length,
        excluded_products: simpleProducts.length - productsInStock.length,
      },
      financial: {
        inventory_value: Math.round(inventoryValue * 100) / 100, // Achat HT
        retail_value: Math.round(retailValueHT * 100) / 100, // Vente HT ✅
        retail_value_ttc: Math.round(retailValueTTC * 100) / 100, // Vente TTC (info)
        potential_margin: Math.round(potentialMargin * 100) / 100, // Marge HT ✅
        margin_percentage: Math.round(marginPercentage * 100) / 100,
        tax_amount: Math.round(taxAmount * 100) / 100,
        tax_breakdown: taxBreakdown,
      },
      performance: {
        avg_inventory_per_product:
          productsInStock.length > 0
            ? Math.round((inventoryValue / productsInStock.length) * 100) / 100
            : 0,
        avg_retail_per_product:
          productsInStock.length > 0
            ? Math.round((retailValueHT / productsInStock.length) * 100) / 100
            : 0,
      },
    };
  }
}

const stockStatisticsService = new StockStatisticsService();
module.exports = stockStatisticsService;
