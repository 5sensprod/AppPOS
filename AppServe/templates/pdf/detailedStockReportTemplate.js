// AppServe/templates/pdf/detailedStockReportTemplate.js

const TemplateHelpers = require('./helpers/templateHelpers');
const Category = require('../../models/Category');
const { buildCategoryPath } = require('../../utils/categoryHelpers'); // 🔥 Utilisation des helpers

class DetailedStockReportTemplate {
  constructor() {
    this.helpers = new TemplateHelpers();
  }

  /**
   * Génère le HTML complet du rapport de stock détaillé
   * @param {Object} stockStats - Statistiques de stock
   * @param {Array} productsInStock - Produits en stock
   * @param {Object} options - Options du rapport
   * @returns {string} - HTML complet
   */
  async generateDetailedStockReportHTML(stockStats, productsInStock, options = {}) {
    const {
      companyInfo = {},
      includeCompanyInfo = true,
      groupByCategory = false,
      selectedCategories = [],
      includeUncategorized = true,
    } = options;

    // Si groupement par catégorie demandé, générer le rapport groupé
    if (groupByCategory) {
      return await this.generateCategoryGroupedReportHTML(stockStats, productsInStock, options);
    }

    // Sinon, générer le rapport standard
    return this.generateStandardDetailedReportHTML(stockStats, productsInStock, options);
  }

  /**
   * Génère le rapport détaillé standard (sans groupement)
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
            ${this.getDetailedStyles()}
        </style>
    </head>
    <body>
        <div class="page">
            ${this.renderHeader('Rapport de Stock Détaillé')}
            ${includeCompanyInfo ? this.renderCompanyInfo(companyInfo) : ''}
            ${this.renderProductsTable(productsInStock, stockStats)}
        </div>
    </body>
    </html>
    `;
  }

  renderCompactHeader(title, selectedCategoriesCount = 0) {
    const subtitle =
      selectedCategoriesCount > 0
        ? `Généré le ${this.helpers.formatDate()} à ${this.helpers.formatTime()} • ${selectedCategoriesCount} catégorie(s) sélectionnée(s)`
        : `Généré le ${this.helpers.formatDate()} à ${this.helpers.formatTime()}`;

    return `
  <header class="header">
      <h1>${title}</h1>
      <div class="subtitle">${subtitle}</div>
  </header>
  `;
  }

  renderCompactCompanyInfo(companyInfo) {
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

  renderCompactCategoryGroups(groupEntries) {
    return (
      groupEntries
        .map(([categoryKey, group]) => {
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
            <td>${this.helpers.escapeHtml((product.name || '').substring(0, 50))}${(product.name || '').length > 50 ? '...' : ''}</td>
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
      <!-- 🔥 EN-TÊTE DE CATÉGORIE SOBRE -->
      <div class="category-header-simple">
          <h2 class="category-title-simple">${this.helpers.escapeHtml(categoryInfo.path_string)}</h2>
          <div class="category-stats-simple">
              <span class="stat-simple"><strong>${this.helpers.formatNumber(stats.productCount)}</strong> produits</span>
              <span class="stat-simple">Stock total: <strong>${this.helpers.formatNumber(stats.totalStock)}</strong></span>
              <span class="stat-simple">Valeur: <strong>${this.helpers.formatCurrency(stats.totalValue)}</strong></span>
              <span class="stat-simple">TVA: <strong>${this.helpers.formatCurrency(stats.totalTax)}</strong></span>
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
    `;
        })
        .join('') +
      `
    
    <!-- 🔥 TOTAL GÉNÉRAL (une seule fois à la fin) -->
    <table class="data-table">
        <tbody>
            <tr class="final-totals-row">
                <td colspan="4"><strong>TOTAL GÉNÉRAL</strong></td>
                <td><strong>${groupEntries.reduce((sum, [key, group]) => sum + group.stats.totalStock, 0)}</strong></td>
                <td>-</td>
                <td><strong>${this.helpers.formatCurrency(groupEntries.reduce((sum, [key, group]) => sum + group.stats.totalValue, 0))}</strong></td>
                <td><strong>${this.helpers.formatCurrency(groupEntries.reduce((sum, [key, group]) => sum + group.stats.totalTax, 0))}</strong></td>
            </tr>
        </tbody>
    </table>
    `
    );
  }

  renderCompactCategorySummary(stockStats, groupEntries, selectedCategories) {
    // Calculs des données sélectionnées
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

    // Calculs des pourcentages
    const percentageProducts =
      stockStats.summary.products_in_stock > 0
        ? ((selectedProductsCount / stockStats.summary.products_in_stock) * 100).toFixed(1)
        : 0;

    const percentageValue =
      stockStats.financial.inventory_value > 0
        ? ((selectedInventoryValue / stockStats.financial.inventory_value) * 100).toFixed(1)
        : 0;

    // Noms des catégories
    const categoryNames = groupEntries.map(([key, group]) => group.categoryInfo.name).join(', ');

    return `
  <section class="summary">
      <h3>Synthèse par Catégories</h3>
      <p>
          Ce rapport présente <span class="highlight">${this.helpers.formatNumber(selectedProductsCount)} produits</span> 
          dans ${groupEntries.length > 1 ? 'les catégories' : 'la catégorie'} : <span class="highlight">${categoryNames}</span>.
      </p>
      <p>
          Cette sélection représente <span class="highlight">${percentageProducts}%</span> du stock total 
          (${this.helpers.formatNumber(selectedProductsCount)} sur ${this.helpers.formatNumber(stockStats.summary.products_in_stock)} produits)
          pour une valeur de <span class="highlight">${this.helpers.formatCurrency(selectedInventoryValue)}</span> 
          soit <span class="highlight">${percentageValue}%</span> de la valeur totale du stock.
      </p>
      <p>
          Potentiel commercial total : <span class="highlight">${this.helpers.formatCurrency(selectedRetailValue)}</span> 
          (marge potentielle : <span class="highlight">${this.helpers.formatCurrency(selectedRetailValue - selectedInventoryValue)}</span>)
      </p>
      ${
        selectedCategories.length > 0
          ? `
      <p style="margin-top: 6mm; font-size: 9pt; color: #666; font-style: italic;">
          Note: Ce rapport ne présente que les catégories sélectionnées (${selectedCategories.length} sur le total disponible) et leurs sous-catégories.
      </p>
      `
          : ''
      }
      <p style="margin-top: 6mm; font-size: 9pt; color: #666;">
          Rapport établi le ${this.helpers.formatShortDate()} à ${this.helpers.formatTime()} 
          par le système APPPOS.
      </p>
  </section>
  `;
  }

  getCompactCategoryStyles() {
    return `
  ${this.helpers.getAllStyles()}

  /* 🔥 BODY OPTIMISÉ POUR DÉMARRER DIRECTEMENT */
  body { 
    padding: 0;
    margin: 0;
    padding-top: 8mm;  /* Très réduit */
    padding-left: 6mm;
    padding-right: 6mm;
    padding-bottom: 8mm;
    font-size: 10pt;   /* Taille normale */
  }

