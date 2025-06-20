// AppServe/templates/pdf/detailedStockReportTemplate.js

const TemplateHelpers = require('./helpers/templateHelpers');
const GroupedStockReportTemplate = require('./groupedStockReportTemplate');
const Category = require('../../models/Category');

class DetailedStockReportTemplate {
  constructor() {
    this.helpers = new TemplateHelpers();
  }

  /**
   * Point d'entrée principal - route vers le bon template
   */
  async generateDetailedStockReportHTML(stockStats, productsInStock, options = {}) {
    const { groupByCategory = false } = options;

    if (groupByCategory) {
      const groupedTemplate = new GroupedStockReportTemplate();
      return await groupedTemplate.generateGroupedStockReportHTML(
        stockStats,
        productsInStock,
        options
      );
    }

    return this.generateStandardDetailedReportHTML(stockStats, productsInStock, options);
  }

  /**
   * Génère le rapport détaillé standard (liste simple)
   */
  generateStandardDetailedReportHTML(stockStats, productsInStock, options = {}) {
    const { companyInfo = {}, includeCompanyInfo = true } = options;

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Rapport de Stock Détaillé</title>
        <style>
            ${this.helpers.getStylesFor('detailed', { landscape: true })}
        </style>
    </head>
    <body>
        <div class="page">
            ${this.renderHeader('Rapport de Stock Détaillé')}
            ${includeCompanyInfo ? this.renderCompanyInfo(companyInfo) : ''}
            ${this.renderProductsTable(productsInStock, stockStats)}
            ${this.renderSummary(stockStats, productsInStock.length)}
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Génère l'en-tête du rapport
   */
  renderHeader(title, subtitle = null) {
    const defaultSubtitle = `Généré le ${this.helpers.formatDate()} à ${this.helpers.formatTime()}`;

    return `
    <header class="header">
        <h1>${this.helpers.escapeHtml(title)}</h1>
        <div class="subtitle">${this.helpers.escapeHtml(subtitle || defaultSubtitle)}</div>
    </header>
    `;
  }

  /**
   * Génère la section informations entreprise
   */
  renderCompanyInfo(companyInfo) {
    if (!companyInfo.name) return '';

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
   * Génère le tableau des produits
   */
  renderProductsTable(productsInStock, stockStats) {
    const rows = productsInStock
      .map((product) => {
        const stock = product.stock || 0;
        const purchasePrice = this.helpers.roundTo2Decimals(product.purchase_price || 0);
        const salePrice = this.helpers.roundTo2Decimals(product.price || 0);
        const taxRate = product.tax_rate || 0;
        const stockValue = this.helpers.roundTo2Decimals(stock * purchasePrice);
        const salePriceHT = taxRate > 0 ? salePrice / (1 + taxRate / 100) : salePrice;
        const taxAmount = this.helpers.roundTo2Decimals(
          taxRate > 0 ? (stock * salePriceHT * taxRate) / 100 : 0
        );

        return `
        <tr>
            <td>${this.helpers.escapeHtml(product.sku || '-')}</td>
            <td>${this.helpers.escapeHtml(this.truncateText(product.name || '', 50))}</td>
            <td>${this.helpers.formatCurrency(purchasePrice)}</td>
            <td>${this.helpers.formatCurrency(salePrice)}</td>
            <td>${this.helpers.formatNumber(stock)}</td>
            <td>${this.helpers.formatPercentage(taxRate)}</td>
            <td>${this.helpers.formatCurrency(stockValue)}</td>
            <td>${this.helpers.formatCurrency(taxAmount)}</td>
        </tr>
        `;
      })
      .join('');

    return `
    <table class="data-table">
        <thead>
            <tr>
                <th>SKU</th>
                <th>Désignation</th>
                <th>PA HT</th>
                <th>PV TTC</th>
                <th>Stock</th>
                <th>TVA %</th>
                <th>Valeur Stock</th>
                <th>Montant TVA</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
            <tr class="totals-row">
                <td colspan="4"><strong>TOTAL GÉNÉRAL</strong></td>
                <td><strong>${this.helpers.formatNumber(productsInStock.reduce((sum, p) => sum + (p.stock || 0), 0))}</strong></td>
                <td>-</td>
                <td><strong>${this.helpers.formatCurrency(stockStats.financial.inventory_value)}</strong></td>
                <td><strong>${this.helpers.formatCurrency(stockStats.financial.tax_amount)}</strong></td>
            </tr>
        </tbody>
    </table>
    `;
  }

  /**
   * Génère la synthèse finale
   */
  renderSummary(stockStats, productCount) {
    return `
    <section class="summary">
        <h3>Synthèse</h3>
        <p>
            Ce rapport présente <span class="highlight">${this.helpers.formatNumber(productCount)} produits</span> 
            en stock pour une valeur totale de <span class="highlight">${this.helpers.formatCurrency(stockStats.financial.inventory_value)}</span>.
        </p>
        <p>
            Potentiel commercial : <span class="highlight">${this.helpers.formatCurrency(stockStats.financial.retail_value)}</span> 
            (marge : <span class="highlight">${this.helpers.formatCurrency(stockStats.financial.potential_margin)}</span>).
        </p>
        <p style="margin-top: 6mm; font-size: 8pt; color: #666;">
            Rapport établi le ${this.helpers.formatShortDate()} à ${this.helpers.formatTime()} par APPPOS.
        </p>
    </section>
    `;
  }

  /**
   * Utilitaire pour tronquer le texte
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Templates pour Puppeteer
   */
  getHeaderTemplate(companyInfo) {
    return `
    <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin-top: 10px;">
      ${this.helpers.escapeHtml(companyInfo.name || 'Rapport de Stock Détaillé')} - Page <span class="pageNumber"></span> sur <span class="totalPages"></span>
    </div>
    `;
  }

  getFooterTemplate() {
    return `
    <div style="font-size: 9px; color: #999; text-align: center; width: 100%; margin-bottom: 10px;">
      Rapport généré automatiquement par APPPOS - ${this.helpers.formatShortDate()}
    </div>
    `;
  }
}

module.exports = DetailedStockReportTemplate;
