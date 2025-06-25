// AppServe/templates/pdf/groupedStockReportTemplate.js

const TemplateHelpers = require('./helpers/templateHelpers');
const Category = require('../../models/Category');
const { buildCategoryPath } = require('../../utils/categoryHelpers');

class GroupedStockReportTemplate {
  constructor() {
    this.helpers = new TemplateHelpers();
  }

  /**
   * Point d'entrée principal pour générer le rapport HTML
   */
  async generateGroupedStockReportHTML(stockStats, productsInStock, options = {}) {
    const {
      companyInfo = {},
      includeCompanyInfo = true,
      selectedCategories = [],
      includeUncategorized = true,
      isSimplified = false,
    } = options;

    console.log(`🚀 generateGroupedStockReportHTML appelée`);
    console.log(`🔥 Mode simplifié:`, isSimplified);
    console.log(`📂 Catégories sélectionnées:`, selectedCategories.length);

    try {
      const groupedProducts = await this.groupProductsByCategory(
        productsInStock,
        selectedCategories,
        includeUncategorized
      );

      const groupEntries = Object.entries(groupedProducts);
      console.log(`📋 ${groupEntries.length} groupes créés pour le rendu`);

      const title = `Rapport de Stock par Catégories${isSimplified ? ' (Simplifié)' : ''}`;

      return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        ${this.helpers.getStylesFor('grouped', {
          landscape: !isSimplified,
          fontSize: isSimplified ? 'normal' : 'small',
        })}
        ${isSimplified ? this.getSimplifiedStyles() : ''}
    </style>
</head>
<body>
    <div class="page">
        ${this.renderHeader(title, selectedCategories.length)}
        ${includeCompanyInfo ? this.renderCompanyInfo(companyInfo) : ''}
        
        ${this.renderCategorySummary(stockStats, groupEntries, selectedCategories, isSimplified)}
        
        ${
          isSimplified
            ? this.renderSimplifiedCategoryGroups(groupEntries)
            : `<div style="page-break-before: always;">${this.renderCategoryGroups(groupEntries)}</div>`
        }
    </div>
</body>
</html>`;
    } catch (error) {
      console.error('❌ Erreur génération rapport groupé:', error);

      // Fallback vers le template détaillé
      const DetailedTemplate = require('./detailedStockReportTemplate');
      const detailedTemplate = new DetailedTemplate();
      return detailedTemplate.generateStandardDetailedReportHTML(
        stockStats,
        productsInStock,
        options
      );
    }
  }

  /**
   * Groupement des produits par catégorie avec gestion des sélections
   */
  async groupProductsByCategory(products, selectedCategories = [], includeUncategorized = true) {
    console.log(`🏷️ DEBUT - Groupement par catégories`);
    console.log(`📂 selectedCategories reçues:`, selectedCategories);
    console.log(`📦 Nombre de produits à traiter:`, products.length);

    try {
      const allCategories = await Category.findAll();
      console.log(`📋 ${allCategories.length} catégories trouvées dans la base`);

      const categoryMap = this.buildCategoryMap(allCategories);
      const getCategoryPath = (categoryId) =>
        this.buildCategoryPath(categoryId, categoryMap, allCategories);

      const groupedProducts = {};
      const processedProductIds = new Set();

      // Déterminer les catégories effectives (avec descendants si sélection)
      const effectiveCategories = this.buildEffectiveCategories(selectedCategories, allCategories);

      // Traiter chaque produit
      products.forEach((product, index) => {
        this.processProductForGrouping(
          product,
          index,
          selectedCategories,
          effectiveCategories,
          getCategoryPath,
          groupedProducts,
          processedProductIds,
          allCategories
        );
      });

      // Ajouter les produits non catégorisés si demandé
      if (includeUncategorized) {
        this.addUncategorizedProducts(
          products,
          selectedCategories,
          effectiveCategories,
          processedProductIds,
          groupedProducts
        );
      }

      // Calculer les statistiques et trier
      this.calculateGroupStats(groupedProducts);
      const sortedGroups = this.sortGroups(groupedProducts);

      this.logFinalResults(sortedGroups, selectedCategories);
      return sortedGroups;
    } catch (error) {
      console.error('❌ Erreur groupement par catégories:', error);
      return this.createErrorGroup(products);
    }
  }

  /**
   * Méthodes de construction et utilitaires
   */
  buildCategoryMap(allCategories) {
    const categoryMap = {};
    allCategories.forEach((cat) => {
      categoryMap[cat._id] = {
        ...cat,
        name: this.formatCategoryName(cat.name || 'Sans nom'),
      };
    });
    return categoryMap;
  }

  buildCategoryPath(categoryId, categoryMap, allCategories) {
    if (!categoryId || !categoryMap[categoryId]) return null;

    try {
      const pathInfo = buildCategoryPath(allCategories, categoryId);
      return {
        id: categoryId,
        name: categoryMap[categoryId].name,
        path: pathInfo.path.map((name) => this.formatCategoryName(name)),
        path_string: pathInfo.path.map((name) => this.formatCategoryName(name)).join(' > '),
        level: pathInfo.path.length - 1,
      };
    } catch (error) {
      console.error(`Erreur construction chemin catégorie ${categoryId}:`, error);
      return {
        id: categoryId,
        name: categoryMap[categoryId].name,
        path: [categoryMap[categoryId].name],
        path_string: categoryMap[categoryId].name,
        level: 0,
      };
    }
  }

  buildEffectiveCategories(selectedCategories, allCategories) {
    if (selectedCategories.length === 0) {
      return allCategories.map((c) => c._id);
    }

    const effectiveCategories = [];
    for (const selectedCatId of selectedCategories) {
      effectiveCategories.push(selectedCatId);
      const descendants = this.findAllDescendants(allCategories, selectedCatId);
      effectiveCategories.push(...descendants);
    }
    return [...new Set(effectiveCategories)];
  }

  processProductForGrouping(
    product,
    index,
    selectedCategories,
    effectiveCategories,
    getCategoryPath,
    groupedProducts,
    processedProductIds,
    allCategories
  ) {
    const productCategories = product.categories || [];

    if (index < 3) {
      console.log(`🔍 Produit ${index + 1} "${product.name}":`, productCategories);
    }

    if (selectedCategories.length > 0) {
      // Mode sélection
      const matchingCategories = productCategories.filter((catId) =>
        effectiveCategories.includes(catId)
      );

      if (matchingCategories.length === 0) return;

      matchingCategories.forEach((categoryId) => {
        const rootSelectedCategory = this.findRootSelectedCategory(
          allCategories,
          categoryId,
          selectedCategories
        );

        if (rootSelectedCategory) {
          this.addProductToGroup(product, rootSelectedCategory, getCategoryPath, groupedProducts);
        }
      });
    } else {
      // Mode complet
      if (productCategories.length > 0) {
        productCategories.forEach((categoryId) => {
          this.addProductToGroup(product, categoryId, getCategoryPath, groupedProducts);
        });
      }
    }

    processedProductIds.add(product._id);
  }

  addProductToGroup(product, categoryId, getCategoryPath, groupedProducts) {
    const categoryInfo = getCategoryPath(categoryId);
    if (!categoryInfo) return;

    const key = categoryInfo.path_string;

    if (!groupedProducts[key]) {
      groupedProducts[key] = {
        categoryInfo,
        products: [],
        stats: { productCount: 0, totalStock: 0, totalValue: 0, totalTax: 0 },
      };
    }

    if (!groupedProducts[key].products.find((p) => p._id === product._id)) {
      groupedProducts[key].products.push(product);
    }
  }

  addUncategorizedProducts(
    products,
    selectedCategories,
    effectiveCategories,
    processedProductIds,
    groupedProducts
  ) {
    let uncategorizedProducts;

    if (selectedCategories.length > 0) {
      uncategorizedProducts = products.filter((product) => {
        const hasNoCategories = !product.categories || product.categories.length === 0;
        if (hasNoCategories) return true;
        return !product.categories.some((catId) => effectiveCategories.includes(catId));
      });
    } else {
      uncategorizedProducts = products.filter((product) => {
        const hasNoCategories = !product.categories || product.categories.length === 0;
        const notProcessed = !processedProductIds.has(product._id);
        return hasNoCategories || notProcessed;
      });
    }

    if (uncategorizedProducts.length > 0) {
      console.log(`📦 ${uncategorizedProducts.length} produits "Sans catégorie" ajoutés`);

      groupedProducts['Sans catégorie'] = {
        categoryInfo: {
          id: null,
          name: 'Sans catégorie',
          path: ['Sans catégorie'],
          path_string: 'Sans catégorie',
          level: 0,
        },
        products: uncategorizedProducts,
        stats: { productCount: 0, totalStock: 0, totalValue: 0, totalTax: 0 },
      };
    }
  }

  calculateGroupStats(groupedProducts) {
    Object.keys(groupedProducts).forEach((key) => {
      const group = groupedProducts[key];
      group.stats.productCount = group.products.length;

      group.products.forEach((product) => {
        const stock = product.stock || 0;
        const purchasePrice = product.purchase_price || 0;
        const salePrice = product.price || 0;
        const taxRate = product.tax_rate || 0;

        group.stats.totalStock += stock;
        group.stats.totalValue += stock * purchasePrice;

        if (taxRate > 0) {
          const salePriceHT = salePrice / (1 + taxRate / 100);
          group.stats.totalTax += (stock * salePriceHT * taxRate) / 100;
        }
      });
    });
  }

  sortGroups(groupedProducts) {
    return Object.entries(groupedProducts)
      .sort(([aKey, aGroup], [bKey, bGroup]) => {
        if (aKey === 'Sans catégorie') return 1;
        if (bKey === 'Sans catégorie') return -1;

        const levelDiff = aGroup.categoryInfo.level - bGroup.categoryInfo.level;
        if (levelDiff !== 0) return levelDiff;
        return aKey.localeCompare(bKey, 'fr');
      })
      .reduce((acc, [key, group]) => {
        acc[key] = group;
        return acc;
      }, {});
  }

  createErrorGroup(products) {
    return {
      'Erreur de groupement': {
        categoryInfo: {
          id: null,
          name: 'Erreur de groupement',
          path: ['Erreur de groupement'],
          path_string: 'Erreur de groupement',
          level: 0,
        },
        products: products,
        stats: {
          productCount: products.length,
          totalStock: products.reduce((sum, p) => sum + (p.stock || 0), 0),
          totalValue: products.reduce(
            (sum, p) => sum + (p.stock || 0) * (p.purchase_price || 0),
            0
          ),
          totalTax: 0,
        },
      },
    };
  }

  logFinalResults(sortedGroups, selectedCategories) {
    console.log(`✅ RÉSULTAT FINAL : ${Object.keys(sortedGroups).length} groupes créés`);
    console.log(`🔍 Mode sélection actif:`, selectedCategories.length > 0);
    Object.entries(sortedGroups).forEach(([key, group]) => {
      console.log(`  📂 "${key}": ${group.stats.productCount} produits`);
    });

    if (selectedCategories.length > 0 && Object.keys(sortedGroups).length === 0) {
      console.warn(`⚠️  ATTENTION: Mode sélection mais aucun groupe créé !`);
    }
  }

  /**
   * Rendu simplifié - Totaux par catégorie racine seulement
   */
  renderSimplifiedCategoryGroups(groupEntries) {
    console.log('🔥 renderSimplifiedCategoryGroups appelée avec', groupEntries.length, 'groupes');

    const rootCategories = this.groupByRootCategory(groupEntries);
    const simplifiedRows = this.buildSimplifiedRows(rootCategories);
    const grandTotals = this.calculateGrandTotals(rootCategories);

    return `
<div class="simplified-summary">
  <h2 class="category-title">Synthèse par Catégorie Racine</h2>
  
  <table class="data-table simplified-table">
      <thead>
          <tr>
              <th>Catégorie Racine</th>
              <th>Nb Produits</th>
              <th>Stock Total</th>
              <th>Valeur Stock</th>
              <th>TVA Collectée</th>
          </tr>
      </thead>
      <tbody>
          ${simplifiedRows}
          <tr class="final-totals-row">
              <td><strong>TOTAL GÉNÉRAL</strong></td>
              <td><strong>${this.helpers.formatNumber(grandTotals.productCount)}</strong></td>
              <td><strong>${this.helpers.formatNumber(grandTotals.totalStock)}</strong></td>
              <td class="currency-cell"><strong>${this.helpers.formatCurrency(grandTotals.totalValue)}</strong></td>
              <td class="currency-cell"><strong>${this.helpers.formatCurrency(grandTotals.totalTax)}</strong></td>
          </tr>
      </tbody>
  </table>
  
  <div class="page-info">
    Rapport simplifié établi le ${this.helpers.formatShortDate()} à ${this.helpers.formatTime()}
  </div>
</div>`;
  }

  groupByRootCategory(groupEntries) {
    const rootCategories = {};

    groupEntries.forEach(([categoryKey, group]) => {
      const rootName = group.categoryInfo.path[0] || categoryKey;

      if (!rootCategories[rootName]) {
        rootCategories[rootName] = [];
      }

      rootCategories[rootName].push([categoryKey, group]);
    });

    console.log('🔥 Catégories racines regroupées:', Object.keys(rootCategories));
    return rootCategories;
  }

  buildSimplifiedRows(rootCategories) {
    return Object.entries(rootCategories)
      .map(([rootName, categories]) => {
        const totals = categories.reduce(
          (acc, [key, group]) => {
            acc.productCount += group.stats.productCount;
            acc.totalStock += group.stats.totalStock;
            acc.totalValue += group.stats.totalValue;
            acc.totalTax += group.stats.totalTax;
            return acc;
          },
          { productCount: 0, totalStock: 0, totalValue: 0, totalTax: 0 }
        );

        return `
<tr>
    <td><strong>${this.helpers.escapeHtml(rootName)}</strong></td>
    <td>${this.helpers.formatNumber(totals.productCount)}</td>
    <td>${this.helpers.formatNumber(totals.totalStock)}</td>
    <td class="currency-cell">${this.helpers.formatCurrency(totals.totalValue)}</td>
    <td class="currency-cell">${this.helpers.formatCurrency(totals.totalTax)}</td>
</tr>`;
      })
      .join('');
  }

  calculateGrandTotals(rootCategories) {
    return Object.values(rootCategories)
      .flat()
      .reduce(
        (acc, [key, group]) => {
          acc.productCount += group.stats.productCount;
          acc.totalStock += group.stats.totalStock;
          acc.totalValue += group.stats.totalValue;
          acc.totalTax += group.stats.totalTax;
          return acc;
        },
        { productCount: 0, totalStock: 0, totalValue: 0, totalTax: 0 }
      );
  }

  /**
   * Rendu détaillé des groupes de catégories
   */
  renderCategoryGroups(groupEntries) {
    const categoryGroups = groupEntries
      .map(([categoryKey, group]) => {
        return this.renderSingleCategoryGroup(categoryKey, group);
      })
      .join('');

    const finalTotal = this.renderFinalTotals(groupEntries);
    return categoryGroups + finalTotal;
  }

  renderSingleCategoryGroup(categoryKey, group) {
    const { categoryInfo, products, stats } = group;

    const productRows = products
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
    <td>${this.helpers.escapeHtml(this.truncateText(product.name || '', 45))}</td>
    <td>${this.helpers.formatCurrency(purchasePrice)}</td>
    <td>${this.helpers.formatCurrency(salePrice)}</td>
    <td>${this.helpers.formatNumber(stock)}</td>
    <td>${this.helpers.formatPercentage(taxRate)}</td>
    <td>${this.helpers.formatCurrency(stockValue)}</td>
    <td>${this.helpers.formatCurrency(taxAmount)}</td>
</tr>`;
      })
      .join('');

