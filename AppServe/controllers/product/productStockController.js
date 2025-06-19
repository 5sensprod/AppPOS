// ===== controllers/product/productStockController.js =====
const BaseController = require('../base/BaseController');
const Product = require('../../models/Product');
const productWooCommerceService = require('../../services/ProductWooCommerceService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const exportController = require('../../utils/exportController');
const StockReportTemplate = require('../../templates/pdf/stockReportTemplate');
const TemplateHelpers = require('../../templates/pdf/helpers/templateHelpers');

class ProductStockController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      image: { type: 'gallery' },
      deleteFromWoo: (id) => productWooCommerceService.deleteProduct(id),
    });

    // Initialiser le template
    this.stockTemplate = new StockReportTemplate();
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

  // 🆕 Méthode pour trier les produits selon les options
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
    let browser = null;
    let tempFilePath = null;

    try {
      console.log('🔄 Début export PDF...');

      // 🆕 Récupération des nouvelles options
      const {
        companyInfo = {},
        reportType = 'summary',
        includeCompanyInfo = true,
        includeCharts = true,
        sortBy = 'name',
        sortOrder = 'asc',
      } = req.body;

      console.log(`📋 Type de rapport: ${reportType}`);

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

      // 🆕 Tri des produits pour le rapport détaillé
      let sortedProducts = productsInStock;
      if (reportType === 'detailed') {
        sortedProducts = this.sortProducts(productsInStock, sortBy, sortOrder);
        console.log(`🔄 Produits triés par ${sortBy} (${sortOrder})`);
      }

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

      // 🆕 Génération du HTML selon le type de rapport
      let htmlContent;
      const templateOptions = {
        companyInfo,
        includeCompanyInfo,
        includeCharts,
      };

      if (reportType === 'detailed') {
        // Vérifier si la méthode existe dans le template
        if (typeof this.stockTemplate.generateDetailedStockReportHTML === 'function') {
          htmlContent = this.stockTemplate.generateDetailedStockReportHTML(
            stockStats,
            sortedProducts,
            templateOptions
          );
        } else {
          // Fallback vers la méthode inline si le template n'a pas encore la méthode
          htmlContent = this.generateDetailedReportHTML(
            stockStats,
            sortedProducts,
            templateOptions
          );
        }
        console.log('📄 HTML détaillé généré');
      } else {
        htmlContent = this.stockTemplate.generateStockReportHTML(stockStats, templateOptions);
        console.log('📄 HTML synthèse généré via template');
      }

      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });
      console.log('📱 Page chargée');

      // Génération du fichier
      const path = require('path');
      const os = require('os');
      const filename = `rapport_stock_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      tempFilePath = path.join(os.tmpdir(), filename);

      console.log('📋 Génération PDF...');

      // 🆕 Configuration PDF adaptée au type de rapport
      const pdfOptions = {
        path: tempFilePath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: this.stockTemplate
          ? this.stockTemplate.getHeaderTemplate(companyInfo)
          : '<div></div>',
        footerTemplate: this.stockTemplate ? this.stockTemplate.getFooterTemplate() : '<div></div>',
        preferCSSPageSize: true,
        timeout: 30000,
      };

      // Configuration selon le type de rapport
      if (reportType === 'detailed') {
        pdfOptions.landscape = true;
        pdfOptions.margin = {
          top: '35mm', // Plus d'espace pour éviter le chevauchement avec le header
          right: '10mm',
          bottom: '25mm',
          left: '10mm',
        };
      } else {
        // Rapport de synthèse (portrait)
        pdfOptions.margin = {
          top: '30mm',
          right: '15mm',
          bottom: '25mm',
          left: '15mm',
        };
      }

      await page.pdf(pdfOptions);

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

  // 🆕 Méthode fallback pour le rapport détaillé (au cas où le template n'a pas encore la méthode)
  generateDetailedReportHTML(stockStats, productsInStock, options = {}) {
    const { companyInfo = {}, includeCompanyInfo = true } = options;

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Rapport de Stock Détaillé</title>
        <style>
            ${this.helpers.getAllStyles()}
            
            /* Styles spécifiques au rapport détaillé */
            body { 
                padding: 0;
                margin: 0;
                padding-top: 20mm;    /* 🆕 Espace pour éviter le chevauchement */
                padding-left: 8mm;
                padding-right: 8mm;
                padding-bottom: 10mm;
            }
            
            .company-info { 
                background: #f9fafb; 
                border-left: 4px solid #3b82f6; 
                padding: 8mm; 
                margin-bottom: 8mm; 
                page-break-inside: avoid;
            }
            
            .company-name { 
                font-size: 14pt; 
                font-weight: 600; 
                margin-bottom: 3mm; 
            }
            
            .products-table { 
                width: 100%; 
                border-collapse: collapse; 
                font-size: 8pt; 
                margin-top: 10mm;    /* 🆕 Moins d'espace ici car body a déjà du padding-top */
                margin-bottom: 10mm;
            }
            
            .products-table th { 
                background: #374151; 
                color: white; 
                padding: 3mm 2mm; 
                text-align: center; 
                font-weight: 600; 
                font-size: 7pt; 
                border: 1px solid #4b5563; 
            }
            
            .products-table th:first-child, 
            .products-table th:nth-child(2) { 
                text-align: left; 
            }
            
            .products-table td { 
                border: 1px solid #d1d5db; 
                padding: 2mm; 
                text-align: right; 
            }
            
            .products-table td:first-child, 
            .products-table td:nth-child(2) { 
                text-align: left; 
            }
            
            .products-table tbody tr:nth-child(even) { 
                background: #f9fafb; 
            }
            
            .totals-row { 
                background: #e5e7eb !important; 
                font-weight: bold; 
                border-top: 2px solid #374151 !important; 
            }
            
            @page { 
                size: A4 landscape; 
                margin: 15mm 10mm;  /* 🆕 Marges réduites pour plus d'espace */
            }
        </style>
    </head>
    <body>
        <header class="header">
            <h1>Rapport de Stock Détaillé</h1>
            <div class="subtitle">
                Généré le ${this.helpers.formatDate()} à ${this.helpers.formatTime()}
            </div>
        </header>

        ${
          includeCompanyInfo && companyInfo.name
            ? `
        <section class="company-info">
            <div class="company-name">${this.helpers.escapeHtml(companyInfo.name)}</div>
            <div>${this.helpers.escapeHtml(companyInfo.address || '')}</div>
            ${companyInfo.siret ? `<div>SIRET : ${this.helpers.escapeHtml(companyInfo.siret)}</div>` : ''}
        </section>
        `
            : ''
        }

        <table class="products-table">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Désignation</th>
                    <th>PA HT</th>
                    <th>PV TTC</th>
                    <th>Stock</th>
                    <th>TVA %</th>
                    <th>Valeur Stock</th>
                    <th>Montant TVA</th>
                </tr>
            </thead>
            <tbody>
                ${productsInStock
                  .map((product) => {
                    const stock = product.stock || 0;
                    const purchasePrice = this.helpers.roundTo2Decimals(
                      product.purchase_price || 0
                    );
                    const salePrice = this.helpers.roundTo2Decimals(product.price || 0);
                    const taxRate = product.tax_rate || 0;
                    const stockValue = this.helpers.roundTo2Decimals(stock * purchasePrice);
                    const salePriceHT = taxRate > 0 ? salePrice / (1 + taxRate / 100) : salePrice;
                    const taxAmount = this.helpers.roundTo2Decimals(
                      taxRate > 0 ? (stock * salePriceHT * taxRate) / 100 : 0
                    );

                    return `
                    <tr>
                        <td>${this.helpers.escapeHtml(product.sku || '-')}</td>
                        <td>${this.helpers.escapeHtml((product.name || '').substring(0, 50))}${(product.name || '').length > 50 ? '...' : ''}</td>
                        <td>${this.helpers.formatCurrency(purchasePrice)}</td>
                        <td>${this.helpers.formatCurrency(salePrice)}</td>
                        <td>${this.helpers.formatNumber(stock)}</td>
                        <td>${this.helpers.formatPercentage(taxRate)}</td>
                        <td>${this.helpers.formatCurrency(stockValue)}</td>
                        <td>${this.helpers.formatCurrency(taxAmount)}</td>
                    </tr>
                  `;
                  })
                  .join('')}
                
                <tr class="totals-row">
                    <td colspan="4"><strong>TOTAL GÉNÉRAL</strong></td>
                    <td><strong>${this.helpers.formatNumber(productsInStock.reduce((sum, p) => sum + (p.stock || 0), 0))}</strong></td>
                    <td>-</td>
                    <td><strong>${this.helpers.formatCurrency(stockStats.financial.inventory_value)}</strong></td>
                    <td><strong>${this.helpers.formatCurrency(stockStats.financial.tax_amount)}</strong></td>
                </tr>
            </tbody>
        </table>
    </body>
    </html>
    `;
  }
}

const productStockController = new ProductStockController();

module.exports = exportController(productStockController, [
  'updateStock',
  'getStockStatistics',
  'exportStockStatisticsToPDF',
]);
