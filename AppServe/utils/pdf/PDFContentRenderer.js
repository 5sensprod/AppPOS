// AppServe/utils/pdf/PDFContentRenderer.js

const PDFLayoutHelper = require('./PDFLayoutHelper');

/**
 * Gestionnaire du rendu du contenu dans les PDF avec PDFKit
 */
class PDFContentRenderer {
  constructor() {
    this.layoutHelper = new PDFLayoutHelper();
    this.currentY = 0;
  }

  /**
   * 📄 Rendu de l'en-tête principal
   */
  renderHeader(doc, styles, { title, subtitle }) {
    const dimensions = this.layoutHelper.getUsablePageDimensions(doc);
    let y = dimensions.top;

    // Titre principal
    this.layoutHelper.applyTextStyle(doc, styles.header.title);
    doc.text(title, dimensions.left, y, {
      width: dimensions.width,
      align: 'left',
    });
    y += styles.header.title.fontSize + 5;

    // Sous-titre
    this.layoutHelper.applyTextStyle(doc, styles.header.subtitle);
    doc.text(subtitle, dimensions.left, y, {
      width: dimensions.width,
      align: 'left',
    });
    y += styles.header.subtitle.fontSize + 10;

    // Ligne de séparation
    doc.moveTo(dimensions.left, y).lineTo(dimensions.right, y).stroke('#000000');
    y += 15;

    this.currentY = y;
    return y;
  }

  /**
   * 🏢 Rendu des informations entreprise
   */
  renderCompanyInfo(doc, styles, companyInfo) {
    if (!companyInfo?.name) return this.currentY;

    const dimensions = this.layoutHelper.getUsablePageDimensions(doc);
    let y = this.currentY;

    // Bordure gauche
    doc.rect(dimensions.left, y, 3, 60).fill('#000000');

    const contentX = dimensions.left + 15;
    const contentWidth = dimensions.width - 15;

    // Nom de l'entreprise
    this.layoutHelper.applyTextStyle(doc, styles.company.name);
    doc.text(companyInfo.name, contentX, y + 5, {
      width: contentWidth,
      align: 'left',
    });
    y += styles.company.name.fontSize + 8;

    // Détails
    this.layoutHelper.applyTextStyle(doc, styles.company.details);

    const details = [];
    if (companyInfo.address) details.push(companyInfo.address);
    if (companyInfo.siret) details.push(`SIRET : ${companyInfo.siret}`);
    if (companyInfo.phone) details.push(`Tél. : ${companyInfo.phone}`);
    if (companyInfo.email) details.push(`Email : ${companyInfo.email}`);

    const detailsText = details.join('\n');
    doc.text(detailsText, contentX, y, {
      width: contentWidth,
      align: 'left',
    });

    this.currentY = y + 50;
    return this.currentY;
  }

  /**
   * 📊 Rendu des métriques principales
   */
  renderMetrics(doc, styles, stockStats) {
    const dimensions = this.layoutHelper.getUsablePageDimensions(doc);
    let y = this.currentY;

    // Titre de section
    this.layoutHelper.applyTextStyle(doc, styles.metrics.sectionTitle);
    doc.text('SYNTHÈSE GÉNÉRALE', dimensions.left, y, {
      width: dimensions.width,
      align: 'left',
    });
    y += styles.metrics.sectionTitle.fontSize + 10;

    // Ligne sous le titre
    doc.moveTo(dimensions.left, y).lineTo(dimensions.right, y).stroke('#000000');
    y += 15;

    // Grille des métriques (2x2)
    const gridPositions = this.layoutHelper.createMetricsGrid(dimensions.width, 2, 15);
    const boxHeight = 55;

    const metrics = [
      {
        label: 'Produits en Stock',
        value: this.layoutHelper.formatNumber(stockStats.summary.products_in_stock),
        subtitle: `sur ${this.layoutHelper.formatNumber(stockStats.summary.simple_products)} produits`,
      },
      {
        label: "Valeur d'Achat Totale",
        value: this.layoutHelper.formatCurrency(stockStats.financial.inventory_value),
        subtitle: "Prix d'acquisition",
      },
      {
        label: 'Valeur de Vente Totale',
        value: this.layoutHelper.formatCurrency(stockStats.financial.retail_value),
        subtitle: 'Potentiel commercial',
      },
      {
        label: 'Marge Potentielle',
        value: this.layoutHelper.formatCurrency(stockStats.financial.potential_margin),
        subtitle: `${this.layoutHelper.formatPercentage(stockStats.financial.margin_percentage)} de marge`,
      },
    ];

    // Rendu des 4 boîtes métriques
    metrics.forEach((metric, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const boxY = y + row * (boxHeight + 10);

      this.renderMetricBox(
        doc,
        styles,
        dimensions.left + gridPositions[col].x,
        boxY,
        gridPositions[col].width,
        boxHeight,
        metric
      );
    });

    this.currentY = y + 2 * (boxHeight + 10) + 10;
    return this.currentY;
  }

