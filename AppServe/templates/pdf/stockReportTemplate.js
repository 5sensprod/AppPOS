// AppServe/templates/pdf/stockReportTemplate.js

const TemplateHelpers = require('./helpers/templateHelpers');

class StockReportTemplate {
  constructor() {
    this.helpers = new TemplateHelpers();
  }

  /**
   * Génère le HTML complet du rapport de stock
   * @param {Object} stockStats - Statistiques de stock
   * @param {Object} companyInfo - Informations de l'entreprise
   * @returns {string} - HTML complet
   */
  generateStockReportHTML(stockStats, companyInfo) {
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Rapport de Stock</title>
        <style>
            ${this.getCompleteStyles()}
        </style>
    </head>
    <body>
        <div class="page">
            ${this.renderHeader()}
            ${this.renderCompanyInfo(companyInfo)}
            ${this.renderCompactLayout(stockStats)}
            ${this.renderSummarySection(stockStats)}
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Génère l'en-tête du rapport
   * @returns {string} - HTML de l'en-tête
   */
  renderHeader() {
    return `
    <header class="header">
        <h1>Rapport de Stock</h1>
        <div class="subtitle">
            Généré le ${this.helpers.formatDate()} à ${this.helpers.formatTime()}
        </div>
    </header>
    `;
  }

  /**
   * Génère la section des informations entreprise
   * @param {Object} companyInfo - Informations de l'entreprise
   * @returns {string} - HTML de la section entreprise
   */
  renderCompanyInfo(companyInfo) {
    if (!companyInfo.name) {
      return '';
    }

    return `
    <section class="company-info">
        <div class="company-name">${this.helpers.escapeHtml(companyInfo.name)}</div>
        <div class="company-details">
            ${companyInfo.address ? this.helpers.escapeHtml(companyInfo.address) + '<br>' : ''}
            ${companyInfo.siret ? `SIRET : ${this.helpers.escapeHtml(companyInfo.siret)}` : ''}
            ${companyInfo.phone ? ` • Tél. : ${this.helpers.escapeHtml(companyInfo.phone)}` : ''}
            ${companyInfo.email ? ` • Email : ${this.helpers.escapeHtml(companyInfo.email)}` : ''}
        </div>
    </section>
    `;
  }

  /**
   * Génère la section des métriques principales
   * @param {Object} stockStats - Statistiques de stock
   * @returns {string} - HTML des métriques
   */
  renderMetricsSection(stockStats) {
    return `
    <section class="metrics-section">
        <h2 class="metrics-title">Synthèse Générale</h2>
        
        <div class="metrics-grid">
            <div class="metric-box">
                <div class="metric-label">Produits en Stock</div>
                <div class="metric-value">${this.helpers.formatNumber(stockStats.summary.products_in_stock)}</div>
                <div class="metric-subtitle">sur ${this.helpers.formatNumber(stockStats.summary.simple_products)} produits</div>
            </div>

            <div class="metric-box">
                <div class="metric-label">Valeur d'Achat Totale</div>
                <div class="metric-value">${this.helpers.formatCurrency(stockStats.financial.inventory_value)}</div>
                <div class="metric-subtitle">Prix d'acquisition</div>
            </div>

            <div class="metric-box">
                <div class="metric-label">Valeur de Vente Totale</div>
                <div class="metric-value">${this.helpers.formatCurrency(stockStats.financial.retail_value)}</div>
                <div class="metric-subtitle">Potentiel commercial</div>
            </div>

            <div class="metric-box">
                <div class="metric-label">Marge Potentielle</div>
                <div class="metric-value">${this.helpers.formatCurrency(stockStats.financial.potential_margin)}</div>
                <div class="metric-subtitle">${this.helpers.formatPercentage(stockStats.financial.margin_percentage)} de marge</div>
            </div>
        </div>
    </section>
    `;
  }

  /**
   * Génère la section de répartition par TVA
   * @param {Object} stockStats - Statistiques de stock
   * @returns {string} - HTML du tableau TVA
   */
  renderTaxSection(stockStats) {
    const taxRows = Object.entries(stockStats.financial.tax_breakdown)
      .map(([key, data]) => {
        const marginValue = data.retail_value - data.inventory_value;
        return `
        <tr>
            <td style="text-align: left;">${this.helpers.getTaxRateLabel(data.rate)}</td>
            <td>${this.helpers.formatNumber(data.product_count)}</td>
            <td>${this.helpers.formatCurrency(data.inventory_value)}</td>
            <td>${this.helpers.formatCurrency(data.retail_value)}</td>
            <td>${this.helpers.formatCurrency(data.tax_amount)}</td>
            <td>${this.helpers.formatCurrency(marginValue)}</td>
        </tr>
        `;
      })
      .join('');

    return `
    <section class="tax-section">
        <h2 class="section-title">Répartition par Taux de TVA</h2>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th style="text-align: left;">Taux de TVA</th>
                    <th>Nb Produits</th>
                    <th>Valeur d'Achat</th>
                    <th>Valeur de Vente</th>
                    <th>TVA Collectée</th>
                    <th>Marge Brute</th>
                </tr>
            </thead>
            <tbody>
                ${taxRows}
                <tr class="totals-row">
                    <td style="text-align: left;"><strong>TOTAL GÉNÉRAL</strong></td>
                    <td><strong>${this.helpers.formatNumber(stockStats.summary.products_in_stock)}</strong></td>
                    <td><strong>${this.helpers.formatCurrency(stockStats.financial.inventory_value)}</strong></td>
                    <td><strong>${this.helpers.formatCurrency(stockStats.financial.retail_value)}</strong></td>
                    <td><strong>${this.helpers.formatCurrency(stockStats.financial.tax_amount)}</strong></td>
                    <td><strong>${this.helpers.formatCurrency(stockStats.financial.potential_margin)}</strong></td>
                </tr>
            </tbody>
        </table>
    </section>
    `;
  }

  /**
   * Génère la section des indicateurs de performance
   * @param {Object} stockStats - Statistiques de stock
   * @returns {string} - HTML des indicateurs
   */
  renderPerformanceSection(stockStats) {
    return `
    <section class="metrics-section">
        <h2 class="metrics-title">Indicateurs de Performance</h2>
        
        <div class="metrics-grid">
            <div class="metric-box">
                <div class="metric-label">Valeur Moyenne par Produit</div>
                <div class="metric-value">${this.helpers.formatCurrency(stockStats.performance.avg_inventory_per_product)}</div>
                <div class="metric-subtitle">Prix d'achat moyen</div>
            </div>

            <div class="metric-box">
                <div class="metric-label">Potentiel Moyen par Produit</div>
                <div class="metric-value">${this.helpers.formatCurrency(stockStats.performance.avg_retail_per_product)}</div>
                <div class="metric-subtitle">Prix de vente moyen</div>
            </div>

            <div class="metric-box">
                <div class="metric-label">Taux de Marge Global</div>
                <div class="metric-value">${this.helpers.formatPercentage(stockStats.financial.margin_percentage)}</div>
                <div class="metric-subtitle">Rentabilité potentielle</div>
            </div>

            <div class="metric-box">
                <div class="metric-label">Produits Exclus</div>
                <div class="metric-value">${this.helpers.formatNumber(stockStats.summary.excluded_products)}</div>
                <div class="metric-subtitle">Stock nul ou négatif</div>
            </div>
        </div>
    </section>
    `;
  }

  /**
   * Génère un layout compact combinant métriques, TVA et performance
   * @param {Object} stockStats - Statistiques de stock
   * @returns {string} - HTML du layout compact
   */
  renderCompactLayout(stockStats) {
    return `
    <div class="compact-layout">
      <div class="compact-left">
        ${this.renderMetricsSection(stockStats)}
        ${this.renderPerformanceSection(stockStats)}
      </div>
      <div class="compact-right">
        ${this.renderTaxSection(stockStats)}
      </div>
    </div>
    `;
  }

  /**
   * Génère la section de résumé exécutif
   * @param {Object} stockStats - Statistiques de stock
   * @returns {string} - HTML du résumé
   */
  renderSummarySection(stockStats) {
    return `
    <section class="summary">
        <h3>Résumé Exécutif</h3>
        <p>
            Ce rapport analyse <span class="highlight">${this.helpers.formatNumber(stockStats.summary.products_in_stock)} produits</span> 
            actuellement en stock sur un total de <span class="highlight">${this.helpers.formatNumber(stockStats.summary.simple_products)} produits physiques</span> 
            référencés dans le système.
        </p>
        <p>
            La valeur totale du stock représente un investissement de <span class="highlight">${this.helpers.formatCurrency(stockStats.financial.inventory_value)}</span> 
            pour un potentiel commercial de <span class="highlight">${this.helpers.formatCurrency(stockStats.financial.retail_value)}</span>, 
            soit une marge potentielle de <span class="highlight">${this.helpers.formatCurrency(stockStats.financial.potential_margin)}</span> 
            (<span class="highlight">${this.helpers.formatPercentage(stockStats.financial.margin_percentage)}</span>).
        </p>
        <p>
            La TVA collectée potentielle s'élève à <span class="highlight">${this.helpers.formatCurrency(stockStats.financial.tax_amount)}</span>.
        </p>
        <p style="margin-top: 8mm; font-size: 9pt; color: #666;">
            Rapport établi le ${this.helpers.formatShortDate()} à ${this.helpers.formatTime()} 
            par le système APPPOS.
        </p>
    </section>
    `;
  }

  /**
   * Génère le template d'en-tête pour Puppeteer
   * @param {Object} companyInfo - Informations de l'entreprise
   * @returns {string} - Template d'en-tête
   */
  getHeaderTemplate(companyInfo) {
    return `
    <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin-top: 10px;">
      ${this.helpers.escapeHtml(companyInfo.name || 'Rapport de Stock')} - Page <span class="pageNumber"></span> sur <span class="totalPages"></span>
    </div>
    `;
  }

  /**
   * Génère le template de pied de page pour Puppeteer
   * @returns {string} - Template de pied de page
   */
  getFooterTemplate() {
    return `
    <div style="font-size: 9px; color: #999; text-align: center; width: 100%; margin-bottom: 10px;">
      Rapport généré automatiquement par APPPOS - ${this.helpers.formatShortDate()}
    </div>
    `;
  }

  /**
   * Génère tous les styles CSS pour le rapport
   * @returns {string} - CSS complet
   */
  getCompleteStyles() {
    return `
    ${this.helpers.getAllStyles()}

    /* Styles spécifiques au rapport de stock - VERSION COMPACTE */
    .company-info {
      background: #f9fafb;
      border-left: 4px solid #3b82f6;
      padding: 8mm;
      margin-bottom: 8mm;
      page-break-inside: avoid;
    }

    .company-name {
      font-size: 16pt;
      font-weight: 600;
      margin-bottom: 3mm;
      color: #1f2937;
    }

    .company-details {
      font-size: 9pt;
      color: #4b5563;
      line-height: 1.4;
    }

    .tax-section {
      margin-bottom: 8mm;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 5mm;
      text-transform: uppercase;
      border-bottom: 1px solid #333;
      padding-bottom: 1mm;
    }

    .summary {
      border: 2px solid #3b82f6;
      padding: 8mm;
      background: #f8fafc;
      margin-top: 6mm;
      page-break-inside: avoid;
      border-radius: 2mm;
    }

    .summary h3 {
      font-size: 12pt;
      margin-bottom: 4mm;
      font-weight: 600;
      color: #1f2937;
    }

    .summary p {
      font-size: 10pt;
      line-height: 1.4;
      margin-bottom: 3mm;
      text-align: justify;
    }

    .highlight {
      font-weight: bold;
      color: #000;
    }

    /* Optimisations pour layout compact */
    .compact-layout {
      display: flex;
      justify-content: space-between;
      gap: 8mm;
      margin-bottom: 8mm;
    }

    .compact-left {
      flex: 1;
    }

    .compact-right {
      flex: 1;
    }
    `;
  }
}

module.exports = StockReportTemplate;