    return `
<div class="category-section">
  <div class="category-header">
      <h2 class="category-title">${this.helpers.escapeHtml(categoryInfo.path_string)}</h2>
      <div class="category-stats">
          <span class="stat-item"><strong>${this.helpers.formatNumber(stats.productCount)}</strong> produits</span>
          <span class="stat-item">Stock: <strong>${this.helpers.formatNumber(stats.totalStock)}</strong></span>
          <span class="stat-item">Valeur: <strong>${this.helpers.formatCurrency(stats.totalValue)}</strong></span>
          <span class="stat-item">TVA: <strong>${this.helpers.formatCurrency(stats.totalTax)}</strong></span>
      </div>
  </div>

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
          ${productRows}
          <tr class="totals-row">
              <td colspan="4"><strong>TOTAL ${this.helpers.escapeHtml(categoryInfo.name.toUpperCase())}</strong></td>
              <td><strong>${this.helpers.formatNumber(stats.totalStock)}</strong></td>
              <td>-</td>
              <td><strong>${this.helpers.formatCurrency(stats.totalValue)}</strong></td>
              <td><strong>${this.helpers.formatCurrency(stats.totalTax)}</strong></td>
          </tr>
      </tbody>
  </table>
  
  <div class="page-info">
    ${categoryInfo.name} • Rapport établi le ${this.helpers.formatShortDate()}
  </div>
</div>`;
  }

  renderFinalTotals(groupEntries) {
    const totalStock = groupEntries.reduce((sum, [key, group]) => sum + group.stats.totalStock, 0);
    const totalValue = groupEntries.reduce((sum, [key, group]) => sum + group.stats.totalValue, 0);
    const totalTax = groupEntries.reduce((sum, [key, group]) => sum + group.stats.totalTax, 0);

    return `
<div style="page-break-before: avoid; margin-top: 6mm;">
  <table class="data-table">
      <tbody>
          <tr class="final-totals-row">
              <td colspan="4"><strong>TOTAL GÉNÉRAL TOUTES CATÉGORIES</strong></td>
              <td><strong>${this.helpers.formatNumber(totalStock)}</strong></td>
              <td>-</td>
              <td><strong>${this.helpers.formatCurrency(totalValue)}</strong></td>
              <td><strong>${this.helpers.formatCurrency(totalTax)}</strong></td>
          </tr>
      </tbody>
  </table>
</div>`;
  }

  /**
   * Rendu du résumé des catégories
   */
  renderCategorySummary(stockStats, groupEntries, selectedCategories, isSimplified = false) {
    const selectedProductsCount = groupEntries.reduce((total, [key, group]) => {
      return total + group.stats.productCount;
    }, 0);

    const selectedInventoryValue = groupEntries.reduce((total, [key, group]) => {
      return total + group.stats.totalValue;
    }, 0);

    const selectedRetailValue = groupEntries.reduce((total, [key, group]) => {
      return (
        total +
        group.products.reduce((subTotal, product) => {
          const stock = product.stock || 0;
          const salePrice = product.price || 0;
          return subTotal + stock * salePrice;
        }, 0)
      );
    }, 0);

    const percentageProducts =
      stockStats.summary.products_in_stock > 0
        ? ((selectedProductsCount / stockStats.summary.products_in_stock) * 100).toFixed(1)
        : 0;

    const percentageValue =
      stockStats.financial.inventory_value > 0
        ? ((selectedInventoryValue / stockStats.financial.inventory_value) * 100).toFixed(1)
        : 0;

    const selectionMode = selectedCategories.length > 0;
    const reportTypeText = isSimplified ? ' (Version Simplifiée)' : '';
    const categoryText = groupEntries.length > 1 ? 'les catégories' : 'la catégorie';
    const selectionText = selectionMode ? 'sélectionnée(s)' : 'analysée(s)';

    return `
<section class="summary">
    <h3>Synthèse par Catégories${selectionMode ? ' (Sélection)' : ''}${reportTypeText}</h3>
    <p>
        Ce rapport présente <span class="highlight">${this.helpers.formatNumber(selectedProductsCount)} produits</span> 
        dans ${categoryText} ${selectionText}.
    </p>
    <p>
        Cette ${selectionMode ? 'sélection' : 'analyse'} représente <span class="highlight">${percentageProducts}%</span> du stock total 
        (${this.helpers.formatNumber(selectedProductsCount)} sur ${this.helpers.formatNumber(stockStats.summary.products_in_stock)} produits)
        pour une valeur de <span class="highlight">${this.helpers.formatCurrency(selectedInventoryValue)}</span> 
        soit <span class="highlight">${percentageValue}%</span> de la valeur totale du stock.
    </p>
    <p>
        Potentiel commercial total : <span class="highlight">${this.helpers.formatCurrency(selectedRetailValue)}</span> 
        (marge potentielle : <span class="highlight">${this.helpers.formatCurrency(selectedRetailValue - selectedInventoryValue)}</span>)
    </p>
    ${isSimplified ? this.renderSimplifiedNote() : ''}
    ${selectionMode ? this.renderSelectionNote(selectedCategories.length) : ''}
    <p style="margin-top: 6mm; font-size: 8pt; color: #666;">
        Rapport établi le ${this.helpers.formatShortDate()} à ${this.helpers.formatTime()} par APPPOS.
    </p>
</section>`;
  }

  renderSimplifiedNote() {
    return `
<p style="margin-top: 4mm; font-size: 9pt; color: #666; font-style: italic;">
    <strong>Mode simplifié :</strong> Ce rapport ne présente que les totaux par catégorie racine, sans le détail des produits individuels.
</p>`;
  }

  renderSelectionNote(selectedCategoriesCount) {
    return `
<p style="margin-top: 6mm; font-size: 8pt; color: #666; font-style: italic;">
    Note: Ce rapport ne présente que les catégories sélectionnées (${selectedCategoriesCount} sur le total disponible) et leurs sous-catégories.
</p>`;
  }

  /**
   * Rendu des éléments communs
   */
  renderHeader(title, selectedCategoriesCount = 0) {
    const subtitle =
      selectedCategoriesCount > 0
        ? `Généré le ${this.helpers.formatDate()} à ${this.helpers.formatTime()} • ${selectedCategoriesCount} catégorie(s) sélectionnée(s)`
        : `Généré le ${this.helpers.formatDate()} à ${this.helpers.formatTime()}`;

    return `
<header class="header">
    <h1>${this.helpers.escapeHtml(title)}</h1>
    <div class="subtitle">${this.helpers.escapeHtml(subtitle)}</div>
</header>`;
  }

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
</section>`;
  }

  /**
   * Styles CSS pour le mode simplifié
   */
  getSimplifiedStyles() {
    return `
