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
   * 📊 Génération du rapport détaillé - Support rapport simplifié
   */
  async generateDetailedReport(doc, stockStats, styles, options) {
    const {
      companyInfo,
      includeCompanyInfo,
      groupByCategory = false,
      productsInStock = [],
      sortBy = 'name',
      sortOrder = 'asc',
      isSimplified = false,
    } = options;

    console.log('DEBUG paramètres extraits:', {
      groupByCategory,
      isSimplified,
      productsCount: productsInStock.length,
    });

    // Stocker les options courantes pour les méthodes appelées
    this.currentOptions = options;

    // En-tête principal
    this.contentRenderer.renderHeader(doc, styles, {
      title: isSimplified ? 'Rapport de Stock Simplifié' : 'Rapport de Stock Détaillé',
      subtitle: `Généré le ${this.layoutHelper.formatDate()} à ${this.layoutHelper.formatTime()}`,
    });

    // Informations entreprise (optionnel)
    if (includeCompanyInfo && companyInfo?.name) {
      this.contentRenderer.renderCompanyInfo(doc, styles, companyInfo);
    }

    // Synthèse rapide en haut
    this.contentRenderer.renderQuickSummary(doc, styles, stockStats);

    if (groupByCategory) {
      console.log('AVANT appel renderGroupedProductDetails avec isSimplified:', isSimplified);
      await this.renderGroupedProductDetails(doc, styles, stockStats, productsInStock, {
        sortBy,
        sortOrder,
      });
      console.log('APRÈS appel renderGroupedProductDetails');
    } else {
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
    console.log('DEBUT renderGroupedProductDetails');
    console.log('Etape 1: Récupération isSimplified');

    const { isSimplified = false } = this.currentOptions || {};

    console.log('Etape 2: isSimplified =', isSimplified);
    console.log('Etape 3: Groupement des produits');

    // Groupement par catégorie
    const groupedProducts = this.groupProductsByCategory(productsInStock);

    console.log('Etape 4: Calcul dimensions');
    // Titre de section
    const dimensions = this.layoutHelper.getUsablePageDimensions(doc);
    let y = this.contentRenderer.getCurrentY();

    console.log('Etape 5: Application du style');
    this.layoutHelper.applyTextStyle(doc, styles.metrics.sectionTitle);

    console.log('Etape 6: Choix du titre');
    const sectionTitle = isSimplified ? 'SYNTHÈSE PAR CATÉGORIE' : 'DÉTAIL PAR CATÉGORIE';
    console.log('TITRE CHOISI:', sectionTitle);

    console.log('Etape 7: Rendu du titre');
    doc.text(sectionTitle, dimensions.left, y, {
      width: dimensions.width,
      align: 'left',
    });
    y += styles.metrics.sectionTitle.fontSize + 15;

    this.contentRenderer.currentY = y;

    console.log('Etape 8: Test de la condition isSimplified =', isSimplified);
    if (isSimplified === true || isSimplified === 'true') {
      console.log('MODE SIMPLIFIÉ ACTIVÉ');
      await this.renderSimplifiedCategorySummary(
        doc,
        styles,
        dimensions,
        groupedProducts,
        stockStats
      );
    } else {
      console.log('MODE DÉTAILLÉ ACTIVÉ - valeur isSimplified:', isSimplified);

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

    console.log('FIN renderGroupedProductDetails');
  }

  async renderSimplifiedCategorySummary(doc, styles, dimensions, groupedProducts, stockStats) {
    console.log('MODE SIMPLIFIÉ : Génération du tableau groupé par catégorie parente');

    let y = this.contentRenderer.getCurrentY();

    // Groupement par catégorie parente
    const groupedByParent = this.groupByParentCategory(groupedProducts);
    const rootCategories = Object.keys(groupedByParent).sort();

    if (rootCategories.length > 0) {
      this.layoutHelper.applyTextStyle(doc, styles.summary.text);
      const categoryInfo =
        rootCategories.length === 1
          ? `Catégorie sélectionnée : ${rootCategories[0]}`
          : `Catégories sélectionnées : ${rootCategories.join(', ')}`;

      doc.text(categoryInfo, dimensions.left, y, {
        width: dimensions.width,
        align: 'left',
      });
      y += 15;

      doc.moveTo(dimensions.left, y).lineTo(dimensions.right, y).stroke('#CCCCCC');
      y += 10;
      this.contentRenderer.currentY = y;
    }

    // Configuration du tableau
    const summaryTableConfig = {
      columns: {
        category: { title: 'Catégorie', align: 'left' },
        product_count: { title: 'Nb Produits', align: 'center' },
        stock_total: { title: 'Stock Total', align: 'center' },
        inventory_value: { title: 'Valeur Stock', align: 'right' },
        tax_collected: { title: 'TVA Collectée', align: 'right' },
      },
      widths: {
        category: 30,
        product_count: 15,
        stock_total: 15,
        inventory_value: 20,
        tax_collected: 20,
      },
    };

    const columnWidths = this.layoutHelper.calculateColumnWidths(
      dimensions.width,
      summaryTableConfig.widths
    );
    y = this.contentRenderer.getCurrentY();

    // En-tête du tableau
    y = this.contentRenderer.renderTableHeader(
      doc,
      styles,
      dimensions.left,
      y,
      columnWidths,
      summaryTableConfig.columns
    );

    // Rendu groupé par catégorie parente
    for (const [parentCategory, subcategories] of Object.entries(groupedByParent)) {
      // Ligne de la catégorie parente (en gras)
      if (Object.keys(subcategories).length > 1) {
        const parentStats = this.calculateParentCategoryStats(subcategories);
        const parentRowData = {
          category: `${parentCategory.toUpperCase()}`,
          product_count: this.layoutHelper.formatNumber(parentStats.totalProducts),
          stock_total: this.layoutHelper.formatNumber(parentStats.totalStock),
          inventory_value: this.layoutHelper.formatCurrency(parentStats.totalInventoryValue),
          tax_collected: this.layoutHelper.formatCurrency(parentStats.totalTaxCollected),
        };
        y = this.renderParentCategoryRow(
          doc,
          styles,
          dimensions.left,
          y,
          columnWidths,
          summaryTableConfig.columns,
          parentRowData
        );
      }

      // Lignes des sous-catégories (indentées)
      for (const [subcategoryName, products] of Object.entries(subcategories)) {
        const categoryStats = this.calculateCategoryStats(products);
        let totalStock = 0,
          taxCollected = 0;

        products.forEach((product) => {
          totalStock += product.stock || 0;
          const retailValue = (product.stock || 0) * (product.price || 0);
          const taxRate = product.tax_rate || 0;
          taxCollected += taxRate > 0 ? (retailValue * taxRate) / (100 + taxRate) : 0;
        });

        const summaryRowData = {
          category:
            Object.keys(subcategories).length > 1 ? `  ${subcategoryName}` : subcategoryName,
          product_count: this.layoutHelper.formatNumber(categoryStats.totalProducts),
          stock_total: this.layoutHelper.formatNumber(totalStock),
          inventory_value: this.layoutHelper.formatCurrency(categoryStats.totalInventoryValue),
          tax_collected: this.layoutHelper.formatCurrency(taxCollected),
        };

        y = this.contentRenderer.renderTableRow(
          doc,
          styles,
          dimensions.left,
          y,
          columnWidths,
          summaryTableConfig.columns,
          summaryRowData
        );
      }
    }

    // Totaux généraux
    const finalTotalsData = {
      category: 'TOTAL GÉNÉRAL',
      product_count: this.layoutHelper.formatNumber(stockStats.summary.products_in_stock),
      stock_total: this.layoutHelper.formatNumber(
        Object.values(groupedProducts)
          .flat()
          .reduce((sum, p) => sum + (p.stock || 0), 0)
      ),
      inventory_value: this.layoutHelper.formatCurrency(stockStats.financial.inventory_value),
      tax_collected: this.layoutHelper.formatCurrency(stockStats.financial.tax_amount),
    };

    y = this.contentRenderer.renderTableRow(
      doc,
      styles,
      dimensions.left,
      y,
      columnWidths,
      summaryTableConfig.columns,
      finalTotalsData,
      true
    );
    this.contentRenderer.currentY = y + 15;
  }

  /**
   * 📂 Extraction des catégories racines à partir des sous-catégories
   */
  extractRootCategories(groupedProducts) {
    const rootCategoryIds = new Set();
    const rootCategoryNames = new Set();

    Object.values(groupedProducts).forEach((products) => {
      products.forEach((product) => {
        if (product.category_info && product.category_info.primary) {
          const primary = product.category_info.primary;

          // Utiliser path_ids pour récupérer l'ID de la catégorie racine
          if (primary.path_ids && Array.isArray(primary.path_ids) && primary.path_ids.length > 0) {
            rootCategoryIds.add(primary.path_ids[0]);
          }

          // Utiliser path pour récupérer le nom de la catégorie racine
          if (primary.path && Array.isArray(primary.path) && primary.path.length > 0) {
            rootCategoryNames.add(primary.path[0]);
          }
        }
      });
    });

    return Array.from(rootCategoryNames).sort();
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
   * 📂 Groupement des produits par catégorie - Version finalisée
   */
  groupProductsByCategory(products) {
    console.log(`🔍 Groupement de ${products.length} produits par catégorie...`);

    const grouped = {};

    products.forEach((product) => {
      let categoryName = 'Non catégorisé';

      // Récupération du nom de catégorie depuis category_info
      if (product.category_info && product.category_info.primary) {
        const primary = product.category_info.primary;

        // Priorité au nom, puis au path_string
        if (primary.name && typeof primary.name === 'string' && primary.name.trim() !== '') {
          categoryName = primary.name;
        } else if (
          primary.path_string &&
          typeof primary.path_string === 'string' &&
          primary.path_string.trim() !== ''
        ) {
          categoryName = primary.path_string;
        }
      }
      // Fallback sur refs si pas de primary
      else if (
        product.category_info &&
        product.category_info.refs &&
        product.category_info.refs.length > 0
      ) {
        const firstRef = product.category_info.refs[0];

        if (firstRef.name && typeof firstRef.name === 'string' && firstRef.name.trim() !== '') {
          categoryName = firstRef.name;
        } else if (
          firstRef.path_string &&
          typeof firstRef.path_string === 'string' &&
          firstRef.path_string.trim() !== ''
        ) {
          categoryName = firstRef.path_string;
        }
      }

      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push(product);
    });

    console.log(
      '📊 Groupement final:',
      Object.keys(grouped).map((cat) => `"${cat}": ${grouped[cat].length} produits`)
    );

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
   * 📂 Groupement des sous-catégories par catégorie parente
   */
  groupByParentCategory(groupedProducts) {
    const groupedByParent = {};

    Object.entries(groupedProducts).forEach(([categoryName, products]) => {
      // Extraction de la catégorie parente
      let parentCategory = 'Autres';

      if (products.length > 0 && products[0].category_info?.primary) {
        const primary = products[0].category_info.primary;
        if (primary.path && Array.isArray(primary.path) && primary.path.length > 0) {
          parentCategory = primary.path[0];
        } else if (primary.path_string && primary.path_string.includes(' > ')) {
          parentCategory = primary.path_string.split(' > ')[0];
        } else {
          parentCategory = categoryName;
        }
      }

      if (!groupedByParent[parentCategory]) {
        groupedByParent[parentCategory] = {};
      }
      groupedByParent[parentCategory][categoryName] = products;
    });

    return groupedByParent;
  }

  /**
   * 📊 Calcul des stats pour une catégorie parente
   */
  calculateParentCategoryStats(subcategories) {
    let totalProducts = 0,
      totalStock = 0,
      totalInventoryValue = 0,
      totalTaxCollected = 0;

    Object.values(subcategories).forEach((products) => {
      products.forEach((product) => {
        totalProducts++;
        totalStock += product.stock || 0;
        totalInventoryValue += (product.stock || 0) * (product.purchase_price || 0);
        const retailValue = (product.stock || 0) * (product.price || 0);
        const taxRate = product.tax_rate || 0;
        totalTaxCollected += taxRate > 0 ? (retailValue * taxRate) / (100 + taxRate) : 0;
      });
    });

    return { totalProducts, totalStock, totalInventoryValue, totalTaxCollected };
  }

  /**
   * 📋 Rendu d'une ligne de catégorie parente (en gras)
   */
  renderParentCategoryRow(doc, styles, x, y, columnWidths, columns, rowData) {
    // Utiliser le style de totaux pour mettre en gras
    return this.contentRenderer.renderTableRow(
      doc,
      styles,
      x,
      y,
      columnWidths,
      columns,
      rowData,
      true
    );
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
