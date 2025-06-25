// ===== controllers/product/productStockController.js =====
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

      console.log(`Stock ajusté pour ${updated.name}: ${existing.stock} → ${stock} (${reason})`);

      return ResponseHandler.success(res, {
        product: updated,
        message: `Stock mis à jour: ${existing.stock} → ${stock}`,
        previous_stock: existing.stock,
        new_stock: stock,
        reason,
      });
    } catch (error) {
      console.error('Erreur mise à jour stock:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async getStockStatistics(req, res) {
    try {
      const allProducts = await this.model.findAll();
      const simpleProducts = allProducts.filter((p) => p.type === 'simple');
      const productsInStock = simpleProducts.filter((p) => (p.stock || 0) > 0);

      const statistics =
        productsInStock.length === 0
          ? this.getEmptyStatistics(allProducts, simpleProducts)
          : this.calculateStockStatistics(productsInStock, allProducts, simpleProducts);

      return ResponseHandler.success(res, statistics);
    } catch (error) {
      console.error('Erreur calcul statistiques stock:', error);
      return ResponseHandler.error(res, error);
    }
  }

  getEmptyStatistics(allProducts, simpleProducts) {
    return {
      summary: {
        total_products: allProducts.length,
        simple_products: simpleProducts.length,
        products_in_stock: 0,
        excluded_products: simpleProducts.length,
      },
      financial: {
        inventory_value: 0,
        retail_value: 0,
        potential_margin: 0,
        tax_amount: 0,
        tax_breakdown: {},
      },
    };
  }

  calculateStockStatistics(productsInStock, allProducts, simpleProducts) {
    let inventoryValue = 0;
    let retailValue = 0;
    let totalTaxAmount = 0;
    const taxBreakdown = {};

    // Calcul des valeurs
    productsInStock.forEach((product) => {
      const { stock = 0, purchase_price = 0, price = 0, tax_rate = 0 } = product;

      const productInventoryValue = stock * purchase_price;
      const productRetailValue = stock * price;

      inventoryValue += productInventoryValue;
      retailValue += productRetailValue;

      // Gestion de la répartition par taux de taxe
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

    // Calculs dérivés
    const potentialMargin = retailValue - inventoryValue;
    const marginPercentage = inventoryValue > 0 ? (potentialMargin / inventoryValue) * 100 : 0;

    // Formatage des détails de taxe
    const taxDetails = Object.fromEntries(
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
    );

    return {
      summary: {
        total_products: allProducts.length,
        simple_products: simpleProducts.length,
        products_in_stock: productsInStock.length,
        excluded_products: simpleProducts.length - productsInStock.length,
      },
      financial: {
        inventory_value: Math.round(inventoryValue * 100) / 100,
        retail_value: Math.round(retailValue * 100) / 100,
        potential_margin: Math.round(potentialMargin * 100) / 100,
        margin_percentage: Math.round(marginPercentage * 100) / 100,
        tax_amount: Math.round(totalTaxAmount * 100) / 100,
        tax_breakdown: taxDetails,
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

  sortProducts(products, sortBy, sortOrder) {
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

  async exportStockStatisticsToPDF(req, res) {
    try {
      console.log('🔄 Début export PDF avec html-pdf...');

      // Vérification de html-pdf
      const pdf = this.requireHtmlPdf();

      // Extraction et validation des paramètres
      const params = this.extractPDFParams(req.body);
      console.log(`📋 Type de rapport: ${params.reportType}`);

      // Récupération et validation des données
      const { productsInStock, stockStats } = await this.getProductsForPDF();

      // Génération du contenu HTML
      const htmlContent = await this.generateHTMLContent(params, stockStats, productsInStock);

      // 🔥 CORRECTION : Passer params à generatePDFBuffer
      const pdfBuffer = await this.generatePDFBuffer(htmlContent, params.reportType, params);

      // Envoi de la réponse
      this.sendPDFResponse(res, pdfBuffer, params.reportType, params);
    } catch (error) {
      console.error('❌ Erreur export PDF:', error);
      return ResponseHandler.error(res, {
        message: 'Erreur lors de la génération du PDF',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  requireHtmlPdf() {
    try {
      const pdf = require('html-pdf');
      console.log('✅ html-pdf chargé');
      return pdf;
    } catch (error) {
      console.error('❌ html-pdf non disponible:', error.message);
      throw new Error('html-pdf non installé. Exécutez: npm install html-pdf');
    }
  }

  extractPDFParams(body) {
    // 🔥 AJOUT de isSimplified
    const params = {
      companyInfo: body.companyInfo || {},
      reportType: body.reportType || 'summary',
      includeCompanyInfo: body.includeCompanyInfo !== false,
      includeCharts: body.includeCharts !== false,
      sortBy: body.sortBy || 'name',
      sortOrder: body.sortOrder || 'asc',
      groupByCategory: body.groupByCategory || false,
      selectedCategories: body.selectedCategories || [],
      includeUncategorized: body.includeUncategorized !== false,
      isSimplified: body.isSimplified || false, // 🔥 NOUVELLE OPTION
    };

    // 🔥 DEBUG LOG
    console.log('📋 === OPTIONS REÇUES PAR LE CONTRÔLEUR ===');
    console.log('  reportType:', params.reportType);
    console.log('  groupByCategory:', params.groupByCategory);
    console.log('  🔥 isSimplified:', params.isSimplified);
    console.log('  selectedCategories:', params.selectedCategories.length, 'catégories');
    console.log('=============================================');

    return params;
  }

  async getProductsForPDF() {
    const allProducts = await this.model.findAll();
    const simpleProducts = allProducts.filter((p) => p.type === 'simple');
    const productsInStock = simpleProducts.filter((p) => (p.stock || 0) > 0);

    if (productsInStock.length === 0) {
      throw new Error('Aucun produit en stock à exporter');
    }

    const stockStats = this.calculateStockStatistics(productsInStock, allProducts, simpleProducts);
    console.log(`📊 ${productsInStock.length} produits en stock trouvés`);

    return { productsInStock, stockStats };
  }

  async generateHTMLContent(params, stockStats, productsInStock) {
    const templateOptions = {
      companyInfo: params.companyInfo,
      includeCompanyInfo: params.includeCompanyInfo,
      includeCharts: params.includeCharts,
      groupByCategory: params.groupByCategory,
      selectedCategories: params.selectedCategories,
      includeUncategorized: params.includeUncategorized,
      isSimplified: params.isSimplified, // 🔥 AJOUT
    };

    if (params.reportType === 'detailed') {
      const sortedProducts = this.sortProducts(productsInStock, params.sortBy, params.sortOrder);
      const htmlContent = await this.detailedTemplate.generateDetailedStockReportHTML(
        stockStats,
        sortedProducts,
        templateOptions
      );
      console.log('📄 HTML détaillé généré');
      return htmlContent;
    } else {
      if (!this.stockTemplate?.generateStockReportHTML) {
        throw new Error('Template de rapport de synthèse non disponible');
      }

      const htmlContent =
        this.stockTemplate.generateStockReportHTML.length === 3
          ? this.stockTemplate.generateStockReportHTML(stockStats, templateOptions)
          : this.stockTemplate.generateStockReportHTML(stockStats, params.companyInfo);

      console.log('📄 HTML synthèse généré');
      return htmlContent;
    }
  }
  async generatePDFBuffer(htmlContent, reportType, params = {}) {
    const pdf = require('html-pdf');

    // 🔥 Orientation adaptative selon isSimplified
    let orientation = 'portrait';
    if (reportType === 'detailed') {
      // Portrait si simplifié, sinon paysage
      orientation = params.isSimplified ? 'portrait' : 'landscape';
    }

    const options = {
      format: 'A4',
      orientation: orientation, // 🔥 DYNAMIQUE
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

    console.log(`📋 Génération PDF:`);
    console.log(`   - Type: ${reportType}`);
    console.log(`   - Orientation: ${orientation}`);
    console.log(`   - 🔥 isSimplified: ${params.isSimplified || false}`);
    console.log(`   - groupByCategory: ${params.groupByCategory || false}`);

    return new Promise((resolve, reject) => {
      pdf.create(htmlContent, options).toBuffer((err, buffer) => {
        if (err) {
          console.error('❌ Erreur génération PDF:', err);
          reject(err);
        } else {
          console.log('✅ PDF généré avec succès');
          resolve(buffer);
        }
      });
    });
  }

  sendPDFResponse(res, pdfBuffer, reportType, params = {}) {
    // 🔥 Nom de fichier adaptatif avec isSimplified
    let filename = `rapport_stock_${reportType}`;

    if (params.isSimplified) {
      filename += '_simplifie';
    }

    if (params.groupByCategory) {
      filename += '_categories';
    }

    filename += `_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    console.log(`📁 Taille du PDF: ${pdfBuffer.length} bytes`);
    console.log(`📄 Nom du fichier: ${filename}`);
    res.send(pdfBuffer);
    console.log('✅ PDF envoyé avec succès');
  }
}

const productStockController = new ProductStockController();

module.exports = exportController(productStockController, [
  'updateStock',
  'getStockStatistics',
  'exportStockStatisticsToPDF',
]);