  /* 🔥 EN-TÊTE MINIMAL */
  .header {
    border-bottom: 2px solid #3b82f6;
    padding-bottom: 4mm;  /* Très réduit */
    margin-bottom: 6mm;   /* Très réduit */
  }

  .header h1 {
    font-size: 20pt;      /* Réduit de 28pt à 20pt */
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 2mm;   /* Réduit */
    letter-spacing: -0.5px;
  }

  .header .subtitle {
    font-size: 10pt;      /* Réduit de 12pt à 10pt */
    color: #6b7280;
    font-weight: 400;
  }

  /* 🔥 INFORMATIONS ENTREPRISE COMPACTES */
  .company-info {
    background: #f9fafb;
    border-left: 3px solid #3b82f6;
    padding: 4mm;         /* Réduit de 8mm à 4mm */
    margin-bottom: 6mm;   /* Réduit de 8mm à 6mm */
    page-break-inside: avoid;
  }

  .company-name {
    font-size: 14pt;      /* Réduit de 16pt à 14pt */
    font-weight: 600;
    margin-bottom: 2mm;   /* Réduit de 3mm à 2mm */
    color: #1f2937;
  }

  .company-details {
    font-size: 9pt;
    color: #4b5563;
    line-height: 1.4;
  }

  /* 🔥 EN-TÊTES DE CATÉGORIES SOBRES (comme stockReportTemplate) */
  .category-header-simple {
    background: #f8fafc;
    border-left: 4px solid #3b82f6;
    border-bottom: 1px solid #e5e7eb;
    padding: 3mm 4mm;     /* Compact */
    margin-bottom: 2mm;   /* Très réduit */
    margin-top: 6mm;      /* Espace entre catégories */
    page-break-inside: avoid;
  }