.simplified-summary {
  margin-top: 6mm;
}

.simplified-table {
  font-size: 12pt;
  table-layout: fixed;
}

.simplified-table th,
.simplified-table td {
  padding: 3mm 2mm;
  text-align: center;
  word-wrap: break-word;
  overflow: hidden;
}

.simplified-table th:first-child,
.simplified-table td:first-child {
  text-align: left;
  width: 40%;
}

.simplified-table th:nth-child(2),
.simplified-table td:nth-child(2),
.simplified-table th:nth-child(3),
.simplified-table td:nth-child(3) {
  width: 15%;
}

.simplified-table th:nth-child(4),
.simplified-table td:nth-child(4),
.simplified-table th:nth-child(5),
.simplified-table td:nth-child(5) {
  width: 15%;
}

.simplified-table .currency-cell {
  font-family: 'Courier New', monospace;
  font-size: 11pt;
  white-space: nowrap;
  text-align: right;
}

.simplified-table .final-totals-row {
  background: #f0f0f0 !important;
  font-weight: bold;
  border-top: 3px solid #000 !important;
  font-size: 13pt;
}

.simplified-table .final-totals-row .currency-cell {
  font-size: 12pt;
  font-weight: bold;
}`;
  }

  /**
   * Méthodes utilitaires
   */
  findAllDescendants(allCategories, parentId) {
    const descendants = [];
    const directChildren = allCategories.filter((cat) => cat.parent_id === parentId);

    directChildren.forEach((child) => {
      descendants.push(child._id);
      const grandChildren = this.findAllDescendants(allCategories, child._id);
      descendants.push(...grandChildren);
    });

    return descendants;
  }

  findRootSelectedCategory(allCategories, categoryId, selectedCategories) {
    if (selectedCategories.includes(categoryId)) {
      return categoryId;
    }

    const category = allCategories.find((c) => c._id === categoryId);
    if (!category || !category.parent_id) {
      return null;
    }

    return this.findRootSelectedCategory(allCategories, category.parent_id, selectedCategories);
  }

  formatCategoryName(name) {
    if (!name || typeof name !== 'string') return name || 'Sans nom';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

module.exports = GroupedStockReportTemplate;
