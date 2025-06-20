// AppServe/config/pdfStyles.js

/**
 * Configuration centralisée des styles CSS pour les rapports PDF
 * Système hybride : valeurs par défaut + surcharges configurables
 */
class PDFStyles {
  /**
   * Configuration des tailles par défaut
   */
  static getDefaultSizes() {
    return {
      // Tailles de base
      baseFont: '10pt',
      // Tableaux
      tableFont: '11pt',
      tableHeaderFont: '10pt',
      // En-têtes
      mainTitle: '18pt',
      sectionTitle: '12pt',
      categoryTitle: '11pt',
      // Métriques
      metricValue: '14pt',
      metricLabel: '8pt',
      // Texte - 🔥 MODIFIEZ ICI pour la synthèse
      bodyText: '11pt', // ← Était '9pt', maintenant '11pt'
      smallText: '10pt', // ← Était '8pt', maintenant '10pt'
      footerText: '9pt', // ← Était '7pt', maintenant '9pt'
    };
  }

  /**
   * Styles de base avec tailles configurables
   */
  static getBase(sizes = {}) {
    const s = { ...this.getDefaultSizes(), ...sizes };

    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: ${s.baseFont};
        line-height: 1.4;
        color: #000;
        background: white;
        margin: 0;
        padding: 6mm;
      }

      .page {
        width: 100%;
        max-width: 210mm;
        margin: 0 auto;
      }

      @media print {
        body {
          margin: 0;
          padding: 8mm;
          padding-top: 12mm;
          font-size: ${s.baseFont};
        }
        
        .page {
          width: 100%;
          max-width: none;
        }
        
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }

      @page {
        size: A4;
        margin: 15mm;
        orphans: 3;
        widows: 3;
      }
    `;
  }

  /**
   * Styles pour les en-têtes
   */
  static getHeader(sizes = {}) {
    const s = { ...this.getDefaultSizes(), ...sizes };

    return `
      .header {
        border-bottom: 2px solid #000;
        padding-bottom: 4mm;
        margin-bottom: 6mm;
        page-break-inside: avoid;
      }

      .header h1 {
        font-size: ${s.mainTitle};
        font-weight: 700;
        color: #000;
        margin-bottom: 2mm;
        text-transform: uppercase;
        letter-spacing: 0.5pt;
      }