  /**
   * 📦 Rendu d'une boîte métrique individuelle
   */
  renderMetricBox(doc, styles, x, y, width, height, metric) {
    // Bordure de la boîte
    this.layoutHelper.drawBorderedBox(doc, x, y, width, height, {
      borderColor: '#000000',
      borderWidth: 1,
    });

    const padding = 8;
    const contentX = x + padding;
    const contentWidth = width - padding * 2;

    // Label
    this.layoutHelper.applyTextStyle(doc, styles.metrics.label);
    doc.text(metric.label.toUpperCase(), contentX, y + padding, {
      width: contentWidth,
      align: 'left',
    });

    // Valeur principale
    this.layoutHelper.applyTextStyle(doc, styles.metrics.value);
    doc.text(metric.value, contentX, y + padding + 15, {
      width: contentWidth,
      align: 'left',
    });

    // Sous-titre
    this.layoutHelper.applyTextStyle(doc, styles.metrics.subtitle);
    doc.text(metric.subtitle, contentX, y + height - padding - 12, {
      width: contentWidth,
      align: 'left',
    });
  }

  /**
   * 💰 Rendu du tableau de répartition TVA
   */
  renderTaxBreakdown(doc, styles, stockStats) {
    const dimensions = this.layoutHelper.getUsablePageDimensions(doc);
    let y = this.currentY;

    // Titre de section
    this.layoutHelper.applyTextStyle(doc, styles.metrics.sectionTitle);
    doc.text('RÉPARTITION PAR TAUX DE TVA', dimensions.left, y, {
      width: dimensions.width,
      align: 'left',
    });
    y += styles.metrics.sectionTitle.fontSize + 10;

    // Ligne sous le titre
    doc.moveTo(dimensions.left, y).lineTo(dimensions.right, y).stroke('#000000');
    y += 15;

    // Configuration du tableau avec largeurs optimisées
    const tableConfig = {
      columns: {
        rate: { title: 'Taux de TVA', width: 16, align: 'left' },
        count: { title: 'Nb Produits', width: 10, align: 'center' },
        inventory: { title: "Valeur d'Achat", width: 19, align: 'right' },
        retail: { title: 'Valeur de Vente', width: 19, align: 'right' },
        tax: { title: 'TVA Collectée', width: 17, align: 'right' },
        margin: { title: 'Marge Brute', width: 19, align: 'right' },
      },
    };

    // Calcul des largeurs de colonnes
    const columnWidths = this.layoutHelper.calculateColumnWidths(dimensions.width, {
      rate: tableConfig.columns.rate.width,
      count: tableConfig.columns.count.width,
      inventory: tableConfig.columns.inventory.width,
      retail: tableConfig.columns.retail.width,
      tax: tableConfig.columns.tax.width,
      margin: tableConfig.columns.margin.width,
    });

    // Rendu de l'en-tête du tableau
    y = this.renderTableHeader(doc, styles, dimensions.left, y, columnWidths, tableConfig.columns);

    // Données du tableau
    const taxData = Object.entries(stockStats.financial.tax_breakdown).map(([key, data]) => ({
      rate: this.layoutHelper.getTaxRateLabel(data.rate),
      count: this.layoutHelper.formatNumber(data.product_count),
      inventory: this.layoutHelper.formatCurrency(data.inventory_value),
      retail: this.layoutHelper.formatCurrency(data.retail_value),
      tax: this.layoutHelper.formatCurrency(data.tax_amount),
      margin: this.layoutHelper.formatCurrency(data.retail_value - data.inventory_value),
    }));

    // Rendu des lignes de données
    taxData.forEach((row) => {
      y = this.renderTableRow(
        doc,
        styles,
        dimensions.left,
        y,
        columnWidths,
        tableConfig.columns,
        row
      );
    });

    // Ligne de totaux
    const totalsRow = {
      rate: 'TOTAL GÉNÉRAL',
      count: this.layoutHelper.formatNumber(stockStats.summary.products_in_stock),
      inventory: this.layoutHelper.formatCurrency(stockStats.financial.inventory_value),
      retail: this.layoutHelper.formatCurrency(stockStats.financial.retail_value),
      tax: this.layoutHelper.formatCurrency(stockStats.financial.tax_amount),
      margin: this.layoutHelper.formatCurrency(stockStats.financial.potential_margin),
    };

    y = this.renderTableRow(
      doc,
      styles,
      dimensions.left,
      y,
      columnWidths,
      tableConfig.columns,
      totalsRow,
      true
    );

    this.currentY = y + 15;
    return this.currentY;
  }

