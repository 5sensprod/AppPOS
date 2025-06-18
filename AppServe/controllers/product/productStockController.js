// ===== controllers/product/productStockController.js =====
const BaseController = require('../base/BaseController');
const Product = require('../../models/Product');
const productWooCommerceService = require('../../services/ProductWooCommerceService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const exportController = require('../../utils/exportController');

class ProductStockController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      image: { type: 'gallery' },
      deleteFromWoo: (id) => productWooCommerceService.deleteProduct(id),
    });
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

      return ResponseHandler.success(res, statistics);
    } catch (error) {
      console.error('Erreur calcul statistiques stock:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async exportStockStatisticsToPDF(req, res) {
    try {
      const { companyInfo = {} } = req.body;

      const allProducts = await this.model.findAll();
      const simpleProducts = allProducts.filter((p) => p.type === 'simple');
      const productsInStock = simpleProducts.filter((p) => (p.stock || 0) > 0);

      if (productsInStock.length === 0) {
        return ResponseHandler.badRequest(res, 'Aucun produit en stock à exporter');
      }

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

      const stockStats = {
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

      const PDFDocument = require('pdfkit');
      const os = require('os');
      const fs = require('fs');
      const path = require('path');

      const tempDir = os.tmpdir();
      const filename = `rapport_stock_${new Date().toISOString().split('T')[0]}.pdf`;
      const tempFilePath = path.join(tempDir, filename);

      await this.generateStockStatsPDF(tempFilePath, stockStats, companyInfo);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const fileStream = fs.createReadStream(tempFilePath);
      fileStream.pipe(res);

      fileStream.on('end', () => {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error('Erreur suppression fichier temporaire:', err);
        });
      });
    } catch (error) {
      console.error('Erreur export PDF statistiques:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async generateStockStatsPDF(filePath, stockStats, companyInfo) {
    const PDFDocument = require('pdfkit');
    const fs = require('fs');

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Helper functions
    const formatCurrency = (amount) => {
      return `${amount
        .toFixed(2)
        .replace('.', ',')
        .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`;
    };

    const formatNumber = (num) => {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    const formatPercentage = (num) => {
      return `${num.toFixed(1).replace('.', ',')} %`;
    };

    const getTaxRateLabel = (rate) => {
      if (rate === 0) return 'Exonéré (0%)';
      if (rate === 5.5) return 'Réduit (5.5%)';
      if (rate === 20) return 'Normal (20%)';
      return `${rate}%`;
    };

    const checkPageBreak = (neededHeight = 100) => {
      if (doc.y + neededHeight > doc.page.height - 80) {
        doc.addPage();
        return true;
      }
      return false;
    };

    const drawHorizontalLine = (y = null) => {
      const currentY = y || doc.y;
      doc
        .moveTo(50, currentY)
        .lineTo(doc.page.width - 50, currentY)
        .stroke();
    };

    const addTitle = (text, fontSize = 16) => {
      doc.x = 50;
      doc
        .fontSize(fontSize)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text(text, 50, doc.y, { align: 'left' });
    };

    // === EN-TÊTE ===
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('RAPPORT DE STOCK', 50, doc.y, { align: 'left' });

    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#7f8c8d')
      .text(
        `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
        50,
        doc.y,
        { align: 'left' }
      );

    doc.moveDown(1);
    drawHorizontalLine();
    doc.moveDown(1);

    // === INFORMATIONS SOCIÉTÉ ===
    if (companyInfo.name) {
      doc.x = 50;
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text(companyInfo.name, 50, doc.y);

      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').fillColor('#34495e');

      if (companyInfo.address) {
        doc.text(companyInfo.address, 50, doc.y);
      }
      if (companyInfo.siret) {
        doc.text(`SIRET: ${companyInfo.siret}`, 50, doc.y);
      }
      doc.moveDown(1.5);
    }

    // === RÉSUMÉ EXÉCUTIF ===
    checkPageBreak(200);

    addTitle('RÉSUMÉ EXÉCUTIF');

    doc.moveDown(0.5);

    const summaryData = [
      ['Produits en stock', formatNumber(stockStats.summary.products_in_stock)],
      ['Produits exclus (stock inférieur à 1)', formatNumber(stockStats.summary.excluded_products)],
      ['Valeur stock (achat)', formatCurrency(stockStats.financial.inventory_value)],
      ['Valeur potentielle (vente)', formatCurrency(stockStats.financial.retail_value)],
      ['Marge potentielle', formatCurrency(stockStats.financial.potential_margin)],
      ['Taux de marge', formatPercentage(stockStats.financial.margin_percentage)],
      ['TVA collectée potentielle', formatCurrency(stockStats.financial.tax_amount)],
    ];

    const startY = doc.y;
    const leftCol = 50;
    const rightCol = 300;
    const rowHeight = 20;

    doc.fontSize(11).fillColor('#34495e');

    summaryData.forEach(([label, value], index) => {
      const currentY = startY + index * rowHeight;

      doc.font('Helvetica').text(label, leftCol, currentY, { width: 240, align: 'left' });
      doc.font('Helvetica-Bold').text(value, rightCol, currentY, { width: 200, align: 'right' });
    });

    doc.y = startY + summaryData.length * rowHeight + 20;

    // === RÉPARTITION PAR TVA ===
    checkPageBreak(250);

    addTitle('RÉPARTITION PAR TAUX DE TVA');

    doc.moveDown(0.8);

    const tableStartX = 50;
    const tableWidth = doc.page.width - 100;
    const colWidths = [90, 55, 85, 85, 85, 85];

    let currentY = doc.y;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50');

    const headers = ['Taux TVA', 'Nb Prod.', 'Val. Achat', 'Val. Vente', 'TVA Collect.', 'Marge'];
    const headerAlignments = ['left', 'right', 'right', 'right', 'right', 'right'];

    doc.rect(tableStartX, currentY - 5, tableWidth, 20).fillAndStroke('#ecf0f1', '#bdc3c7');

    let currentX = tableStartX + 5;
    headers.forEach((header, i) => {
      doc.fillColor('#2c3e50').text(header, currentX, currentY, {
        width: colWidths[i] - 10,
        align: headerAlignments[i],
      });
      currentX += colWidths[i];
    });

    currentY += 25;

    doc.fontSize(9).font('Helvetica').fillColor('#34495e');

    Object.entries(stockStats.financial.tax_breakdown).forEach(([key, data], index) => {
      const marginValue = data.retail_value - data.inventory_value;

      if (index % 2 === 0) {
        doc.rect(tableStartX, currentY - 3, tableWidth, 18).fill('#f8f9fa');
      }

      const rowData = [
        getTaxRateLabel(data.rate),
        formatNumber(data.product_count),
        formatCurrency(data.inventory_value),
        formatCurrency(data.retail_value),
        formatCurrency(data.tax_amount),
        formatCurrency(marginValue),
      ];

      const dataAlignments = ['left', 'right', 'right', 'right', 'right', 'right'];

      currentX = tableStartX + 5;
      rowData.forEach((value, i) => {
        doc.fillColor('#34495e').text(value, currentX, currentY, {
          width: colWidths[i] - 10,
          align: dataAlignments[i],
        });
        currentX += colWidths[i];
      });

      currentY += 18;

      if (currentY > doc.page.height - 150) {
        doc.addPage();
        currentY = 80;
      }
    });

    doc.y = currentY + 20;

    // === FOOTER ===
    const footerY = doc.page.height - 30;
    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('#95a5a6')
      .text('Rapport généré automatiquement par le système APPPOS', 50, footerY, {
        align: 'center',
        width: doc.page.width - 100,
      });

    doc
      .moveTo(50, footerY - 10)
      .lineTo(doc.page.width - 50, footerY - 10)
      .stroke('#ecf0f1');

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}

const productStockController = new ProductStockController();

module.exports = exportController(productStockController, [
  'updateStock',
  'getStockStatistics',
  'exportStockStatisticsToPDF',
]);
