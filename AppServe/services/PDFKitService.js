// AppServe/services/PDFKitService.js

const PDFDocument = require('pdfkit');
const PDFStylesConfig = require('../utils/pdf/PDFStylesConfig');
const PDFLayoutHelper = require('../utils/pdf/PDFLayoutHelper');
const PDFContentRenderer = require('../utils/pdf/PDFContentRenderer');

/**
 * Service principal pour la génération de PDF avec PDFKit
 * Remplace l'ancienne logique basée sur html-pdf/Puppeteer
 */
class PDFKitService {
  constructor() {
    this.stylesConfig = new PDFStylesConfig();
    this.layoutHelper = new PDFLayoutHelper();
    this.contentRenderer = new PDFContentRenderer();
  }

  /**
   * 🎯 MÉTHODE PRINCIPALE : Génération du rapport de stock
   */
  async generateStockReport(stockStats, options = {}) {
    try {
      const {
        reportType = 'summary',
        companyInfo = {},
        includeCompanyInfo = true,
        includeCharts = false,
        orientation = 'portrait',
      } = options;

      // Configuration du document PDF
      const docOptions = this.getDocumentOptions(orientation);
      const doc = new PDFDocument(docOptions);

      // Buffer pour récupérer le PDF généré
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      // Configuration des styles selon le type de rapport
      const styles = this.stylesConfig.getStylesForReport(reportType, options);

      // Génération du contenu selon le type
      switch (reportType) {
        case 'summary':
          await this.generateSummaryReport(doc, stockStats, styles, options);
          break;
        case 'detailed':
          await this.generateDetailedReport(doc, stockStats, styles, options);
          break;
        default:
          throw new Error(`Type de rapport non supporté: ${reportType}`);
      }

      // Finalisation du document
      doc.end();

      // Retour du buffer final
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Erreur lors de la génération PDF: ${error.message}`);
    }
  }

  /**
   * 📋 Génération du rapport de synthèse
   */
  async generateSummaryReport(doc, stockStats, styles, options) {
    const { companyInfo, includeCompanyInfo } = options;

    // En-tête principal
    this.contentRenderer.renderHeader(doc, styles, {
      title: 'Rapport de Stock',
      subtitle: `Généré le ${this.layoutHelper.formatDate()} à ${this.layoutHelper.formatTime()}`,
    });

    // Informations entreprise (optionnel)
    if (includeCompanyInfo && companyInfo?.name) {
      this.contentRenderer.renderCompanyInfo(doc, styles, companyInfo);
    }

    // Section métriques principales
    this.contentRenderer.renderMetrics(doc, styles, stockStats);

    // Section répartition TVA
    this.contentRenderer.renderTaxBreakdown(doc, styles, stockStats);

    // Résumé exécutif
    this.contentRenderer.renderExecutiveSummary(doc, styles, stockStats);
  }

  /**
   * 📊 Génération du rapport détaillé
   */
  async generateDetailedReport(doc, stockStats, styles, options) {
    const {
      companyInfo,
      includeCompanyInfo,
      groupByCategory = false,
      productsInStock = [],
      sortBy = 'name',
      sortOrder = 'asc',
    } = options;

    // En-tête principal
    this.contentRenderer.renderHeader(doc, styles, {
      title: 'Rapport de Stock Détaillé',
      subtitle: `Généré le ${this.layoutHelper.formatDate()} à ${this.layoutHelper.formatTime()}`,
    });

    // Informations entreprise (optionnel)
    if (includeCompanyInfo && companyInfo?.name) {
      this.contentRenderer.renderCompanyInfo(doc, styles, companyInfo);
    }

    // Synthèse rapide en haut
    this.contentRenderer.renderQuickSummary(doc, styles, stockStats);

    if (groupByCategory) {
      // Mode groupé par catégorie
      await this.renderGroupedProductDetails(doc, styles, stockStats, productsInStock, {
        sortBy,
        sortOrder,
      });
    } else {
      // Mode liste simple
      await this.renderSimpleProductDetails(doc, styles, stockStats, productsInStock, {
        sortBy,
        sortOrder,
      });
    }

    // Résumé final
    this.contentRenderer.renderDetailedSummary(doc, styles, stockStats);
  }

  /**
   * 📋 Rendu des produits en mode liste simple
   */
  async renderSimpleProductDetails(
    doc,
    styles,
    stockStats,
    productsInStock,
    { sortBy, sortOrder }
  ) {
    // Tri des produits
    const sortedProducts = this.sortProducts(productsInStock, sortBy, sortOrder);

    // Titre de section
    const dimensions = this.layoutHelper.getUsablePageDimensions(doc);
    let y = this.contentRenderer.getCurrentY();

    this.layoutHelper.applyTextStyle(doc, styles.metrics.sectionTitle);
    doc.text('DÉTAIL DES PRODUITS EN STOCK', dimensions.left, y, {
      width: dimensions.width,
      align: 'left',
    });
    y += styles.metrics.sectionTitle.fontSize + 10;

    // Ligne sous le titre
    doc.moveTo(dimensions.left, y).lineTo(dimensions.right, y).stroke('#000000');
    y += 15;

    this.contentRenderer.currentY = y;

    // Configuration du tableau détaillé
    const tableConfig = this.getDetailedTableConfig();
    const columnWidths = this.layoutHelper.calculateColumnWidths(
      dimensions.width,
      tableConfig.widths
    );

    // Rendu du tableau
    await this.contentRenderer.renderDetailedProductTable(
      doc,
      styles,
      dimensions.left,
      columnWidths,
      tableConfig.columns,
      sortedProducts,
      stockStats
    );
  }

  /**
   * 📂 Rendu des produits groupés par catégorie
   */
  async renderGroupedProductDetails(
    doc,
    styles,
    stockStats,
    productsInStock,
    { sortBy, sortOrder }
  ) {
    // Groupement par catégorie
    const groupedProducts = this.groupProductsByCategory(productsInStock);

    // Titre de section
    const dimensions = this.layoutHelper.getUsablePageDimensions(doc);
    let y = this.contentRenderer.getCurrentY();

    this.layoutHelper.applyTextStyle(doc, styles.metrics.sectionTitle);
    doc.text('DÉTAIL PAR CATÉGORIE', dimensions.left, y, {
      width: dimensions.width,
      align: 'left',
    });
    y += styles.metrics.sectionTitle.fontSize + 15;

    this.contentRenderer.currentY = y;

    // Configuration du tableau
    const tableConfig = this.getDetailedTableConfig();
    const columnWidths = this.layoutHelper.calculateColumnWidths(
      dimensions.width,
      tableConfig.widths
    );

    // Rendu de chaque catégorie
    for (const [categoryName, products] of Object.entries(groupedProducts)) {
      const sortedProducts = this.sortProducts(products, sortBy, sortOrder);
      const categoryStats = this.calculateCategoryStats(sortedProducts);

      await this.contentRenderer.renderCategorySection(
        doc,
        styles,
        dimensions.left,
        columnWidths,
        tableConfig.columns,
        categoryName,
        sortedProducts,
        categoryStats
      );
    }

    // Tableau final des totaux
    await this.contentRenderer.renderFinalTotals(
      doc,
      styles,
      dimensions.left,
      columnWidths,
      tableConfig.columns,
      stockStats
    );
  }

  /**
   * 📊 Configuration du tableau détaillé
   */
  getDetailedTableConfig() {
    return {
      columns: {
        sku: { title: 'SKU', align: 'left' },
        name: { title: 'Nom du Produit', align: 'left' },
        purchase_price: { title: 'PA HT', align: 'right' },
        price: { title: 'PV HT', align: 'right' },
        stock: { title: 'Stock', align: 'center' },
        tax_rate: { title: 'TVA', align: 'center' },
        inventory_value: { title: 'Valeur Achat', align: 'right' },
        retail_value: { title: 'Valeur Vente', align: 'right' },
      },
      widths: {
        sku: 12,
        name: 24,
        purchase_price: 9,
        price: 9,
        stock: 7,
        tax_rate: 7,
        inventory_value: 16,
        retail_value: 16,
      },
    };
  }

  /**
   * 🔄 Tri des produits (méthode réutilisée)
   */
  sortProducts(products, sortBy, sortOrder) {
    const getSortValue = (product, key) => {
      switch (key) {
        case 'sku':
          return (product.sku || '').toLowerCase();
        case 'stock':
          return product.stock || 0;
        case 'value':
          return (product.stock || 0) * (product.purchase_price || 0);
        case 'purchase_price':
          return product.purchase_price || 0;
        case 'price':
          return product.price || 0;
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

  /**
   * 📂 Groupement des produits par catégorie
   */
  groupProductsByCategory(products) {
    const grouped = {};

    products.forEach((product) => {
      const category = product.category || product.category_name || 'Non catégorisé';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });

    // Tri alphabétique des catégories
    const sortedGrouped = {};
    Object.keys(grouped)
      .sort()
      .forEach((key) => {
        sortedGrouped[key] = grouped[key];
      });

    return sortedGrouped;
  }

  /**
   * 📊 Calcul des statistiques d'une catégorie
   */
  calculateCategoryStats(products) {
    let totalInventoryValue = 0;
    let totalRetailValue = 0;
    let totalProducts = products.length;

    products.forEach((product) => {
      const stock = product.stock || 0;
      const purchasePrice = product.purchase_price || 0;
      const retailPrice = product.price || 0;

      totalInventoryValue += stock * purchasePrice;
      totalRetailValue += stock * retailPrice;
    });

    return {
      totalProducts,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      totalRetailValue: Math.round(totalRetailValue * 100) / 100,
      totalMargin: Math.round((totalRetailValue - totalInventoryValue) * 100) / 100,
      marginPercentage:
        totalInventoryValue > 0
          ? Math.round(
              ((totalRetailValue - totalInventoryValue) / totalInventoryValue) * 100 * 100
            ) / 100
          : 0,
    };
  }

  /**
   * ⚙️ Configuration du document PDF
   */
  getDocumentOptions(orientation = 'portrait') {
    const isLandscape = orientation === 'landscape';

    return {
      size: 'A4',
      layout: orientation,
      margins: {
        top: isLandscape ? 30 : 40,
        bottom: isLandscape ? 30 : 40,
        left: isLandscape ? 25 : 35,
        right: isLandscape ? 25 : 35,
      },
      info: {
        Title: 'Rapport de Stock',
        Author: 'APPPOS',
        Subject: 'Statistiques de stock',
        Creator: 'PDFKit Service',
        Producer: 'APPPOS PDFKit Service',
      },
    };
  }

  /**
   * 🔧 Méthodes utilitaires
   */
  static getFilename(reportType, options = {}) {
    let filename = `rapport_stock_${reportType}`;

    if (options.isSimplified) filename += '_simplifie';
    if (options.groupByCategory) filename += '_categories';

    const date = new Date().toISOString().split('T')[0];
    filename += `_${date}.pdf`;

    return filename;
  }

  /**
   * 📤 Envoi de la réponse HTTP avec le PDF
   */
  static sendPDFResponse(res, pdfBuffer, reportType, options = {}) {
    const filename = this.getFilename(reportType, options);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  }
}

module.exports = PDFKitService;
