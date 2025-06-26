// AppServe/controllers/productStockController.js - MODIFICATION HYBRIDE

const BaseController = require('../base/BaseController');
const Product = require('../../models/Product');
const productWooCommerceService = require('../../services/ProductWooCommerceService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const exportController = require('../../utils/exportController');
const StockReportTemplate = require('../../templates/pdf/stockReportTemplate');
const DetailedStockReportTemplate = require('../../templates/pdf/detailedStockReportTemplate');

class ProductStockController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      image: { type: 'gallery' },
      deleteFromWoo: (id) => productWooCommerceService.deleteProduct(id),
    });
    this.stockTemplate = new StockReportTemplate();
    this.detailedTemplate = new DetailedStockReportTemplate();
  }

  async updateStock(req, res) {
    // ... méthode inchangée
    try {
      const { id } = req.params;
      const { stock, reason = 'manual_adjustment' } = req.body;

      if (stock === undefined || stock === null) {
        return ResponseHandler.badRequest(res, 'Nouvelle quantité de stock requise');
      }
      if (stock < 0) {
        return ResponseHandler.badRequest(res, 'Le stock ne peut pas être négatif');
      }

      const existing = await this.getByIdOr404(id, res);
      if (!existing) return;

      await this.model.update(id, { stock: parseInt(stock), updated_at: new Date() });
      const updated = await this.model.findById(id);

      return ResponseHandler.success(res, {
        product: updated,
        message: `Stock mis à jour: ${existing.stock} → ${stock}`,
        previous_stock: existing.stock,
        new_stock: stock,
        reason,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getStockStatistics(req, res) {
    // ... méthode inchangée
    try {
      const allProducts = await this.model.findAll();
      const simpleProducts = allProducts.filter((p) => p.type === 'simple');
      const productsInStock = simpleProducts.filter((p) => (p.stock || 0) > 0);
      const statistics = this.buildStatistics(productsInStock, allProducts, simpleProducts);
      return ResponseHandler.success(res, statistics);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  buildStatistics(productsInStock, allProducts, simpleProducts) {
    // ... méthode inchangée (déjà optimale)
    const stats = {
      summary: {
        total_products: allProducts.length,
        simple_products: simpleProducts.length,
        products_in_stock: productsInStock.length,
        excluded_products: simpleProducts.length - productsInStock.length,
      },
      financial: {
        inventory_value: 0,
        retail_value: 0,
        potential_margin: 0,
        margin_percentage: 0,
        tax_amount: 0,
        tax_breakdown: {},
      },
      performance: {
        avg_inventory_per_product: 0,
        avg_retail_per_product: 0,
      },
    };

    if (productsInStock.length === 0) return stats;

    let inventoryValue = 0;
    let retailValue = 0;
    let totalTaxAmount = 0;
    const taxBreakdown = {};

    productsInStock.forEach((product) => {
      const { stock = 0, purchase_price = 0, price = 0, tax_rate = 0 } = product;
      const productInventoryValue = stock * purchase_price;
      const productRetailValue = stock * price;

      inventoryValue += productInventoryValue;
      retailValue += productRetailValue;

      if (!taxBreakdown[tax_rate]) {
        taxBreakdown[tax_rate] = {
          rate: tax_rate,
          product_count: 0,
          inventory_value: 0,
          retail_value: 0,
          tax_amount: 0,
        };
      }

      const breakdown = taxBreakdown[tax_rate];
      breakdown.product_count++;
      breakdown.inventory_value += productInventoryValue;
      breakdown.retail_value += productRetailValue;

      const productTaxAmount =
        tax_rate > 0 ? (productRetailValue * tax_rate) / (100 + tax_rate) : 0;
      breakdown.tax_amount += productTaxAmount;
      totalTaxAmount += productTaxAmount;
    });

    const potentialMargin = retailValue - inventoryValue;
    const marginPercentage = inventoryValue > 0 ? (potentialMargin / inventoryValue) * 100 : 0;

    stats.financial = {
      inventory_value: Math.round(inventoryValue * 100) / 100,
      retail_value: Math.round(retailValue * 100) / 100,
      potential_margin: Math.round(potentialMargin * 100) / 100,
      margin_percentage: Math.round(marginPercentage * 100) / 100,
      tax_amount: Math.round(totalTaxAmount * 100) / 100,
      tax_breakdown: Object.fromEntries(
        Object.entries(taxBreakdown).map(([rate, data]) => [
          `rate_${rate}`,
          {
            rate: parseFloat(rate),
            product_count: data.product_count,
            inventory_value: Math.round(data.inventory_value * 100) / 100,
            retail_value: Math.round(data.retail_value * 100) / 100,
            tax_amount: Math.round(data.tax_amount * 100) / 100,
          },
        ])
      ),
    };

    stats.performance = {
      avg_inventory_per_product: Math.round((inventoryValue / productsInStock.length) * 100) / 100,
      avg_retail_per_product: Math.round((retailValue / productsInStock.length) * 100) / 100,
    };

    return stats;
  }

  sortProducts(products, sortBy, sortOrder) {
    // ... méthode inchangée
    const getSortValue = (product, key) => {
      switch (key) {
        case 'sku':
          return (product.sku || '').toLowerCase();
        case 'stock':
          return product.stock || 0;
        case 'value':
          return (product.stock || 0) * (product.purchase_price || 0);
        default:
          return (product.name || '').toLowerCase();
      }
    };

    return [...products].sort((a, b) => {
      const aValue = getSortValue(a, sortBy);
      const bValue = getSortValue(b, sortBy);
      const comparison =
        typeof aValue === 'string' ? aValue.localeCompare(bValue) : aValue - bValue;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  // 🚀 MÉTHODE MODIFIÉE : Support données pré-filtrées
  async exportStockStatisticsToPDF(req, res) {
    try {
      const pdf = require('html-pdf');
      const params = this.extractPDFParams(req.body);

      // 🔥 NOUVEAUTÉ : Utiliser données front-end si disponibles
      const { productsInStock, stockStats } = await this.getOptimizedProductsForPDF(req.body);

      const htmlContent = await this.generateHTMLContent(params, stockStats, productsInStock);
      const pdfBuffer = await this.generatePDFBuffer(htmlContent, params.reportType, params, pdf);
      this.sendPDFResponse(res, pdfBuffer, params.reportType, params);
    } catch (error) {
      return ResponseHandler.error(res, {
        message: 'Erreur lors de la génération du PDF',
        details: error.message,
      });
    }
  }

  extractPDFParams(body) {
    // ... méthode inchangée
    return {
      companyInfo: body.companyInfo || {},
      reportType: body.reportType || 'summary',
      includeCompanyInfo: body.includeCompanyInfo !== false,
      includeCharts: body.includeCharts !== false,
      sortBy: body.sortBy || 'name',
      sortOrder: body.sortOrder || 'asc',
      groupByCategory: body.groupByCategory || false,
      selectedCategories: body.selectedCategories || [],
      includeUncategorized: body.includeUncategorized !== false,
      isSimplified: body.isSimplified || false,
    };
  }

  // 🚀 NOUVELLE MÉTHODE : Support hybride optimisé
  async getOptimizedProductsForPDF(body) {
    const { preFilteredData } = body;

    // 🔥 MODE OPTIMISÉ : Utiliser données depuis front-end stores
    if (preFilteredData && preFilteredData.products && preFilteredData.statistics) {
      console.log('🚀 OPTIMISATION: Utilisation données pré-filtrées depuis stores front-end');
      console.log(
        `📊 Produits: ${preFilteredData.products.length}, Source: ${preFilteredData.dataSource}`
      );

      // Validation des données reçues
      if (preFilteredData.products.length === 0) {
        throw new Error('Aucun produit dans les données pré-filtrées');
      }

      return {
        productsInStock: preFilteredData.products,
        stockStats: preFilteredData.statistics,
        dataSource: 'frontend_stores_optimized',
      };
    }

    // 🔄 MODE FALLBACK : Logique originale (compatibilité totale)
    console.log('📊 FALLBACK: Utilisation logique backend classique');
    return this.getProductsForPDF();
  }

  async getProductsForPDF() {
    // ... méthode inchangée (fallback)
    const allProducts = await this.model.findAll();
    const simpleProducts = allProducts.filter((p) => p.type === 'simple');
    const productsInStock = simpleProducts.filter((p) => (p.stock || 0) > 0);

    if (productsInStock.length === 0) {
      throw new Error('Aucun produit en stock à exporter');
    }

    const stockStats = this.buildStatistics(productsInStock, allProducts, simpleProducts);
    return { productsInStock, stockStats };
  }

  async generateHTMLContent(params, stockStats, productsInStock) {
    // ... méthode inchangée
    const templateOptions = {
      companyInfo: params.companyInfo,
      includeCompanyInfo: params.includeCompanyInfo,
      includeCharts: params.includeCharts,
      groupByCategory: params.groupByCategory,
      selectedCategories: params.selectedCategories,
      includeUncategorized: params.includeUncategorized,
      isSimplified: params.isSimplified,
    };

    if (params.reportType === 'detailed') {
      const sortedProducts = this.sortProducts(productsInStock, params.sortBy, params.sortOrder);
      return await this.detailedTemplate.generateDetailedStockReportHTML(
        stockStats,
        sortedProducts,
        templateOptions
      );
    } else {
      return this.stockTemplate.generateStockReportHTML.length === 3
        ? this.stockTemplate.generateStockReportHTML(stockStats, templateOptions)
        : this.stockTemplate.generateStockReportHTML(stockStats, templateOptions.companyInfo);
    }
  }

  async generatePDFBuffer(htmlContent, reportType, params, pdf) {
    // ... méthode inchangée
    const orientation =
      reportType === 'detailed' && !params.isSimplified ? 'landscape' : 'portrait';
    const options = {
      format: 'A4',
      orientation: orientation,
      border:
        orientation === 'landscape'
          ? { top: '12mm', right: '8mm', bottom: '12mm', left: '8mm' }
          : { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
      type: 'pdf',
      quality: '75',
      dpi: 150,
      timeout: 30000,
      phantomjsOptions: {
        '--web-security': 'no',
        '--load-images': 'yes',
        '--ignore-ssl-errors': 'yes',
      },
    };

    return new Promise((resolve, reject) => {
      pdf.create(htmlContent, options).toBuffer((err, buffer) => {
        err ? reject(err) : resolve(buffer);
      });
    });
  }

  sendPDFResponse(res, pdfBuffer, reportType, params) {
    // ... méthode inchangée
    let filename = `rapport_stock_${reportType}`;
    if (params.isSimplified) filename += '_simplifie';
    if (params.groupByCategory) filename += '_categories';
    filename += `_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  }
}

const productStockController = new ProductStockController();

module.exports = exportController(productStockController, [
  'updateStock',
  'getStockStatistics',
  'exportStockStatisticsToPDF',
]);