  .category-title-simple {
    font-size: 12pt;      /* Sobre */
    font-weight: 600;     /* Pas trop gras */
    margin: 0;
    margin-bottom: 2mm;
    color: #1f2937;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
  }

  .category-stats-simple {
    font-size: 9pt;
    color: #4b5563;
    display: flex;
    gap: 8mm;
    flex-wrap: wrap;
  }

  .stat-simple {
    /* Style simple sans fond coloré */
  }

  /* 🔥 TABLEAUX STANDARD (comme stockReportTemplate) */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4mm;   /* Réduit */
    font-size: 8pt;       /* Compact mais lisible */
  }

  .data-table th {
    background: #e5e7eb;  /* Gris sobre */
    border: 1px solid #9ca3af;
    padding: 2mm 1.5mm;   /* Compact */
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
    border: 1px solid #d1d5db;
    padding: 1.5mm 1mm;   /* Compact */
    text-align: right;
    vertical-align: middle;
  }

  .data-table td:first-child,
  .data-table td:nth-child(2) {
    text-align: left;
  }

  .data-table tbody tr:nth-child(even) {
    background: #f9fafb;
  }

  /* 🔥 LIGNES DE TOTAUX */
  .totals-row {
    background: #e5e7eb !important;
    font-weight: bold;
    border-top: 2px solid #374151 !important;
  }

  .final-totals-row {
    background: #d1d5db !important;
    font-weight: bold;
    border-top: 3px solid #1f2937 !important;
    font-size: 9pt;
  }

  /* 🔥 SECTION SYNTHÈSE (comme stockReportTemplate) */
  .summary {
    border: 2px solid #3b82f6;
    padding: 6mm;         /* Réduit de 8mm à 6mm */
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

  /* 🔥 OPTIMISATION D'IMPRESSION */
  @page { 
    size: A4 landscape; 
    margin: 10mm 8mm;    /* Marges minimales */
  }

  /* 🔥 PAS DE SAUT DE PAGE ENTRE CATÉGORIES */
  .category-header-simple {
    page-break-before: avoid;
  }

  .category-header-simple + .data-table {
    page-break-before: avoid;
  }
  `;
  }
  /**
   * Génère le rapport détaillé groupé par catégories
   */
  async generateCategoryGroupedReportHTML(stockStats, productsInStock, options = {}) {
    const {
      companyInfo = {},
      includeCompanyInfo = true,
      selectedCategories = [],
      includeUncategorized = true,
    } = options;

    try {
      // Grouper les produits par catégorie
      const groupedProducts = await this.groupProductsByCategory(
        productsInStock,
        selectedCategories,
        includeUncategorized
      );

      const groupEntries = Object.entries(groupedProducts);

      return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Rapport de Stock par Catégories</title>
        <style>
            ${this.getCategoryGroupedStyles()}  
            <!-- 🔥 CORRIGÉ: getCategoryGroupedStyles() au lieu de getCompactCategoryStyles() -->
        </style>
    </head>
    <body>
        <div class="page">
            ${this.renderCompactHeader('Rapport de Stock par Catégories', selectedCategories.length)}
            ${includeCompanyInfo ? this.renderCompactCompanyInfo(companyInfo) : ''}
            ${this.renderCompactCategoryGroups(groupEntries)}
            ${this.renderCompactCategorySummary(stockStats, groupEntries, selectedCategories)}
        </div>
    </body>
    </html>
    `;
    } catch (error) {
      console.error('❌ Erreur génération rapport groupé:', error);
      return this.generateStandardDetailedReportHTML(stockStats, productsInStock, options);
    }
  }

  /**
   * 🔥 NOUVELLE VERSION : Groupe les produits par catégorie avec hiérarchie
   * @param {Array} products - Liste des produits
   * @param {Array} selectedCategories - Catégories sélectionnées
   * @param {boolean} includeUncategorized - Inclure les produits sans catégorie
   * @returns {Object} - Produits groupés par catégorie
   */
  async groupProductsByCategory(products, selectedCategories = [], includeUncategorized = true) {
    console.log(`🏷️ Groupement par catégories: ${selectedCategories.length} sélectionnées`);
    console.log(`📂 Catégories sélectionnées:`, selectedCategories);

    try {
      // Récupérer toutes les catégories pour construire les chemins
      const allCategories = await Category.findAll();
      console.log(`📋 ${allCategories.length} catégories trouvées dans la base`);

      // 🔥 ÉTAPE 1: Si des catégories sont sélectionnées, trouver TOUTES leurs descendants
      let effectiveCategories = [];

      if (selectedCategories.length > 0) {
        console.log(`🔍 Recherche des descendants pour les catégories sélectionnées...`);

        // Pour chaque catégorie sélectionnée, inclure elle-même ET tous ses descendants
        for (const selectedCatId of selectedCategories) {
          // Ajouter la catégorie elle-même
          effectiveCategories.push(selectedCatId);

          // Trouver tous ses descendants
          const descendants = this.findAllDescendants(allCategories, selectedCatId);
          effectiveCategories.push(...descendants);
        }

        // Supprimer les doublons
        effectiveCategories = [...new Set(effectiveCategories)];

        console.log(
          `📈 Categories effectives (avec descendants): ${effectiveCategories.length}`,
          effectiveCategories
        );
      } else {
        // Si aucune catégorie sélectionnée, utiliser toutes les catégories
        effectiveCategories = allCategories.map((c) => c._id);
        console.log(`📊 Toutes les catégories utilisées: ${effectiveCategories.length}`);
      }

      // Créer un map des catégories pour un accès rapide
      const categoryMap = {};
      allCategories.forEach((cat) => {
        categoryMap[cat._id] = {
          ...cat,
          name: this.formatCategoryName(cat.name || 'Sans nom'),
        };
      });

      const groupedProducts = {};
      const processedProductIds = new Set();

      // Fonction pour obtenir le chemin formaté d'une catégorie
      const getCategoryPath = (categoryId) => {
        if (!categoryId || !categoryMap[categoryId]) return null;

        try {
          const pathInfo = buildCategoryPath(allCategories, categoryId); // 🔥 Utilisation des helpers
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
      };

      // 🔥 ÉTAPE 2: Traiter chaque produit
      console.log(`🔄 Traitement de ${products.length} produits...`);

      products.forEach((product, index) => {
        const productCategories = product.categories || [];

        if (index < 5) {
          // Debug pour les 5 premiers produits
          console.log(
            `🎹 Produit "${product.name}": catégories = [${productCategories.join(', ')}]`
          );
        }

        // Filtrer les catégories du produit selon la sélection effective
        let categoriesToProcess = productCategories;
        if (selectedCategories.length > 0) {
          categoriesToProcess = productCategories.filter((catId) =>
            effectiveCategories.includes(catId)
          );

          if (index < 5 && productCategories.length > 0) {
            console.log(`  └─ Catégories retenues: [${categoriesToProcess.join(', ')}]`);
          }
        }

        if (categoriesToProcess.length > 0) {
          // Pour chaque catégorie du produit, l'ajouter au groupe de sa catégorie racine sélectionnée
          categoriesToProcess.forEach((categoryId) => {
            // 🔥 Trouver la catégorie racine sélectionnée pour cette catégorie
            const rootSelectedCategory = this.findRootSelectedCategory(
              allCategories,
              categoryId,
              selectedCategories
            );

            if (rootSelectedCategory) {
              const categoryInfo = getCategoryPath(rootSelectedCategory);
              if (categoryInfo) {
                const key = categoryInfo.path_string;

                if (!groupedProducts[key]) {
                  groupedProducts[key] = {
                    categoryInfo,
                    products: [],
                    stats: {
                      productCount: 0,
                      totalStock: 0,
                      totalValue: 0,
                      totalTax: 0,
                    },
                  };
                }

                // Éviter les doublons
                if (!groupedProducts[key].products.find((p) => p._id === product._id)) {
                  groupedProducts[key].products.push(product);

                  if (index < 5) {
                    console.log(`  └─ Ajouté au groupe: "${key}"`);
                  }
                }
              }
            }
          });

          processedProductIds.add(product._id);
        }
      });

      console.log(`✅ Produits traités: ${processedProductIds.size}/${products.length}`);

      // 🔥 ÉTAPE 3: Ajouter les produits sans catégorie si demandé
      if (includeUncategorized) {
        const uncategorizedProducts = products.filter((product) => {
          const hasNoCategories = !product.categories || product.categories.length === 0;
          const notProcessed = !processedProductIds.has(product._id);

          // Si des catégories sont sélectionnées, ne prendre que les non-catégorisés
          if (selectedCategories.length > 0) {
            return hasNoCategories;
          }

          // Sinon, prendre ceux non traités
          return notProcessed || hasNoCategories;
        });

        if (uncategorizedProducts.length > 0) {
          groupedProducts['Sans catégorie'] = {
            categoryInfo: {
              id: null,
              name: 'Sans catégorie',
              path: ['Sans catégorie'],
              path_string: 'Sans catégorie',
              level: 0,
            },
            products: uncategorizedProducts,
            stats: {
              productCount: 0,
              totalStock: 0,
              totalValue: 0,
              totalTax: 0,
            },
          };

          console.log(`📂 Ajout de ${uncategorizedProducts.length} produits sans catégorie`);
        }
      }

      // Calculer les statistiques pour chaque groupe
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

      // Trier les groupes par niveau de catégorie puis par nom
      const sortedGroups = Object.entries(groupedProducts)
        .sort(([aKey, aGroup], [bKey, bGroup]) => {
          // D'abord par niveau (parents avant enfants)
          const levelDiff = aGroup.categoryInfo.level - bGroup.categoryInfo.level;
          if (levelDiff !== 0) return levelDiff;

          // Puis par nom alphabétique
          return aKey.localeCompare(bKey, 'fr');
        })
        .reduce((acc, [key, group]) => {
          acc[key] = group;
          return acc;
        }, {});

      console.log(`✅ ${Object.keys(sortedGroups).length} groupes de catégories créés`);

      // Debug des groupes créés
      Object.entries(sortedGroups).forEach(([key, group]) => {
        console.log(`📊 Groupe "${key}": ${group.products.length} produits`);
      });

      return sortedGroups;
    } catch (error) {
      console.error('❌ Erreur groupement par catégories:', error);
      // En cas d'erreur, retourner tous les produits dans un groupe unique
      return {
        'Tous les produits': {
          categoryInfo: {
            id: null,
            name: 'Tous les produits',
            path: ['Tous les produits'],
            path_string: 'Tous les produits',
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
  }

  /**
   * 🔥 NOUVELLE FONCTION: Trouve tous les descendants d'une catégorie
   * @param {Array} allCategories - Toutes les catégories
   * @param {string} parentId - ID de la catégorie parent
   * @returns {Array} - Liste des IDs des descendants
   */
  findAllDescendants(allCategories, parentId) {
    const descendants = [];

    // Trouver les enfants directs
    const directChildren = allCategories.filter((cat) => cat.parent_id === parentId);

    directChildren.forEach((child) => {
      descendants.push(child._id);
      // Récursion pour trouver les descendants des enfants
      const grandChildren = this.findAllDescendants(allCategories, child._id);
      descendants.push(...grandChildren);
    });

    return descendants;
  }

  /**
   * 🔥 NOUVELLE FONCTION: Trouve la catégorie racine sélectionnée pour une catégorie donnée
   * @param {Array} allCategories - Toutes les catégories
   * @param {string} categoryId - ID de la catégorie
   * @param {Array} selectedCategories - Catégories sélectionnées
   * @returns {string|null} - ID de la catégorie racine sélectionnée
   */
  findRootSelectedCategory(allCategories, categoryId, selectedCategories) {
    // Si la catégorie elle-même est sélectionnée, la retourner
    if (selectedCategories.includes(categoryId)) {
      return categoryId;
    }

    // Sinon, remonter la hiérarchie jusqu'à trouver une catégorie sélectionnée
    const category = allCategories.find((c) => c._id === categoryId);
    if (!category || !category.parent_id) {
      return null;
    }

    return this.findRootSelectedCategory(allCategories, category.parent_id, selectedCategories);
  }

  /**
   * Formate le nom d'une catégorie
   */
  formatCategoryName(name) {
    if (!name || typeof name !== 'string') return name || 'Sans nom';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  /**
   * Génère l'en-tête du rapport
   */
  renderHeader(title, selectedCategoriesCount = 0) {
    const subtitle =
      selectedCategoriesCount > 0
        ? `Généré le ${this.helpers.formatDate()} à ${this.helpers.formatTime()} • ${selectedCategoriesCount} catégorie(s) sélectionnée(s)`
        : `Généré le ${this.helpers.formatDate()} à ${this.helpers.formatTime()}`;

    return `
    <header class="header">
        <h1>${title}</h1>
        <div class="subtitle">${subtitle}</div>
    </header>
    `;
  }

  /**
   * Génère la section des informations entreprise
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
   * Génère le tableau des produits pour le rapport standard
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
            <td>${this.helpers.escapeHtml((product.name || '').substring(0, 50))}${(product.name || '').length > 50 ? '...' : ''}</td>
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
    <table class="products-table">
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
   * Génère les groupes de catégories
   */
  renderCategoryGroups(groupEntries) {
    return groupEntries
      .map(([categoryKey, group]) => {
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
            <td>${this.helpers.escapeHtml((product.name || '').substring(0, 50))}${(product.name || '').length > 50 ? '...' : ''}</td>
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
      <section class="category-section">
          <!-- 🔥 NOUVEAU: En-tête compact harmonisé -->
          <div class="category-header-compact">
              <h3 class="category-title-compact">${this.helpers.escapeHtml(categoryInfo.path_string)}</h3>
              <div class="category-stats-inline">
                  <span class="stat-compact">${this.helpers.formatNumber(stats.productCount)} produits</span>
                  <span class="stat-compact">Stock: ${this.helpers.formatNumber(stats.totalStock)}</span>
                  <span class="stat-compact">Valeur: ${this.helpers.formatCurrency(stats.totalValue)}</span>
                  <span class="stat-compact">TVA: ${this.helpers.formatCurrency(stats.totalTax)}</span>
              </div>
          </div>

          <table class="products-table">
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
                  <tr class="category-totals-row">
                      <td colspan="4"><strong>TOTAL ${this.helpers.escapeHtml(categoryInfo.name.toUpperCase())}</strong></td>
                      <td><strong>${this.helpers.formatNumber(stats.totalStock)}</strong></td>
                      <td>-</td>
                      <td><strong>${this.helpers.formatCurrency(stats.totalValue)}</strong></td>
                      <td><strong>${this.helpers.formatCurrency(stats.totalTax)}</strong></td>
                  </tr>
              </tbody>
          </table>
      </section>
    `;
      })
      .join('');
  }

  /**
   * Génère les totaux finaux
   */
  renderFinalTotals(productsInStock, stockStats) {
    return `
    <table class="products-table">
        <tbody>
            <tr class="final-totals-row">
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
   * Génère le résumé pour le rapport par catégories
   */
  /**
   * 🔥 FONCTION CORRIGÉE: Génère le résumé pour le rapport par catégories
   */
  renderCategorySummary(stockStats, groupEntries, selectedCategories) {
    // 🔥 CALCUL CORRECT: Utiliser les données des groupes sélectionnés
    const selectedProductsCount = groupEntries.reduce((total, [key, group]) => {
      return total + group.stats.productCount;
    }, 0);

    const selectedInventoryValue = groupEntries.reduce((total, [key, group]) => {
      return total + group.stats.totalValue;
    }, 0);

    const selectedTaxAmount = groupEntries.reduce((total, [key, group]) => {
      return total + group.stats.totalTax;
    }, 0);

    // 🔥 CALCUL DU POTENTIEL COMMERCIAL pour les catégories sélectionnées
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

    // 🔥 CALCUL DES POURCENTAGES par rapport au total
    const percentageProducts =
      stockStats.summary.products_in_stock > 0
        ? ((selectedProductsCount / stockStats.summary.products_in_stock) * 100).toFixed(1)
        : 0;

    const percentageValue =
      stockStats.financial.inventory_value > 0
        ? ((selectedInventoryValue / stockStats.financial.inventory_value) * 100).toFixed(1)
        : 0;

    // 🔥 CONSTRUCTION DES NOMS DES CATÉGORIES
    const categoryNames = groupEntries.map(([key, group]) => group.categoryInfo.name).join(', ');

    const noteText =
      selectedCategories.length > 0
        ? `<br><br><em>Note: Ce rapport ne présente que les catégories sélectionnées (${selectedCategories.length} sur le total disponible) et leurs sous-catégories.</em>`
        : '';

    return `
  <section class="summary-section">
      <div class="summary-title">Synthèse par Catégories</div>
      <div class="summary-content">
          Ce rapport présente <strong>${this.helpers.formatNumber(selectedProductsCount)} produits</strong> 
          dans ${groupEntries.length > 1 ? 'les catégories' : 'la catégorie'} : <strong>${categoryNames}</strong>.
          <br><br>
          Cette sélection représente <strong>${percentageProducts}%</strong> du stock total 
          (${this.helpers.formatNumber(selectedProductsCount)} sur ${this.helpers.formatNumber(stockStats.summary.products_in_stock)} produits)
          pour une valeur de <strong>${this.helpers.formatCurrency(selectedInventoryValue)}</strong> 
          soit <strong>${percentageValue}%</strong> de la valeur totale du stock.
          <br><br>
          Potentiel commercial total : <strong>${this.helpers.formatCurrency(selectedRetailValue)}</strong> 
          (marge potentielle : <strong>${this.helpers.formatCurrency(selectedRetailValue - selectedInventoryValue)}</strong>)
          ${noteText}
      </div>
  </section>
  `;
  }

  /**
   * Génère le template d'en-tête pour Puppeteer
   */
  getHeaderTemplate(companyInfo) {
    return `
    <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin-top: 10px;">
      ${this.helpers.escapeHtml(companyInfo.name || 'Rapport de Stock Détaillé')} - Page <span class="pageNumber"></span> sur <span class="totalPages"></span>
    </div>
    `;
  }

  /**
   * Génère le template de pied de page pour Puppeteer
   */
  getFooterTemplate() {
    return `
    <div style="font-size: 9px; color: #999; text-align: center; width: 100%; margin-bottom: 10px;">
      Rapport généré automatiquement par APPPOS - ${this.helpers.formatShortDate()}
    </div>
    `;
  }

  /**
   * Génère les styles CSS pour le rapport détaillé standard
   */
  getDetailedStyles() {
    return `
    ${this.helpers.getAllStyles()}
    
    body { 
      padding: 0;
      margin: 0;
      padding-top: 20mm;
      padding-left: 8mm;
      padding-right: 8mm;
      padding-bottom: 10mm;
    }
    
    .company-info { 
      background: #f9fafb; 
      border-left: 4px solid #3b82f6; 
      padding: 8mm; 
      margin-bottom: 8mm; 
      page-break-inside: avoid;
    }
    
    .company-name { 
      font-size: 14pt; 
      font-weight: 600; 
      margin-bottom: 3mm; 
    }
    
    .products-table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 8pt; 
      margin-top: 10mm;
      margin-bottom: 10mm;
    }
    
    .products-table th { 
      background: #374151; 
      color: white; 
      padding: 3mm 2mm; 
      text-align: center; 
      font-weight: 600; 
      font-size: 7pt; 
      border: 1px solid #4b5563; 
    }
    
    .products-table th:first-child, 
    .products-table th:nth-child(2) { 
      text-align: left; 
    }
    
    .products-table td { 
      border: 1px solid #d1d5db; 
      padding: 2mm; 
      text-align: right; 
    }
    
    .products-table td:first-child, 
    .products-table td:nth-child(2) { 
      text-align: left; 
    }
    
    .products-table tbody tr:nth-child(even) { 
      background: #f9fafb; 
    }
    
    .totals-row { 
      background: #e5e7eb !important; 
      font-weight: bold; 
      border-top: 2px solid #374151 !important; 
    }
    
    @page { 
      size: A4 landscape; 
      margin: 15mm 10mm;
    }
    `;
  }

  /**
   * Génère les styles CSS pour le rapport groupé par catégories
   */
  getCategoryGroupedStyles() {
    return `
  ${this.getDetailedStyles()}

  /* 🔥 RÉDUCTION DES MARGES GÉNÉRALES */
  body { 
    padding: 0;
    margin: 0;
    padding-top: 15mm; /* Réduit de 20mm à 15mm */
    padding-left: 6mm;  /* Réduit de 8mm à 6mm */
    padding-right: 6mm;
    padding-bottom: 8mm; /* Réduit de 10mm à 8mm */
    font-size: 9pt; /* Réduit la police de base */
  }

  /* 🔥 EN-TÊTE COMPACT HARMONISÉ */
  .category-section {
    margin-bottom: 8mm; /* Réduit de 15mm à 8mm */
    page-break-inside: avoid;
  }

  .category-header-compact {
    background: #374151; /* Style sobre comme stockReportTemplate */
    color: white;
    padding: 3mm 5mm; /* Réduit le padding */
    margin-bottom: 2mm; /* Réduit l'espace */
    border-radius: 0; /* Style carré plus professionnel */
    border-left: 4px solid #3b82f6; /* Accent bleu */
    page-break-inside: avoid;
  }

  .category-title-compact {
    font-size: 12pt; /* Réduit de 16pt à 12pt */
    font-weight: 700;
    margin: 0;
    margin-bottom: 2mm;
  }

  .category-stats-inline {
    font-size: 8pt; /* Réduit la taille */
    display: flex;
    gap: 8mm; /* Espacement réduit */
    flex-wrap: wrap;
    opacity: 0.9;
  }

  .stat-compact {
    background: rgba(255, 255, 255, 0.1);
    padding: 1mm 2mm;
    border-radius: 2mm;
    font-weight: 500;
  }

  /* 🔥 TABLEAUX PLUS COMPACTS */
  .products-table { 
    width: 100%; 
    border-collapse: collapse; 
    font-size: 7pt; /* Réduit de 8pt à 7pt */
    margin-top: 2mm; /* Réduit de 10mm à 2mm */
    margin-bottom: 5mm; /* Réduit de 10mm à 5mm */
  }

  .products-table th { 
    background: #374151; 
    color: white; 
    padding: 2mm 1.5mm; /* Réduit le padding */
    text-align: center; 
    font-weight: 600; 
    font-size: 6pt; /* Encore plus petit pour les en-têtes */
    border: 1px solid #4b5563; 
  }

  .products-table td { 
    border: 1px solid #d1d5db; 
    padding: 1.5mm 1mm; /* Réduit le padding */
    text-align: right; 
    font-size: 7pt;
  }

  /* 🔥 SECTION SYNTHÈSE PLUS COMPACTE */
  .summary-section {
    background: #f0f9ff;
    border: 1px solid #3b82f6; /* Bordure plus fine */
    border-radius: 3mm;
    padding: 5mm; /* Réduit de 8mm à 5mm */
    margin-top: 5mm; /* Réduit de 10mm à 5mm */
    page-break-inside: avoid;
  }

  .summary-title {
    font-size: 12pt; /* Réduit de 14pt à 12pt */
    font-weight: 700;
    color: #1e40af;
    margin-bottom: 3mm; /* Réduit de 5mm à 3mm */
    text-align: center;
  }

  .summary-content {
    font-size: 9pt; /* Réduit de 10pt à 9pt */
    line-height: 1.4; /* Réduit l'interlignage */
    text-align: justify;
  }

  /* 🔥 INFORMATIONS ENTREPRISE COMPACTES */
  .company-info { 
    background: #f9fafb; 
    border-left: 3px solid #3b82f6; /* Réduit de 4px à 3px */
    padding: 5mm; /* Réduit de 8mm à 5mm */
    margin-bottom: 5mm; /* Réduit de 8mm à 5mm */
    page-break-inside: avoid;
  }

  .company-name { 
    font-size: 12pt; /* Réduit de 14pt à 12pt */
    font-weight: 600; 
    margin-bottom: 2mm; /* Réduit de 3mm à 2mm */
  }

  /* 🔥 OPTIMISATION IMPRESSION */
  @page { 
    size: A4 landscape; 
    margin: 12mm 8mm; /* Marges réduites */
  }

  /* 🔥 ÉVITER LES COUPURES DE PAGE */
  .category-section {
    page-break-inside: avoid;
  }

  .category-header-compact + .products-table {
    page-break-before: avoid;
  }

  .final-totals-row { 
    background: #d1d5db !important; 
    font-weight: bold; 
    border-top: 2px solid #1f2937 !important;
    font-size: 8pt; /* Taille réduite */
  }
  `;
  }
}

module.exports = DetailedStockReportTemplate;
