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
          
          <!-- 🔥 SYNTHÈSE DÉPLACÉE EN PREMIÈRE PAGE -->
          ${this.renderSummary(stockStats, productsInStock.length)}
          
          <!-- 🔥 SAUT DE PAGE AVANT LES TABLES -->
          <div style="page-break-before: always;">
              ${this.renderProductsTable(productsInStock, stockStats)}
          </div>
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

  // 🔥 === NOUVELLES MÉTHODES DE PAGINATION ===

  /**
   * 🎯 Calcul optimisé pour PLUS de lignes par page
   */
  calculateRowsPerPage() {
    // Estimations pour A4 paysage (297x210mm):
    const availableHeight = 145; // mm - Très agressif
    const headerHeight = 6; // mm - Compact
    const rowHeight = 4.2; // mm - Très compact
    const totalRowHeight = 5; // mm - Compact

    const usableHeight = availableHeight - headerHeight - totalRowHeight;
    const maxRows = Math.floor(usableHeight / rowHeight);

    // Marge de sécurité minimale
    const finalRows = Math.max(25, maxRows - 1);

    // Limitation pour éviter l'illisibilité
    const result = Math.min(finalRows, 40);

    console.log(`📊 Calcul pagination: ${result} lignes par page (max théorique: ${maxRows})`);
    return result;
  }

  /**
   * 🎯 Calcul adaptatif selon le nombre total de produits
   */
  calculateAdaptiveRowsPerPage(totalProducts) {
    const baseRows = this.calculateRowsPerPage();

    if (totalProducts <= 50) {
      // Peu de produits: on peut être plus conservateur
      return Math.max(baseRows - 2, 15);
    } else if (totalProducts <= 200) {
      // Volume moyen: utiliser le calcul standard
      return baseRows;
    } else {
      // Gros volume: être plus agressif
      return Math.min(baseRows + 3, 40); // Max 40 lignes par page
    }
  }

  /**
   * 🎯 Division des produits en chunks
   */
  chunkProducts(products, rowsPerPage) {
    const chunks = [];
    for (let i = 0; i < products.length; i += rowsPerPage) {
      chunks.push(products.slice(i, i + rowsPerPage));
    }
    return chunks;
  }

  /**
   * 🎯 Rendu d'une ligne de produit
   */
  renderProductRow(product) {
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
    <tr class="product-row">
        <td>${this.helpers.escapeHtml(product.sku || '-')}</td>
        <td class="product-name">${this.helpers.escapeHtml(this.truncateText(product.name || '', 45))}</td>
        <td>${this.helpers.formatCurrency(purchasePrice)}</td>
        <td>${this.helpers.formatCurrency(salePrice)}</td>
        <td>${this.helpers.formatNumber(stock)}</td>
        <td>${this.helpers.formatPercentage(taxRate)}</td>
        <td>${this.helpers.formatCurrency(stockValue)}</td>
        <td>${this.helpers.formatCurrency(taxAmount)}</td>
    </tr>
    `;
  }

  /**
   * 🎯 Ligne de totaux finaux
   */
  renderTotalRow(stockStats, productsInStock) {
    const totalStock = productsInStock.reduce((sum, p) => sum + (p.stock || 0), 0);

    return `
    <tr class="totals-row">
        <td colspan="4"><strong>TOTAL GÉNÉRAL</strong></td>
        <td><strong>${this.helpers.formatNumber(totalStock)}</strong></td>
        <td>-</td>
        <td><strong>${this.helpers.formatCurrency(stockStats.financial.inventory_value)}</strong></td>
        <td><strong>${this.helpers.formatCurrency(stockStats.financial.tax_amount)}</strong></td>
    </tr>
    `;
  }

  /**
   * 🎯 Sous-totaux pour une page
   */
  renderSubtotalRow(products) {
    const pageStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const pageValue = products.reduce(
      (sum, p) => sum + (p.stock || 0) * (p.purchase_price || 0),
      0
    );

    return `
    <tr class="subtotal-row">
        <td colspan="4"><strong>SOUS-TOTAL PAGE</strong></td>
        <td><strong>${this.helpers.formatNumber(pageStock)}</strong></td>
        <td>-</td>
        <td><strong>${this.helpers.formatCurrency(pageValue)}</strong></td>
        <td>-</td>
    </tr>
    `;
  }

  /**
   * 🎯 Tableau simple pour peu de produits
   */
  renderSimpleTable(productsInStock, stockStats) {
    const rows = productsInStock.map((product) => this.renderProductRow(product)).join('');

    return `
    <div class="table-container">
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
          ${this.renderTotalRow(stockStats, productsInStock)}
        </tbody>
      </table>
    </div>
    `;
  }

  /**
   * 🎯 Tables paginées optimisées
   */
  renderPaginatedTables(productsInStock, stockStats) {
    const ROWS_PER_PAGE = this.calculateAdaptiveRowsPerPage(productsInStock.length);
    const chunks = this.chunkProducts(productsInStock, ROWS_PER_PAGE);

    console.log(
      `📄 Pagination: ${productsInStock.length} produits répartis sur ${chunks.length} pages (${ROWS_PER_PAGE} lignes/page)`
    );

    const tablePages = chunks
      .map((chunk, pageIndex) => {
        const rows = chunk.map((product) => this.renderProductRow(product)).join('');
        const isLastPage = pageIndex === chunks.length - 1;

        return `
    <div class="table-page" ${pageIndex > 0 ? 'style="page-break-before: always;"' : ''}>
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
          ${isLastPage ? this.renderTotalRow(stockStats, productsInStock) : this.renderSubtotalRow(chunk)}
        </tbody>
      </table>
      
      <!-- 🔥 PAGINATION AVEC DATE AU LIEU DE "Suite page suivante" -->
      <div class="page-info">
        Page ${pageIndex + 1}/${chunks.length} • Rapport établi le ${this.helpers.formatShortDate()}
      </div>
    </div>
    `;
      })
      .join('');

    return tablePages;
  }

  // 🔥 === MÉTHODE PRINCIPALE MODIFIÉE ===

  /**
   * Génère le tableau avec pagination intelligente (REMPLACE l'ancienne méthode)
   */
  renderProductsTable(productsInStock, stockStats) {
    // Seuil augmenté de 30 à 45 produits
    if (productsInStock.length <= 45) {
      console.log(`📊 ${productsInStock.length} produits - Utilisation tableau simple`);
      return this.renderSimpleTable(productsInStock, stockStats);
    }

    console.log(`📊 ${productsInStock.length} produits - Utilisation pagination`);
    return this.renderPaginatedTables(productsInStock, stockStats);
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
   * Utilitaire pour tronquer le texte (optimisé)
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

module.exports = DetailedStockReportTemplate;
