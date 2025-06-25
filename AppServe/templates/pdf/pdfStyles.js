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
      margin-bottom: 3mm; /* 🔥 Réduit de 4mm */
      font-size: ${s.tableFont};
      table-layout: fixed;
      page-break-inside: auto;
    }

    .data-table th {
      background: white;
      border: 1px solid #000;
      padding: 1.5mm 1mm; /* 🔥 Réduit */
      text-align: center;
      font-weight: bold;
      font-size: ${s.tableHeaderFont};
      text-transform: uppercase;
      letter-spacing: 0.2pt;
      line-height: 1.1;
    }

    /* 🔥 Largeurs de colonnes optimisées */
    .data-table th:nth-child(1), .data-table td:nth-child(1) { width: 12%; }   /* SKU */
    .data-table th:nth-child(2), .data-table td:nth-child(2) { width: 24%; }  /* Nom */
    .data-table th:nth-child(3), .data-table td:nth-child(3) { width: 9%; }   /* PA */
    .data-table th:nth-child(4), .data-table td:nth-child(4) { width: 9%; }   /* PV */
    .data-table th:nth-child(5), .data-table td:nth-child(5) { width: 7%; }   /* Stock */
    .data-table th:nth-child(6), .data-table td:nth-child(6) { width: 7%; }   /* TVA */
    .data-table th:nth-child(7), .data-table td:nth-child(7) { width: 15%; }  /* Valeur */
    .data-table th:nth-child(8), .data-table td:nth-child(8) { width: 15%; }  /* Montant */

    .data-table th:first-child,
    .data-table th:nth-child(2) {
      text-align: left;
    }

    .data-table td {
      border: 1px solid #333;
      padding: 1mm 0.8mm; /* 🔥 Plus compact */
      text-align: right;
      vertical-align: middle;
      font-size: ${s.tableFont};
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      -webkit-page-break-inside: avoid !important;
      min-height: 4.5mm; /* 🔥 Réduit de 5.5mm */
      height: auto;
      line-height: 1.1;
    }

    .data-table td:first-child,
    .data-table td:nth-child(2) {
      text-align: left;
    }

    /* 🔥 Protection des lignes complètes */
    .data-table tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      -webkit-page-break-inside: avoid !important;
      min-height: 4.5mm;
    }

    /* 🔥 Noms de produits compacts */
    .data-table .product-name {
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
      line-height: 1.1;
      max-height: 7mm;
      overflow: hidden;
      font-size: calc(${s.tableFont} - 0.5pt);
    }

    .totals-row {
      background: white !important;
      font-weight: bold;
      border-top: 2px solid #000 !important;
      font-size: ${s.tableFont};
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-before: avoid;
      min-height: 5mm;
    }

    .final-totals-row {
      background: white !important;
      font-weight: bold;
      border-top: 3px solid #000 !important;
      font-size: ${s.bodyText};
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* 🔥 Styles pour pagination */
    .table-container {
      page-break-inside: avoid;
      margin-bottom: 3mm;
    }

    .table-page {
      page-break-inside: avoid;
    }

    .subtotal-row {
      background: #f8f8f8 !important;
      font-style: italic;
      border-top: 1px solid #666 !important;
      page-break-inside: avoid !important;
      font-size: calc(${s.tableFont} - 0.5pt);
      min-height: 4mm;
    }

    .page-info {
      text-align: center;
      font-style: italic;
      margin-top: 1.5mm;
      color: #666;
      font-size: calc(${s.smallText} - 1pt);
    }

    /* 🔥 Optimisation pour l'impression */
    @media print {
      .data-table {
        font-size: calc(${s.tableFont} - 0.5pt);
      }
      
      .data-table td, .data-table th {
        padding: 0.8mm 0.6mm;
      }
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

    /* 🔥 NOUVEAUX styles pour pagination des groupes */
    .category-section {
      page-break-inside: avoid;
      margin-bottom: 4mm;
    }

    .category-header-continued {
      background: #f0f0f0;
      border-left: 4px solid #666;
      border-bottom: 1px solid #666;
      padding: 2mm 4mm;
      margin-bottom: 2mm;
      page-break-inside: avoid;
    }

    .category-header-continued .category-title {
      font-size: calc(${s.categoryTitle} - 1pt);
      color: #666;
      font-style: italic;
    }

    /* 🔥 Synthèse première page pour groupés */
    .summary-overview {
      background: #f9f9f9;
      padding: 4mm;
      border: 1px solid #ccc;
      margin-bottom: 4mm;
    }

    .overview-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2mm;
      padding: 1mm 0;
      border-bottom: 1px dotted #ccc;
    }

    .overview-label {
      font-weight: 500;
      color: #333;
    }

    .categories-breakdown {
      background: white;
      padding: 4mm;
      border: 1px solid #ccc;
      margin-bottom: 4mm;
    }

    .categories-breakdown h4 {
      font-size: calc(${s.bodyText} + 1pt);
      margin-bottom: 3mm;
      color: #000;
      font-weight: 600;
      border-bottom: 1px solid #ddd;
      padding-bottom: 1mm;
    }

    .category-summary-item {
      margin-bottom: 3mm;
      padding: 2mm;
      border-left: 3px solid #000;
      background: #fafafa;
    }

    .category-summary-name {
      font-weight: 600;
      color: #000;
      font-size: ${s.bodyText};
      margin-bottom: 1mm;
    }

    .category-summary-stats {
      font-size: calc(${s.smallText});
      color: #666;
      font-style: italic;
    }

    .summary-conclusion {
      background: white;
      padding: 4mm;
      border: 2px solid #000;
      border-top: 4px solid #000;
    }

    .summary-conclusion p {
      margin-bottom: 2mm;
      line-height: 1.4;
    }

    /* 🔥 Protection anti-coupure pour les sections de catégories */
    .category-section .data-table {
      page-break-before: avoid;
    }

    .category-header + .data-table {
      page-break-before: avoid;
    }

    /* 🔥 Style pour le total général final */
    .final-totals-row {
      background: #e0e0e0 !important;
      font-weight: bold;
      border-top: 4px solid #000 !important;
      font-size: calc(${s.tableFont} + 1pt);
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* 🔥 Pagination info pour les groupes */
    .page-info {
      text-align: center;
      font-style: italic;
      margin-top: 1.5mm;
      color: #666;
      font-size: calc(${s.smallText} - 1pt);
      border-top: 1px solid #eee;
      padding-top: 1mm;
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