  /**
   * 📋 Rendu de l'en-tête d'un tableau avec protection contre les débordements
   */
  renderTableHeader(doc, styles, x, y, columnWidths, columns) {
    const headerHeight = 35;
    let currentX = x;

    // Fond et bordures de l'en-tête
    Object.keys(columns).forEach((colKey) => {
      this.layoutHelper.drawBorderedBox(doc, currentX, y, columnWidths[colKey], headerHeight, {
        fillColor: styles.table.header.fillColor,
        borderColor: styles.table.header.borderColor,
        borderWidth: 2,
      });
      currentX += columnWidths[colKey];
    });

    // CORRECTION : Gestion du texte d'en-tête avec positionnement précis
    currentX = x;
    this.layoutHelper.applyTextStyle(doc, styles.table.header);

    Object.entries(columns).forEach(([colKey, colConfig]) => {
      const padding = 4;
      const availableWidth = columnWidths[colKey] - padding * 2;

      let title = colConfig.title;
      let fontSize = styles.table.header.fontSize;

      // Ajustement de la taille de police si nécessaire
      let textWidth = doc.widthOfString(title, fontSize);
      if (textWidth > availableWidth) {
        fontSize = Math.max(8, fontSize - 1);
        doc.fontSize(fontSize);
        textWidth = doc.widthOfString(title, fontSize);

        if (textWidth > availableWidth) {
          const words = title.split(' ');
          if (words.length > 1) {
            title = words.join('\n');
          }
        }
      }

      // CORRECTION : Calcul de position précis pour l'en-tête
      const lines = title.split('\n');
      const lineHeight = fontSize * 1.2;
      const totalTextHeight = lines.length * lineHeight;
      const startY = y + (headerHeight - totalTextHeight) / 2 + 2;

      lines.forEach((line, lineIndex) => {
        const lineY = startY + lineIndex * lineHeight;
        const lineWidth = doc.widthOfString(line, fontSize);

        let lineX;
        switch (colConfig.align) {
          case 'center':
            lineX = currentX + (columnWidths[colKey] - lineWidth) / 2;
            break;
          case 'right':
            lineX = currentX + columnWidths[colKey] - padding - lineWidth;
            break;
          default: // 'left'
            lineX = currentX + padding;
            break;
        }

        doc.text(line, lineX, lineY, {
          width: availableWidth,
          align: 'left', // Gestion manuelle de l'alignement
          lineBreak: false,
        });
      });

      currentX += columnWidths[colKey];
    });

    return y + headerHeight;
  }

