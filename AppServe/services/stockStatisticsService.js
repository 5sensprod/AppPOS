// Nouveau fichier: services/stockStatisticsService.js

const Product = require('../models/Product');
const apiEventEmitter = require('./apiEventEmitter');
const Category = require('../models/Category');

class StockStatisticsService {
  /**
   * Recalcule et émet les nouvelles statistiques
   */
  async recalculateAndEmit() {
    try {
      console.log('[STOCK-STATS] Recalcul des statistiques en cours...');

      // Récupérer toutes les statistiques mises à jour
      const stats = await this.calculateStockStatistics();

      // 🚀 NOUVEAU : Calculer aussi les données de chart
      const chartData = await this.calculateCategoryChartData();

      // Émettre l'événement existant
      apiEventEmitter.stockStatisticsChanged(stats);

      // 🚀 NOUVEAU : Émettre l'événement chart
      apiEventEmitter.categoryChartUpdated(chartData);

      console.log('[STOCK-STATS] Statistiques recalculées et événement émis');
      return stats;
    } catch (error) {
      console.error('[STOCK-STATS] Erreur lors du recalcul:', error);
      throw error;
    }
  }

  /**
   * 🚀 NOUVELLE MÉTHODE : Calculer les données de chart de catégories
   */
  async calculateCategoryChartData() {
    const allCategories = await Category.findAll();
    const products = await Product.findAll();

    const rootCategories = {};
    let totalValue = 0;
    let totalProducts = 0;
    let totalMargin = 0;

    // Map des catégories pour navigation rapide
    const categoryMap = {};
    allCategories.forEach((cat) => {
      categoryMap[cat._id] = cat;
    });

    // Fonction pour trouver la catégorie racine
    const findRootCategory = (categoryId) => {
      if (!categoryId || !categoryMap[categoryId]) return null;
      let current = categoryMap[categoryId];
      while (current.parent_id && categoryMap[current.parent_id]) {
        current = categoryMap[current.parent_id];
      }
      return current;
    };

    // Traiter chaque produit
    products.forEach((product) => {
      const stock = product.stock || 0;
      if (stock <= 0 || product.type !== 'simple') return;

      const purchasePrice = product.purchase_price || 0;
      const salePrice = product.price || 0;
      const productValue = stock * purchasePrice;
      const productMargin = stock * (salePrice - purchasePrice);
      const productCategories = product.categories || [];

      if (productCategories.length > 0) {
        const primaryCategoryId = productCategories[0];
        const rootCategory = findRootCategory(primaryCategoryId);

        if (rootCategory) {
          const rootName = rootCategory.name || 'Sans nom';
          if (!rootCategories[rootName]) {
            rootCategories[rootName] = {
              id: rootCategory._id,
              name: rootName,
              value: 0,
              products: 0,
              margin: 0,
            };
          }
          rootCategories[rootName].value += productValue;
          rootCategories[rootName].products += 1;
          rootCategories[rootName].margin += productMargin;
        }
      } else {
        const rootName = 'Sans catégorie';
        if (!rootCategories[rootName]) {
          rootCategories[rootName] = {
            id: null,
            name: rootName,
            value: 0,
            products: 0,
            margin: 0,
          };
        }
        rootCategories[rootName].value += productValue;
        rootCategories[rootName].products += 1;
        rootCategories[rootName].margin += productMargin;
      }

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

  /**
   * Calcule les statistiques de stock
   * (Copie de votre logique existante du controller)
   */
  async calculateStockStatistics() {
    const products = await Product.findAll();
    // Filtrer uniquement les produits physiques (type: 'simple')
    const simpleProducts = products.filter(
      (product) => product.type === 'simple' || (!product.type && product.sku && product.name)
    );
    // Produits avec stock > 0
    const productsInStock = simpleProducts.filter(
      (product) => product.stock > 0 && product.purchase_price > 0 && product.price > 0
    );
    // Calculs financiers
    let inventoryValue = 0;
    let retailValue = 0;
    let taxAmount = 0;
    const taxBreakdown = {};
    productsInStock.forEach((product) => {
      const stock = product.stock || 0;
      const purchasePrice = product.purchase_price || 0;
      const salePrice = product.price || 0;
      const taxRate = product.tax_rate || 20;
      // Valeurs
      inventoryValue += stock * purchasePrice;
      retailValue += stock * salePrice;
      // TVA
      const productTaxAmount = (stock * salePrice * taxRate) / (100 + taxRate);
      taxAmount += productTaxAmount;
      // Répartition par taux
      const rateKey = `rate_${taxRate}`;
      if (!taxBreakdown[rateKey]) {
        taxBreakdown[rateKey] = {
          rate: taxRate,
          product_count: 0,
          inventory_value: 0,
          retail_value: 0,
          tax_amount: 0,
        };
      }
      taxBreakdown[rateKey].product_count++;
      taxBreakdown[rateKey].inventory_value += stock * purchasePrice;
      taxBreakdown[rateKey].retail_value += stock * salePrice;
      taxBreakdown[rateKey].tax_amount += productTaxAmount;
    });
    const potentialMargin = retailValue - inventoryValue;
    const marginPercentage = inventoryValue > 0 ? (potentialMargin / inventoryValue) * 100 : 0;
    return {
      summary: {
        total_products: products.length,
        simple_products: simpleProducts.length,
        products_in_stock: productsInStock.length,
        excluded_products: simpleProducts.length - productsInStock.length,
      },
      financial: {
        inventory_value: Math.round(inventoryValue * 100) / 100,
        retail_value: Math.round(retailValue * 100) / 100,
        potential_margin: Math.round(potentialMargin * 100) / 100,
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
            ? Math.round((retailValue / productsInStock.length) * 100) / 100
            : 0,
      },
    };
  }
}

const stockStatisticsService = new StockStatisticsService();
module.exports = stockStatisticsService;
