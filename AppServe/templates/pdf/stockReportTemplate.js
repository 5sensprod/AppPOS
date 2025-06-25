// AppServe/templates/pdf/stockReportTemplate.js
// 🔧 MODIFICATION UNIQUEMENT de la méthode renderTaxSection pour éviter le débordement

const TemplateHelpers = require('./helpers/templateHelpers');

class StockReportTemplate {
  constructor() {
    this.helpers = new TemplateHelpers();
  }

  /**
   * Génère le HTML complet du rapport de stock de synthèse
   */
  generateStockReportHTML(stockStats, options = {}) {
    // Support de l'ancienne signature (stockStats, companyInfo)
    const companyInfo = options.companyInfo || options;
    const templateOptions =
      typeof options === 'object' && options.companyInfo ? options : { companyInfo };

    const { includeCompanyInfo = true } = templateOptions;

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Rapport de Stock</title>
        <style>
            ${this.helpers.getStylesFor('summary')}
            /* 🔥 STYLES SPÉCIFIQUES pour corriger le débordement du tableau TVA */
            .tax-section .data-table {
              font-size: 9pt; /* Police plus petite */
              table-layout: fixed; /* Force le respect des largeurs */
            }
            
            .tax-section .data-table th,
            .tax-section .data-table td {
              padding: 1mm 0.5mm; /* Padding réduit */
              word-wrap: break-word;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            
            /* 🔥 Largeurs spécifiques pour le tableau TVA */
            .tax-section .data-table th:nth-child(1), 
            .tax-section .data-table td:nth-child(1) { width: 20%; } /* Taux TVA */
            .tax-section .data-table th:nth-child(2), 
            .tax-section .data-table td:nth-child(2) { width: 12%; } /* Nb Produits */
            .tax-section .data-table th:nth-child(3), 
            .tax-section .data-table td:nth-child(3) { width: 17%; } /* Valeur Achat */
            .tax-section .data-table th:nth-child(4), 
            .tax-section .data-table td:nth-child(4) { width: 17%; } /* Valeur Vente */
            .tax-section .data-table th:nth-child(5), 
            .tax-section .data-table td:nth-child(5) { width: 17%; } /* TVA Collectée */
            .tax-section .data-table th:nth-child(6), 
            .tax-section .data-table td:nth-child(6) { width: 17%; } /* Marge Brute */
            
            /* 🔥 Style pour les montants - police monospace plus compacte */
            .tax-section .currency-cell {
              font-family: 'Courier New', monospace;
              font-size: 8pt;
              white-space: nowrap;
              text-align: right;
            }
            
            /* 🔥 Totaux en gras avec police adaptée */
            .tax-section .totals-row td {
              font-weight: bold;
              font-size: 8.5pt;
            }
        </style>
    </head>
    <body>
        <div class="page">
            ${this.renderHeader()}
            ${includeCompanyInfo ? this.renderCompanyInfo(companyInfo) : ''}
            ${this.renderCompactLayout(stockStats)}
            ${this.renderSummarySection(stockStats)}
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Génère l'en-tête du rapport
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
   */
  renderCompanyInfo(companyInfo) {
    if (!companyInfo || !companyInfo.name) {
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
   * 🔧 Génère la section de répartition par TVA - VERSION CORRIGÉE
   */
  renderTaxSection(stockStats) {
    const taxRows = Object.entries(stockStats.financial.tax_breakdown)
      .map(([key, data]) => {
        const marginValue = data.retail_value - data.inventory_value;
        return `
        <tr>
            <td>${this.helpers.getTaxRateLabel(data.rate)}</td>
            <td>${this.helpers.formatNumber(data.product_count)}</td>
            <td class="currency-cell">${this.helpers.formatCurrency(data.inventory_value)}</td>
            <td class="currency-cell">${this.helpers.formatCurrency(data.retail_value)}</td>
            <td class="currency-cell">${this.helpers.formatCurrency(data.tax_amount)}</td>
            <td class="currency-cell">${this.helpers.formatCurrency(marginValue)}</td>
        </tr>
        `;
      })
      .join('');

    return `
    <section class="tax-section">
        <h2 class="metrics-title">Répartition par Taux de TVA</h2>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th>Taux de TVA</th>
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
                    <td><strong>TOTAL GÉNÉRAL</strong></td>
                    <td><strong>${this.helpers.formatNumber(stockStats.summary.products_in_stock)}</strong></td>
                    <td class="currency-cell"><strong>${this.helpers.formatCurrency(stockStats.financial.inventory_value)}</strong></td>
                    <td class="currency-cell"><strong>${this.helpers.formatCurrency(stockStats.financial.retail_value)}</strong></td>
                    <td class="currency-cell"><strong>${this.helpers.formatCurrency(stockStats.financial.tax_amount)}</strong></td>
                    <td class="currency-cell"><strong>${this.helpers.formatCurrency(stockStats.financial.potential_margin)}</strong></td>
                </tr>
            </tbody>
        </table>
    </section>
    `;
  }

  /**
   * Génère un layout compact combinant métriques et TVA
   */
  renderCompactLayout(stockStats) {
    return `
    <div class="compact-layout">
      <div class="compact-left">
        ${this.renderMetricsSection(stockStats)}
      </div>
      <div class="compact-right">
        ${this.renderTaxSection(stockStats)}
      </div>
    </div>
    `;
  }

  /**
   * Génère la section de résumé exécutif
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
        <p style="margin-top: 6mm; font-size: 8pt; color: #666;">
            Rapport établi le ${this.helpers.formatShortDate()} à ${this.helpers.formatTime()} 
            par APPPOS.
        </p>
    </section>
    `;
  }
}

module.exports = StockReportTemplate;
