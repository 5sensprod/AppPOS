// AppServe/config/pdfStyles.js

/**
 * Configuration centralisée des styles CSS pour les rapports PDF
 * Style minimaliste optimisé pour l'impression
 */
class PDFStyles {
  /**
   * Styles de base pour tous les PDFs
   */
  static getBase() {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 10pt;
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
          padding: 6mm;
          font-size: 9pt;
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
        margin: 10mm;
        orphans: 3;
        widows: 3;
      }
    `;
  }

  /**
   * Styles pour les en-têtes
   */
  static getHeader() {
    return `
      .header {
        border-bottom: 2px solid #000;
        padding-bottom: 4mm;
        margin-bottom: 6mm;
        page-break-inside: avoid;
      }

      .header h1 {
        font-size: 18pt;
        font-weight: 700;
        color: #000;
        margin-bottom: 2mm;
        text-transform: uppercase;
        letter-spacing: 0.5pt;
      }

      .header .subtitle {
        font-size: 9pt;
        color: #333;
        font-weight: 400;
      }
    `;
  }

  /**
   * Styles pour les informations d'entreprise
   */
  static getCompany() {
    return `
      .company-info {
        border-left: 3px solid #000;
        padding: 4mm 6mm;
        margin-bottom: 6mm;
        page-break-inside: avoid;
      }

      .company-name {
        font-size: 12pt;
        font-weight: 600;
        margin-bottom: 2mm;
        color: #000;
      }

      .company-details {
        font-size: 8pt;
        color: #333;
        line-height: 1.3;
      }
    `;
  }

  /**
   * Styles pour les tableaux (minimaliste)
   */
  static getTables() {
    return `
      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 4mm;
        font-size: 8pt;
      }

      .data-table th {
        background: white;
        border: 1px solid #000;
        padding: 2mm 1.5mm;
        text-align: center;
        font-weight: bold;
        font-size: 7pt;
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
      }

      .data-table td:first-child,
      .data-table td:nth-child(2) {
        text-align: left;
      }

      .totals-row {
        background: white !important;
        font-weight: bold;
        border-top: 2px solid #000 !important;
      }

      .final-totals-row {
        background: white !important;
        font-weight: bold;
        border-top: 3px solid #000 !important;
        font-size: 9pt;
      }
    `;
  }

  /**
   * Styles pour les métriques
   */
  static getMetrics() {
    return `
      .metrics-section {
        margin-bottom: 6mm;
        page-break-inside: avoid;
      }

      .metrics-title {
        font-size: 12pt;
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
        font-size: 8pt;
        color: #333;
        margin-bottom: 1mm;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.3pt;
      }

      .metric-value {
        font-size: 14pt;
        font-weight: 700;
        color: #000;
        margin-bottom: 1mm;
      }

      .metric-subtitle {
        font-size: 7pt;
        color: #666;
      }
    `;
  }

  /**
   * Styles pour les catégories (compact et minimaliste)
   */
  static getCategories() {
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
        font-size: 11pt;
        font-weight: 600;
        margin: 0;
        margin-bottom: 2mm;
        color: #000;
        text-transform: uppercase;
        letter-spacing: 0.5pt;
      }

      .category-stats {
        font-size: 8pt;
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
  static getSummary() {
    return `
      .summary {
        border: 2px solid #000;
        padding: 6mm;
        background: white;
        margin-top: 6mm;
        page-break-inside: avoid;
      }

      .summary h3 {
        font-size: 11pt;
        margin-bottom: 4mm;
        font-weight: 600;
        color: #000;
        text-transform: uppercase;
      }

      .summary p {
        font-size: 9pt;
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
   * Styles spécifiques pour le layout compact
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
   * Configuration pour paysage
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
   * Assemblage des styles selon le type de rapport
   */
  static getStylesFor(reportType, options = {}) {
    const { landscape = false, groupByCategory = false } = options;

    let styles = [this.getBase(), this.getHeader(), this.getCompany(), this.getTables()];

    switch (reportType) {
      case 'summary':
        styles.push(this.getMetrics(), this.getSummary(), this.getCompactLayout());
        break;

      case 'detailed':
        if (groupByCategory) {
          styles.push(this.getCategories());
        }
        styles.push(this.getSummary());
        break;

      case 'grouped':
        styles.push(this.getCategories(), this.getSummary());
        break;
    }

    if (landscape) {
      styles.push(this.getLandscapeConfig());
    }

    return styles.join('\n');
  }
}

module.exports = PDFStyles;