  /**
   * 📊 Rendu d'une ligne de tableau avec protection contre les débordements
   */
  renderTableRow(doc, styles, x, y, columnWidths, columns, rowData, isTotals = false) {
    const rowHeight = 22;
    let currentX = x;

    const cellStyle = isTotals ? styles.table.totals : styles.table.cell;

    // Bordures des cellules
    Object.keys(columns).forEach((colKey) => {
      this.layoutHelper.drawBorderedBox(doc, currentX, y, columnWidths[colKey], rowHeight, {
        borderColor: cellStyle.borderColor,
        borderWidth: isTotals ? 2 : 1,
      });
      currentX += columnWidths[colKey];
    });

    // CORRECTION PRINCIPALE : Gestion du contenu avec positionnement précis
    currentX = x;
    this.layoutHelper.applyTextStyle(doc, cellStyle);

    Object.entries(columns).forEach(([colKey, colConfig]) => {
      const value = rowData[colKey] || '';
      const padding = 4; // Padding uniforme
      const availableWidth = columnWidths[colKey] - padding * 2;

      // Troncature du texte si nécessaire
      let displayValue = value.toString();
      const maxWidth = availableWidth;

      // Test de la largeur du texte
      while (
        doc.widthOfString(displayValue, cellStyle.fontSize) > maxWidth &&
        displayValue.length > 0
      ) {
        displayValue = displayValue.slice(0, -1);
      }

      // CORRECTION : Calcul précis de la position X selon l'alignement
      let textX;
      const textWidth = doc.widthOfString(displayValue, cellStyle.fontSize);

      switch (colConfig.align) {
        case 'center':
          textX = currentX + (columnWidths[colKey] - textWidth) / 2;
          break;
        case 'right':
          textX = currentX + columnWidths[colKey] - padding - textWidth;
          break;
        default: // 'left'
          textX = currentX + padding;
          break;
      }

      // CORRECTION : Position Y centrée dans la cellule
      const textY = y + (rowHeight - cellStyle.fontSize) / 2 + 2;

      // Rendu du texte avec position calculée précisément
      doc.text(displayValue, textX, textY, {
        width: availableWidth,
        align: 'left', // On gère l'alignement manuellement
        lineBreak: false, // Pas de retour à la ligne automatique
      });

      currentX += columnWidths[colKey];
    });

    return y + rowHeight;
  }

  /**
   * 📋 Rendu d'une synthèse rapide (version compacte pour le rapport détaillé)
   */
  renderQuickSummary(doc, styles, stockStats) {
    const dimensions = this.layoutHelper.getUsablePageDimensions(doc);
    let y = this.currentY;

    // Titre de section
    this.layoutHelper.applyTextStyle(doc, styles.metrics.sectionTitle);
    doc.text('SYNTHÈSE', dimensions.left, y, {
      width: dimensions.width,
      align: 'left',
    });
    y += styles.metrics.sectionTitle.fontSize + 8;

    // Bordure de la synthèse compacte
    const summaryHeight = 45;
    this.layoutHelper.drawBorderedBox(doc, dimensions.left, y, dimensions.width, summaryHeight, {
      borderColor: '#000000',
      borderWidth: 1,
    });

    const padding = 10;
    const contentX = dimensions.left + padding;
    const contentWidth = dimensions.width - padding * 2;

    // Informations en une ligne
    this.layoutHelper.applyTextStyle(doc, styles.summary.text);
    const summaryText = `${this.layoutHelper.formatNumber(stockStats.summary.products_in_stock)} produits • Valeur d'achat: ${this.layoutHelper.formatCurrency(stockStats.financial.inventory_value)} • Valeur de vente: ${this.layoutHelper.formatCurrency(stockStats.financial.retail_value)} • Marge: ${this.layoutHelper.formatCurrency(stockStats.financial.potential_margin)} (${this.layoutHelper.formatPercentage(stockStats.financial.margin_percentage)})`;

    doc.text(summaryText, contentX, y + 15, {
      width: contentWidth,
      align: 'center',
    });

    this.currentY = y + summaryHeight + 15;
    return this.currentY;
  }

