// ===== controllers/product/productStockController.js =====
const BaseController = require('../base/BaseController');
const Product = require('../../models/Product');
const productWooCommerceService = require('../../services/ProductWooCommerceService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const exportController = require('../../utils/exportController');
const StockReportTemplate = require('../../templates/pdf/stockReportTemplate');
const DetailedStockReportTemplate = require('../../templates/pdf/detailedStockReportTemplate');
const TemplateHelpers = require('../../templates/pdf/helpers/templateHelpers');

class ProductStockController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      image: { type: 'gallery' },
      deleteFromWoo: (id) => productWooCommerceService.deleteProduct(id),
    });

    // Initialiser les templates
    this.stockTemplate = new StockReportTemplate();
    this.detailedTemplate = new DetailedStockReportTemplate();
    this.helpers = new TemplateHelpers();
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

      await this.model.update(id, {
        stock: parseInt(stock),
        updated_at: new Date(),
      });

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

      if (productsInStock.length === 0) {
        return ResponseHandler.success(res, {
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
        });
      }

      const statistics = this.calculateStockStatistics(
        productsInStock,
        allProducts,
        simpleProducts
      );

      return ResponseHandler.success(res, statistics);
    } catch (error) {
      console.error('Erreur calcul statistiques stock:', error);
      return ResponseHandler.error(res, error);
    }
  }

  calculateStockStatistics(productsInStock, allProducts, simpleProducts) {
    let inventoryValue = 0;
    let retailValue = 0;
    let totalTaxAmount = 0;
    const taxBreakdown = {};

    for (const product of productsInStock) {
      const stock = product.stock || 0;
      const purchasePrice = product.purchase_price || 0;
      const price = product.price || 0;
      const taxRate = product.tax_rate || 0;

      const productInventoryValue = stock * purchasePrice;
      const productRetailValue = stock * price;

      inventoryValue += productInventoryValue;
      retailValue += productRetailValue;

      if (!taxBreakdown[taxRate]) {
        taxBreakdown[taxRate] = {
          rate: taxRate,
          product_count: 0,
          inventory_value: 0,
          retail_value: 0,
          tax_amount: 0,
        };
      }

      taxBreakdown[taxRate].product_count++;
      taxBreakdown[taxRate].inventory_value += productInventoryValue;
      taxBreakdown[taxRate].retail_value += productRetailValue;

      const productTaxAmount = taxRate > 0 ? (productRetailValue * taxRate) / (100 + taxRate) : 0;

      taxBreakdown[taxRate].tax_amount += productTaxAmount;
      totalTaxAmount += productTaxAmount;
    }

    const potentialMargin = retailValue - inventoryValue;
    const marginPercentage = inventoryValue > 0 ? (potentialMargin / inventoryValue) * 100 : 0;

    const taxDetails = {};
    Object.keys(taxBreakdown).forEach((rate) => {
      const data = taxBreakdown[rate];
      taxDetails[`rate_${rate}`] = {
        rate: parseFloat(rate),
        product_count: data.product_count,
        inventory_value: Math.round(data.inventory_value * 100) / 100,
        retail_value: Math.round(data.retail_value * 100) / 100,
        tax_amount: Math.round(data.tax_amount * 100) / 100,
      };
    });

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

  /**
   * Trie les produits selon les options
   */
  sortProducts(products, sortBy, sortOrder) {
    return [...products].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'sku':
          aValue = (a.sku || '').toLowerCase();
          bValue = (b.sku || '').toLowerCase();
          break;
        case 'stock':
          aValue = a.stock || 0;
          bValue = b.stock || 0;
          break;
        case 'value':
          aValue = (a.stock || 0) * (a.purchase_price || 0);
          bValue = (b.stock || 0) * (b.purchase_price || 0);
          break;
        case 'name':
        default:
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });
  }

  async exportStockStatisticsToPDF(req, res) {
    try {
      console.log('🔄 Début export PDF avec html-pdf...');

      // Vérifier que html-pdf est disponible
      let pdf;
      try {
        pdf = require('html-pdf');
        console.log('✅ html-pdf chargé (PhantomJS - sans Chrome)');
      } catch (error) {
        console.error('❌ html-pdf non disponible:', error.message);
        throw new Error('html-pdf non installé. Exécutez: npm install html-pdf');
      }

      // 🔍 Debug: Vérifier ce qui est reçu
      console.log('📥 Body reçu complet:', JSON.stringify(req.body, null, 2));

      // ✅ Extraire les variables du req.body
      const {
        companyInfo = {},
        reportType = 'summary',
        includeCompanyInfo = true,
        includeCharts = true,
        sortBy = 'name',
        sortOrder = 'asc',
        groupByCategory = false,
        selectedCategories = [],
        includeUncategorized = true,
      } = req.body;

      console.log(`📋 Type de rapport: ${reportType}`);
      console.log(`🏷️ Groupement par catégories: ${groupByCategory}`);
      console.log(`📂 Catégories sélectionnées: ${selectedCategories}`);

      // Récupération des données
      const allProducts = await this.model.findAll();
      const simpleProducts = allProducts.filter((p) => p.type === 'simple');
      const productsInStock = simpleProducts.filter((p) => (p.stock || 0) > 0);

      if (productsInStock.length === 0) {
        return ResponseHandler.badRequest(res, 'Aucun produit en stock à exporter');
      }

      console.log(`📊 ${productsInStock.length} produits en stock trouvés`);

      // Calcul des statistiques
      const stockStats = this.calculateStockStatistics(
        productsInStock,
        allProducts,
        simpleProducts
      );
      console.log('✅ Statistiques calculées');

      // Tri des produits pour le rapport détaillé
      let sortedProducts = productsInStock;
      if (reportType === 'detailed') {
        sortedProducts = this.sortProducts(productsInStock, sortBy, sortOrder);
        console.log(`🔄 Produits triés par ${sortBy} (${sortOrder})`);
      }

      // ✅ Créer templateOptions avec toutes les variables
      const templateOptions = {
        companyInfo,
        includeCompanyInfo,
        includeCharts,
        groupByCategory,
        selectedCategories,
        includeUncategorized,
      };

      // ✅ Générer le HTML via vos templates existants
      let htmlContent;
      if (reportType === 'detailed') {
        // 🔥 Utiliser le DetailedStockReportTemplate
        htmlContent = await this.detailedTemplate.generateDetailedStockReportHTML(
          stockStats,
          sortedProducts,
          templateOptions
        );
        console.log('📄 HTML détaillé généré via DetailedStockReportTemplate');
      } else {
        // Pour le rapport de synthèse
        if (
          this.stockTemplate &&
          typeof this.stockTemplate.generateStockReportHTML === 'function'
        ) {
          // Adapter l'appel selon la signature de votre template existant
          if (this.stockTemplate.generateStockReportHTML.length === 3) {
            // Nouvelle signature avec options
            htmlContent = this.stockTemplate.generateStockReportHTML(stockStats, templateOptions);
          } else {
            // Ancienne signature
            htmlContent = this.stockTemplate.generateStockReportHTML(stockStats, companyInfo);
          }
        } else {
          throw new Error('Template de rapport de synthèse non disponible');
        }
        console.log('📄 HTML synthèse généré via template');
      }

      // 🔥 CONFIGURATION HTML-PDF (PhantomJS)
      const options = {
        // Format et orientation
        format: 'A4',
        orientation: reportType === 'detailed' ? 'landscape' : 'portrait',

        // Marges selon le type de rapport
        border:
          reportType === 'detailed'
            ? {
                top: '12mm', // ✅ Optimisé
                right: '8mm',
                bottom: '12mm',
                left: '8mm',
              }
            : {
                top: '15mm',
                right: '12mm',
                bottom: '15mm',
                left: '12mm',
              },

        // Options de rendu
        type: 'pdf',
        quality: '75',
        dpi: 150,

        // Timeout et autres options PhantomJS
        timeout: 30000,

        // En-têtes et pieds de page (optionnels avec html-pdf)
        /*
      header: {
        height: '40mm',
        contents: this.detailedTemplate
          ? this.detailedTemplate.getHeaderTemplate(companyInfo)
          : this.stockTemplate?.getHeaderTemplate?.(companyInfo) || ''
      },
      footer: {
        height: '20mm',
        contents: this.detailedTemplate
          ? this.detailedTemplate.getFooterTemplate()
          : this.stockTemplate?.getFooterTemplate?.() || ''
      },
      */

        // Options PhantomJS spécifiques
        phantomjsOptions: {
          '--web-security': 'no',
          '--load-images': 'yes',
          '--ignore-ssl-errors': 'yes',
        },
      };

      console.log('📋 Génération PDF avec html-pdf (PhantomJS)...');

      // 🔥 GÉNÉRER LE PDF avec html-pdf
      const pdfBuffer = await new Promise((resolve, reject) => {
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

      // Générer un nom de fichier unique
      const filename = `rapport_stock_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;

      // 🔥 ENVOYER DIRECTEMENT LE BUFFER
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      console.log(`📁 Taille du PDF: ${pdfBuffer.length} bytes`);

      res.send(pdfBuffer);
      console.log('✅ PDF envoyé avec succès');
    } catch (error) {
      console.error('❌ Erreur export PDF:', error);
      console.error('❌ Stack trace:', error.stack);

      return ResponseHandler.error(res, {
        message: 'Erreur lors de la génération du PDF',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
}

const productStockController = new ProductStockController();

module.exports = exportController(productStockController, [
  'updateStock',
  'getStockStatistics',
  'exportStockStatisticsToPDF',
]);