      .header .subtitle {
        font-size: ${s.bodyText};
        color: #333;
        font-weight: 400;
      }
    `;
  }

  /**
   * Styles pour les tableaux (le plus important !)
   */
  static getTables(sizes = {}) {
    const s = { ...this.getDefaultSizes(), ...sizes };

    return `
      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 4mm;
        font-size: ${s.tableFont};
      }

      .data-table th {
        background: white;
        border: 1px solid #000;
        padding: 2mm 1.5mm;
        text-align: center;
        font-weight: bold;
        font-size: ${s.tableHeaderFont};
        text-transform: uppercase;
        letter-spacing: 0.3pt;
      }

      .data-table th:first-child,
      .data-table th:nth-child(2) {
        text-align: left;
      }

      .data-table td {
        border: 1px solid #333;
        padding: 1.5mm 1mm;
        text-align: right;
        vertical-align: middle;
        font-size: ${s.tableFont};
      }

      .data-table td:first-child,
      .data-table td:nth-child(2) {
        text-align: left;
      }

      .totals-row {
        background: white !important;
        font-weight: bold;
        border-top: 2px solid #000 !important;
        font-size: ${s.tableFont};
      }

      .final-totals-row {
        background: white !important;
        font-weight: bold;
        border-top: 3px solid #000 !important;
        font-size: ${s.bodyText};
      }
    `;
  }

  /**
   * Styles pour les métriques
   */
  static getMetrics(sizes = {}) {
    const s = { ...this.getDefaultSizes(), ...sizes };

    return `
      .metrics-section {
        margin-bottom: 6mm;
        page-break-inside: avoid;
      }

      .metrics-title {
        font-size: ${s.sectionTitle};
        font-weight: 600;
        margin-bottom: 4mm;
        color: #000;
        border-bottom: 1px solid #000;
        padding-bottom: 1mm;
        text-transform: uppercase;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 4mm;
        margin-bottom: 4mm;
      }

      .metric-box {
        border: 1px solid #000;
        padding: 4mm;
        background: white;
      }

      .metric-label {
        font-size: ${s.metricLabel};
        color: #333;
        margin-bottom: 1mm;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.3pt;
      }

      .metric-value {
        font-size: ${s.metricValue};
        font-weight: 700;
        color: #000;
        margin-bottom: 1mm;
      }

      .metric-subtitle {
        font-size: ${s.footerText};
        color: #666;
      }
    `;
  }

  /**
   * Styles pour les catégories
   */
  static getCategories(sizes = {}) {
    const s = { ...this.getDefaultSizes(), ...sizes };

    return `
      .category-header {
        background: white;
        border-left: 4px solid #000;
        border-bottom: 1px solid #000;
        padding: 3mm 4mm;
        margin-bottom: 2mm;
        margin-top: 6mm;
        page-break-inside: avoid;
      }

      .category-title {
        font-size: ${s.categoryTitle};
        font-weight: 600;
        margin: 0;
        margin-bottom: 2mm;
        color: #000;
        text-transform: uppercase;
        letter-spacing: 0.5pt;
      }

      .category-stats {
        font-size: ${s.smallText};
        color: #333;
        display: flex;
        gap: 6mm;
        flex-wrap: wrap;
      }

      .stat-item {
        font-weight: 500;
      }
    `;
  }

  /**
   * Styles pour la synthèse
   */
  static getSummary(sizes = {}) {
    const s = { ...this.getDefaultSizes(), ...sizes };

    return `
      .summary {
        border: 2px solid #000;
        padding: 6mm;
        background: white;
        margin-top: 6mm;
        page-break-inside: avoid;
      }

      .summary h3 {
        font-size: ${s.categoryTitle};
        margin-bottom: 4mm;
        font-weight: 600;
        color: #000;
        text-transform: uppercase;
      }

      .summary p {
        font-size: ${s.bodyText};
        line-height: 1.4;
        margin-bottom: 3mm;
        text-align: justify;
      }

      .highlight {
        font-weight: bold;
        color: #000;
      }
    `;
  }

  /**
   * Layout compact
   */
  static getCompactLayout() {
    return `
      .compact-layout {
        display: flex;
        justify-content: space-between;
        gap: 6mm;
        margin-bottom: 6mm;
      }

      .compact-left {
        flex: 1;
      }

      .compact-right {
        flex: 1;
      }
    `;
  }

  /**
   * Configuration paysage
   */
  static getLandscapeConfig() {
    return `
      @page { 
        size: A4 landscape; 
        margin: 10mm 8mm;
      }

      body {
        padding: 4mm;
      }

      .category-header {
        page-break-before: avoid;
      }

      .category-header + .data-table {
        page-break-before: avoid;
      }
    `;
  }

  /**
   * 🎯 MÉTHODE PRINCIPALE : Assemblage intelligent des styles
   */
  static getStylesFor(reportType, options = {}) {
    const {
      landscape = false,
      groupByCategory = false,
      // 🔥 Options de tailles personnalisées
      tableFontSize = null,
      fontSize = 'normal', // 'small', 'normal', 'large'
      customSizes = {},
    } = options;

    // 📏 Présets de tailles
    const sizePresets = {
      small: {
        baseFont: '9pt',
        tableFont: '7pt',
        tableHeaderFont: '6pt',
        mainTitle: '16pt',
        sectionTitle: '10pt',
        categoryTitle: '9pt',
        metricValue: '12pt',
        metricLabel: '7pt',
        bodyText: '8pt',
        smallText: '7pt',
        footerText: '6pt',
      },
      normal: this.getDefaultSizes(),
      large: {
        baseFont: '11pt',
        tableFont: '10pt',
        tableHeaderFont: '9pt',
        mainTitle: '20pt',
        sectionTitle: '14pt',
        categoryTitle: '13pt',
        metricValue: '16pt',
        metricLabel: '9pt',
        bodyText: '10pt',
        smallText: '9pt',
        footerText: '8pt',
      },
    };

    // 🎨 Calcul des tailles finales
    let finalSizes = { ...sizePresets[fontSize] };

    // Override spécifique pour les tableaux
    if (tableFontSize) {
      finalSizes.tableFont = tableFontSize;
      finalSizes.tableHeaderFont = tableFontSize;
    }

    // Override personnalisés
    finalSizes = { ...finalSizes, ...customSizes };

    // 🏗️ Construction des styles
    let styles = [
      this.getBase(finalSizes),
      this.getHeader(finalSizes),
      this.getCompany(finalSizes),
      this.getTables(finalSizes),
    ];

    switch (reportType) {
      case 'summary':
        styles.push(
          this.getMetrics(finalSizes),
          this.getSummary(finalSizes),
          this.getCompactLayout()
        );
        break;

      case 'detailed':
        if (groupByCategory) {
          styles.push(this.getCategories(finalSizes));
        }
        styles.push(this.getSummary(finalSizes));
        break;

      case 'grouped':
        styles.push(this.getCategories(finalSizes), this.getSummary(finalSizes));
        break;
    }

    if (landscape) {
      styles.push(this.getLandscapeConfig());
    }

    return styles.join('\n');
  }

  /**
   * 🎯 Méthode pour les informations d'entreprise (ajoutée pour cohérence)
   */
  static getCompany(sizes = {}) {
    const s = { ...this.getDefaultSizes(), ...sizes };

    return `
      .company-info {
        border-left: 3px solid #000;
        padding: 4mm 6mm;
        margin-bottom: 6mm;
        page-break-inside: avoid;
      }

      .company-name {
        font-size: ${s.sectionTitle};
        font-weight: 600;
        margin-bottom: 2mm;
        color: #000;
      }

      .company-details {
        font-size: ${s.smallText};
        color: #333;
        line-height: 1.3;
      }
    `;
  }
}

module.exports = PDFStyles;