  /**
   * 📊 Rendu du tableau détaillé des produits
   */
  async renderDetailedProductTable(doc, styles, x, columnWidths, columns, products, stockStats) {
    let y = this.currentY;

    // En-tête du tableau
    y = this.renderDetailedTableHeader(doc, styles, x, y, columnWidths, columns);

    // Produits avec pagination automatique
    let currentPageProducts = 0;
    const maxProductsPerPage = 25; // Limite pour éviter les débordements

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Vérification du saut de page
      if (
        currentPageProducts >= maxProductsPerPage ||
        y + 25 > this.layoutHelper.getUsablePageDimensions(doc).bottom - 50
      ) {
        // Saut de page
        doc.addPage();
        y = doc.page.margins.top;
        currentPageProducts = 0;

        // Re-rendu de l'en-tête sur la nouvelle page
        y = this.renderDetailedTableHeader(doc, styles, x, y, columnWidths, columns);
      }

      // Préparation des données du produit
      const productData = this.prepareProductRowData(product);

      // Rendu de la ligne
      y = this.renderTableRow(doc, styles, x, y, columnWidths, columns, productData);
      currentPageProducts++;
    }

    // Ligne de totaux
    const totalsData = this.prepareTotalsRowData(stockStats, products);
    y = this.renderTableRow(doc, styles, x, y, columnWidths, columns, totalsData, true);

