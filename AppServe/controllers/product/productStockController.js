// ===== controllers/product/productStockController.js =====
const BaseController = require('../base/BaseController');
const Product = require('../../models/Product');
const productWooCommerceService = require('../../services/ProductWooCommerceService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const exportController = require('../../utils/exportController');
const StockReportTemplate = require('../../templates/pdf/stockReportTemplate');

class ProductStockController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      image: { type: 'gallery' },
      deleteFromWoo: (id) => productWooCommerceService.deleteProduct(id),
    });

    // Initialiser le template
    this.stockTemplate = new StockReportTemplate();
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

    const statistics = {
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

    return statistics;
  }

  async exportStockStatisticsToPDF(req, res) {
    let browser = null;
    let tempFilePath = null;

    try {
      console.log('🔄 Début export PDF...');
      const { companyInfo = {} } = req.body;

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

      // Test de Puppeteer
      let puppeteer;
      try {
        puppeteer = require('puppeteer');
        console.log('✅ Puppeteer chargé');
      } catch (error) {
        console.error('❌ Puppeteer non disponible:', error.message);
        throw new Error('Puppeteer non installé. Exécutez: npm install puppeteer');
      }

      // Configuration Puppeteer
      const browserOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      };

      console.log('🚀 Lancement du navigateur...');
      browser = await puppeteer.launch(browserOptions);
      const page = await browser.newPage();

      await page.setViewport({ width: 1200, height: 800 });

      // 🆕 UTILISATION DU TEMPLATE
      const htmlContent = this.stockTemplate.generateStockReportHTML(stockStats, companyInfo);
      console.log('📄 HTML généré via template');

      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });
      console.log('📱 Page chargée');

      // Génération du fichier
      const path = require('path');
      const os = require('os');
      const filename = `rapport_stock_${new Date().toISOString().split('T')[0]}.pdf`;
      tempFilePath = path.join(os.tmpdir(), filename);

      console.log('📋 Génération PDF...');
      await page.pdf({
        path: tempFilePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        displayHeaderFooter: true,
        // 🆕 UTILISATION DES TEMPLATES D'EN-TÊTE/PIED DE PAGE
        headerTemplate: this.stockTemplate.getHeaderTemplate(companyInfo),
        footerTemplate: this.stockTemplate.getFooterTemplate(),
        preferCSSPageSize: true,
        timeout: 30000,
      });

      console.log('✅ PDF généré:', tempFilePath);

      await browser.close();
      browser = null;

      // Vérification du fichier
      const fs = require('fs');
      if (!fs.existsSync(tempFilePath)) {
        throw new Error("Le fichier PDF n'a pas été créé");
      }

      const stats = fs.statSync(tempFilePath);
      console.log(`📁 Taille du fichier: ${stats.size} bytes`);

      // Envoi du fichier
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', stats.size);

      const fileStream = fs.createReadStream(tempFilePath);

      fileStream.on('error', (error) => {
        console.error('❌ Erreur lecture fichier:', error);
        if (!res.headersSent) {
          return ResponseHandler.error(res, error);
        }
      });

      fileStream.on('end', () => {
        console.log('✅ Fichier envoyé avec succès');
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error('⚠️ Erreur suppression fichier temporaire:', err);
          else console.log('🗑️ Fichier temporaire supprimé');
        });
      });

      fileStream.pipe(res);
    } catch (error) {
      console.error('❌ Erreur export PDF:', error);

      // Nettoyage
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('⚠️ Erreur fermeture navigateur:', closeError);
        }
      }

      if (tempFilePath) {
        const fs = require('fs');
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (cleanupError) {
          console.error('⚠️ Erreur nettoyage:', cleanupError);
        }
      }

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
