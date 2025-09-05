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
    const headerHeight = 35; // Plus de hauteur pour les titres
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

    // Texte de l'en-tête avec gestion multiligne
    currentX = x;
    this.layoutHelper.applyTextStyle(doc, styles.table.header);

    Object.entries(columns).forEach(([colKey, colConfig]) => {
      const padding = 4;
      const availableWidth = columnWidths[colKey] - padding * 2;

      let title = colConfig.title;
      let fontSize = styles.table.header.fontSize;

      // Test si le titre rentre
      let textWidth = doc.widthOfString(title, fontSize);

      // Si trop large, réduire la police
      if (textWidth > availableWidth) {
        fontSize = 8;
        doc.fontSize(fontSize);
        textWidth = doc.widthOfString(title, fontSize);

        // Si encore trop large, permettre le retour à la ligne
        if (textWidth > availableWidth) {
          const words = title.split(' ');
          if (words.length > 1) {
            title = words.join('\n'); // Saut de ligne entre les mots
          }
        }
      }

      // Calcul de la position pour l'alignement
      let textX = currentX + padding;
      if (colConfig.align === 'center') {
        textX =
          currentX + (columnWidths[colKey] - doc.widthOfString(title.split('\n')[0], fontSize)) / 2;
      } else if (colConfig.align === 'right') {
        textX =
          currentX +
          columnWidths[colKey] -
          padding -
          doc.widthOfString(title.split('\n')[0], fontSize);
      }

      // Centrage vertical du texte
      const lines = title.split('\n');
      const totalTextHeight = lines.length * fontSize * 1.2;
      const startY = y + (headerHeight - totalTextHeight) / 2 + 4;

      lines.forEach((line, lineIndex) => {
        const lineY = startY + lineIndex * fontSize * 1.2;
        let lineX = textX;

        // Réajustement pour chaque ligne si centré ou aligné à droite
        if (colConfig.align === 'center') {
          lineX = currentX + (columnWidths[colKey] - doc.widthOfString(line, fontSize)) / 2;
        } else if (colConfig.align === 'right') {
          lineX = currentX + columnWidths[colKey] - padding - doc.widthOfString(line, fontSize);
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
    const rowHeight = 22; // Légèrement augmenté
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

    // Contenu des cellules avec protection contre les débordements
    currentX = x;
    this.layoutHelper.applyTextStyle(doc, cellStyle);

    Object.entries(columns).forEach(([colKey, colConfig]) => {
      const value = rowData[colKey] || '';
      const padding = 3;
      const availableWidth = columnWidths[colKey] - padding * 2;

      // Troncature du texte si trop long
      let displayValue = value.toString();
      const maxWidth = availableWidth;
      const textWidth = doc.widthOfString(displayValue, cellStyle.fontSize);

      if (textWidth > maxWidth) {
        // Troncature progressive jusqu'à ce que ça rentre
        while (
          doc.widthOfString(displayValue + '...', cellStyle.fontSize) > maxWidth &&
          displayValue.length > 0
        ) {
          displayValue = displayValue.slice(0, -1);
        }
        if (displayValue.length > 0) {
          displayValue += '...';
        }
      }

      const textX = this.layoutHelper.getAlignedX(
        currentX + padding,
        availableWidth,
        displayValue,
        doc._font,
        cellStyle.fontSize,
        colConfig.align
      );

      doc.text(displayValue, textX, y + 7, {
        width: availableWidth,
        align: colConfig.align,
      });

      currentX += columnWidths[colKey];
    });

    return y + rowHeight;
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
    const summaryHeight = 110; // Augmenté pour plus d'espace
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
      if (textY + 20 > y + summaryHeight - padding - 15) return;

      doc.text(paragraph, contentX, textY, {
        width: contentWidth,
        align: 'justify',
        lineGap: 2, // Espacement entre les lignes
      });
      textY += 18; // Espacement entre paragraphes
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