    this.currentY = y + 15;
    return this.currentY;
  }

  /**
   * 📋 Rendu de l'en-tête du tableau détaillé
   */
  renderDetailedTableHeader(doc, styles, x, y, columnWidths, columns) {
    const headerHeight = 40; // Plus de hauteur pour les en-têtes détaillés
    let currentX = x;

    // Bordures
    Object.keys(columns).forEach((colKey) => {
      this.layoutHelper.drawBorderedBox(doc, currentX, y, columnWidths[colKey], headerHeight, {
        fillColor: styles.table.header.fillColor,
        borderColor: styles.table.header.borderColor,
        borderWidth: 2,
      });
      currentX += columnWidths[colKey];
    });

    // Texte des en-têtes
    currentX = x;
    this.layoutHelper.applyTextStyle(doc, styles.table.header);

    Object.entries(columns).forEach(([colKey, colConfig]) => {
      const padding = 3;
      const title = colConfig.title;
      let fontSize = 8; // Police plus petite pour les tableaux détaillés

      doc.fontSize(fontSize);

      // Gestion multiligne si nécessaire
      const lines =
        title.includes(' ') && doc.widthOfString(title, fontSize) > columnWidths[colKey] - 6
          ? title.split(' ')
          : [title];

      const lineHeight = fontSize * 1.2;
      const startY = y + (headerHeight - lines.length * lineHeight) / 2 + 2;

      lines.forEach((line, lineIndex) => {
        const lineY = startY + lineIndex * lineHeight;
        const lineWidth = doc.widthOfString(line, fontSize);

        let lineX = currentX + padding;
        if (colConfig.align === 'center') {
          lineX = currentX + (columnWidths[colKey] - lineWidth) / 2;
        } else if (colConfig.align === 'right') {
          lineX = currentX + columnWidths[colKey] - padding - lineWidth;
        }

        doc.text(line, lineX, lineY, {
          lineBreak: false,
        });
      });

      currentX += columnWidths[colKey];
    });

    return y + headerHeight;
  }

  /**
   * 📦 Préparation des données d'une ligne produit
   */
  prepareProductRowData(product) {
    const stock = product.stock || 0;
    const purchasePrice = product.purchase_price || 0;
    const salePrice = product.price || 0;
    const taxRate = product.tax_rate || 0;

    // Calculs pour ce produit
    const inventoryValue = stock * purchasePrice;
    const retailValue = stock * salePrice;
    const taxCollected = taxRate > 0 ? (retailValue * taxRate) / 100 : 0;

    return {
      sku: product.sku || '',
      name: product.name || 'Sans nom',
      stock: this.layoutHelper.formatNumber(stock),
      tax_rate: taxRate > 0 ? `${taxRate}%` : '0%',
      inventory_value: this.layoutHelper.formatCurrency(inventoryValue),
      retail_value: this.layoutHelper.formatCurrency(retailValue),
      tax_collected: this.layoutHelper.formatCurrency(taxCollected),
    };
  }
  /**
   * 📊 Préparation des données de la ligne totaux
   */
  prepareTotalsRowData(stockStats, products) {
    return {
      sku: '',
      name: 'TOTAL GÉNÉRAL',
      stock: this.layoutHelper.formatNumber(stockStats.summary.products_in_stock),
      tax_rate: '',
      inventory_value: this.layoutHelper.formatCurrency(stockStats.financial.inventory_value),
      retail_value: this.layoutHelper.formatCurrency(stockStats.financial.retail_value),
      tax_collected: this.layoutHelper.formatCurrency(stockStats.financial.tax_amount),
    };
  }

  /**
   * 📂 Rendu d'une section de catégorie
   */
  async renderCategorySection(
    doc,
    styles,
    x,
    columnWidths,
    columns,
    categoryName,
    products,
    categoryStats
  ) {
    let y = this.currentY;
    const dimensions = this.layoutHelper.getUsablePageDimensions(doc);

    // Vérification du saut de page pour la catégorie
    if (y + 100 > dimensions.bottom - 50) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    // En-tête de catégorie
    const categoryHeight = 35;
    this.layoutHelper.drawBorderedBox(doc, x, y, dimensions.width, categoryHeight, {
      fillColor: '#f0f0f0',
      borderColor: '#000000',
      borderWidth: 2,
    });

    const padding = 10;

    // Nom de la catégorie
    this.layoutHelper.applyTextStyle(doc, styles.metrics.sectionTitle);
    doc.fontSize(11);
    doc.text(categoryName.toUpperCase(), x + padding, y + 8, {
      width: dimensions.width - padding * 2,
      align: 'left',
    });

    // Statistiques de la catégorie
    doc.fontSize(8);
    const statsText = `${categoryStats.totalProducts} produits • ${this.layoutHelper.formatCurrency(categoryStats.totalInventoryValue)} → ${this.layoutHelper.formatCurrency(categoryStats.totalRetailValue)} (${this.layoutHelper.formatPercentage(categoryStats.marginPercentage)})`;
    doc.text(statsText, x + padding, y + 22, {
      width: dimensions.width - padding * 2,
      align: 'left',
    });

    y += categoryHeight + 5;

    // En-tête du tableau pour cette catégorie
    y = this.renderDetailedTableHeader(doc, styles, x, y, columnWidths, columns);

    // Produits de la catégorie
    for (const product of products) {
      // Vérification du saut de page
      if (y + 25 > dimensions.bottom - 50) {
        doc.addPage();
        y = doc.page.margins.top;
        y = this.renderDetailedTableHeader(doc, styles, x, y, columnWidths, columns);
      }

      const productData = this.prepareProductRowData(product);
      y = this.renderTableRow(doc, styles, x, y, columnWidths, columns, productData);
    }

    // Sous-totaux de la catégorie
    const subtotalData = {
      sku: '',
      name: `SOUS-TOTAL ${categoryName.toUpperCase()}`,
      stock: this.layoutHelper.formatNumber(categoryStats.totalProducts),
      tax_rate: '',
      inventory_value: this.layoutHelper.formatCurrency(categoryStats.totalInventoryValue),
      retail_value: this.layoutHelper.formatCurrency(categoryStats.totalRetailValue),
      tax_collected: this.layoutHelper.formatCurrency(this.calculateCategoryTaxCollected(products)), // <- AJOUT ICI
    };

    y = this.renderSubtotalRow(doc, styles, x, y, columnWidths, columns, subtotalData);
    y += 10; // Espacement entre catégories

    this.currentY = y;
    return y;
  }

  /**
   * 📊 Rendu d'une ligne de sous-total
   */
  renderSubtotalRow(doc, styles, x, y, columnWidths, columns, rowData) {
    const rowHeight = 25;
    let currentX = x;

    // Bordures avec style différent
    Object.keys(columns).forEach((colKey) => {
      this.layoutHelper.drawBorderedBox(doc, currentX, y, columnWidths[colKey], rowHeight, {
        fillColor: '#f8f8f8',
        borderColor: '#666666',
        borderWidth: 1,
      });
      currentX += columnWidths[colKey];
    });

    // Contenu en italique
    currentX = x;
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#333333');

    Object.entries(columns).forEach(([colKey, colConfig]) => {
      const value = rowData[colKey] || '';
      const padding = 3;
      const cellWidth = columnWidths[colKey];

      let textX = currentX + padding;
      if (colConfig.align === 'center') {
        textX = currentX + (cellWidth - doc.widthOfString(value, 9)) / 2;
      } else if (colConfig.align === 'right') {
        textX = currentX + cellWidth - padding - doc.widthOfString(value, 9);
      }

      const textY = y + (rowHeight - 9) / 2 + 2;
      doc.text(value, textX, textY, { lineBreak: false });

      currentX += cellWidth;
    });

    return y + rowHeight;
  }

  /**
   * 📊 Rendu des totaux finaux (pour le mode groupé)
   */
  async renderFinalTotals(doc, styles, x, columnWidths, columns, stockStats) {
    let y = this.currentY + 10;

    const totalsData = this.prepareTotalsRowData(stockStats, []);
    y = this.renderTableRow(doc, styles, x, y, columnWidths, columns, totalsData, true);

    this.currentY = y;
    return y;
  }

  /**
   * 📝 Rendu du résumé détaillé final
   */
  renderDetailedSummary(doc, styles, stockStats) {
    const dimensions = this.layoutHelper.getUsablePageDimensions(doc);
    let y = this.currentY + 20;

    // Vérification de l'espace disponible
    y = this.layoutHelper.checkPageBreak(doc, y, 80);

    // Bordure du résumé
    const summaryHeight = 70;
    this.layoutHelper.drawBorderedBox(doc, dimensions.left, y, dimensions.width, summaryHeight, {
      borderColor: '#000000',
      borderWidth: 2,
    });

    const padding = 12;
    const contentX = dimensions.left + padding;
    const contentWidth = dimensions.width - padding * 2;

    // Titre
    this.layoutHelper.applyTextStyle(doc, styles.summary.title);
    doc.text('CONCLUSION', contentX, y + padding, {
      width: contentWidth,
      align: 'left',
    });

    // Texte de conclusion
    this.layoutHelper.applyTextStyle(doc, styles.summary.text);
    const conclusionText = `Analyse détaillée de ${this.layoutHelper.formatNumber(stockStats.summary.products_in_stock)} références en stock. Investissement total: ${this.layoutHelper.formatCurrency(stockStats.financial.inventory_value)}. Potentiel de vente: ${this.layoutHelper.formatCurrency(stockStats.financial.retail_value)}. Marge réalisable: ${this.layoutHelper.formatPercentage(stockStats.financial.margin_percentage)}.`;

    doc.text(conclusionText, contentX, y + padding + 20, {
      width: contentWidth,
      align: 'justify',
    });

    this.currentY = y + summaryHeight + 15;
    return this.currentY;
  }

  /**
   * 📊 Calcul de la TVA collectée pour une catégorie
   */
  calculateCategoryTaxCollected(products) {
    let totalTaxCollected = 0;

    products.forEach((product) => {
      const retailValue = (product.stock || 0) * (product.price || 0);
      const taxRate = product.tax_rate || 0;

      // CORRECTION : Même formule corrigée ici
      // Ancienne : (retailValue * taxRate) / (100 + taxRate)
      // Nouvelle : (retailValue * taxRate) / 100
      totalTaxCollected += taxRate > 0 ? (retailValue * taxRate) / 100 : 0;
    });

    return totalTaxCollected;
  }

  /**
   * 📝 Rendu du résumé exécutif avec correction des lignes
   */
  renderExecutiveSummary(doc, styles, stockStats) {
    const dimensions = this.layoutHelper.getUsablePageDimensions(doc);
    let y = this.currentY;

    // Vérification de l'espace disponible
    y = this.layoutHelper.checkPageBreak(doc, y, 120);

    // Bordure du résumé
    const summaryHeight = 110;
    this.layoutHelper.drawBorderedBox(doc, dimensions.left, y, dimensions.width, summaryHeight, {
      borderColor: '#000000',
      borderWidth: 2,
    });

    const padding = 15;
    const contentX = dimensions.left + padding;
    const contentWidth = dimensions.width - padding * 2;

    // Titre
    this.layoutHelper.applyTextStyle(doc, styles.summary.title);
    doc.text('RÉSUMÉ EXÉCUTIF', contentX, y + padding, {
      width: contentWidth,
      align: 'left',
    });

    let textY = y + padding + styles.summary.title.fontSize + 10;

    // Paragraphes du résumé avec meilleur espacement
    const paragraphs = [
      `Ce rapport analyse ${this.layoutHelper.formatNumber(stockStats.summary.products_in_stock)} produits actuellement en stock sur un total de ${this.layoutHelper.formatNumber(stockStats.summary.simple_products)} produits physiques référencés dans le système.`,

      `La valeur totale du stock représente un investissement de ${this.layoutHelper.formatCurrency(stockStats.financial.inventory_value)} pour un potentiel commercial de ${this.layoutHelper.formatCurrency(stockStats.financial.retail_value)}, soit une marge potentielle de ${this.layoutHelper.formatCurrency(stockStats.financial.potential_margin)} (${this.layoutHelper.formatPercentage(stockStats.financial.margin_percentage)}).`,

      `La TVA collectée potentielle s'élève à ${this.layoutHelper.formatCurrency(stockStats.financial.tax_amount)}.`,
    ];

    this.layoutHelper.applyTextStyle(doc, styles.summary.text);

    paragraphs.forEach((paragraph, index) => {
      // Protection contre le débordement
      if (textY + 25 > y + summaryHeight - padding - 15) return; // Augmenté de 20 à 25

      doc.text(paragraph, contentX, textY, {
        width: contentWidth,
        align: 'justify',
        lineGap: 1, // CORRECTION: Réduit de 2 à 1
      });
      textY += 22; // CORRECTION: Augmenté de 18 à 22
    });

    // Pied de page du rapport avec position fixe
    const footerY = y + summaryHeight - padding - 10;
    doc
      .fontSize(8)
      .fillColor('#666666')
      .text(
        `Rapport établi le ${this.layoutHelper.formatShortDate()} à ${this.layoutHelper.formatTime()} par APPPOS.`,
        contentX,
        footerY,
        {
          width: contentWidth,
          align: 'left',
          lineGap: 0,
        }
      );

    this.currentY = y + summaryHeight + 15;
    return this.currentY;
  }

  /**
   * 🔄 Réinitialisation de la position Y
   */
  resetPosition(y = 0) {
    this.currentY = y;
  }

  /**
   * 📍 Obtention de la position Y actuelle
   */
  getCurrentY() {
    return this.currentY;
  }
}

module.exports = PDFContentRenderer;
