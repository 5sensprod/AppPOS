// AppServe/templates/pdf/groupedStockReportTemplate.js

const TemplateHelpers = require('./helpers/templateHelpers');
const Category = require('../../models/Category');
const { buildCategoryPath } = require('../../utils/categoryHelpers');

class GroupedStockReportTemplate {
  constructor() {
    this.helpers = new TemplateHelpers();
  }

  /**
   * 🔥 MÉTHODE PRINCIPALE MANQUANTE - Point d'entrée
   */
  async generateGroupedStockReportHTML(stockStats, productsInStock, options = {}) {
    const {
      companyInfo = {},
      includeCompanyInfo = true,
      selectedCategories = [],
      includeUncategorized = true,
    } = options;

    // 🔥 AJOUT DU DEBUG
    console.log(`🚀 generateGroupedStockReportHTML appelée`);
    console.log(`📊 options.selectedCategories:`, selectedCategories);
    console.log(`📦 productsInStock.length:`, productsInStock.length);
    console.log(`🔧 includeUncategorized:`, includeUncategorized);

    try {
      // 🔥 DEBUG SUPPLÉMENTAIRE
      this.debugCategorySelection(selectedCategories, productsInStock);

      const groupedProducts = await this.groupProductsByCategory(
        productsInStock,
        selectedCategories,
        includeUncategorized
      );

      const groupEntries = Object.entries(groupedProducts);

      // 🔥 VÉRIFICATION FINALE
      console.log(
        `📋 Groupes créés pour le rendu:`,
        groupEntries.map(([key]) => key)
      );

      return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
          <meta charset="UTF-8">
          <title>Rapport de Stock par Catégories</title>
          <style>
              ${this.helpers.getStylesFor('grouped', { landscape: true })}
          </style>
      </head>
      <body>
          <div class="page">
              ${this.renderHeader('Rapport de Stock par Catégories', selectedCategories.length)}
              ${includeCompanyInfo ? this.renderCompanyInfo(companyInfo) : ''}
              
              <!-- 🔥 SYNTHÈSE EN PREMIÈRE PAGE -->
              ${this.renderCategorySummary(stockStats, groupEntries, selectedCategories)}
              
              <!-- 🔥 SAUT DE PAGE AVANT LES TABLES -->
              <div style="page-break-before: always;">
                  ${this.renderCategoryGroups(groupEntries)}
              </div>
          </div>
      </body>
      </html>
      `;
    } catch (error) {
      console.error('❌ Erreur génération rapport groupé:', error);
      console.error("❌ selectedCategories au moment de l'erreur:", selectedCategories);

      // Fallback vers le template standard
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
   * 🔥 MÉTHODE DE GROUPEMENT UNIQUE (suppression du doublon)
   */
  async groupProductsByCategory(products, selectedCategories = [], includeUncategorized = true) {
    console.log(`🏷️ DEBUT - Groupement par catégories`);
    console.log(`📂 selectedCategories reçues:`, selectedCategories);
    console.log(`📦 Nombre de produits à traiter:`, products.length);

    try {
      const allCategories = await Category.findAll();
      console.log(`📋 ${allCategories.length} catégories trouvées dans la base`);

      const categoryMap = {};
      allCategories.forEach((cat) => {
        categoryMap[cat._id] = {
          ...cat,
          name: this.formatCategoryName(cat.name || 'Sans nom'),
        };
      });

      const getCategoryPath = (categoryId) => {
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
      };

      const groupedProducts = {};
      const processedProductIds = new Set();

      // 🔥 ÉTAPE 1 : Si des catégories sont sélectionnées, étendre avec descendants
      let effectiveCategories = [];
      if (selectedCategories.length > 0) {
        console.log(`🎯 Mode SÉLECTION activé avec ${selectedCategories.length} catégories`);

        for (const selectedCatId of selectedCategories) {
          effectiveCategories.push(selectedCatId);
          const descendants = this.findAllDescendants(allCategories, selectedCatId);
          effectiveCategories.push(...descendants);
        }
        effectiveCategories = [...new Set(effectiveCategories)];
        console.log(`📈 Catégories effectives (avec descendants):`, effectiveCategories);
      } else {
        console.log(`📋 Mode COMPLET - toutes les catégories`);
        effectiveCategories = allCategories.map((c) => c._id);
      }

      // 🔥 ÉTAPE 2 : Traiter chaque produit
      products.forEach((product, index) => {
        const productCategories = product.categories || [];

        // Debug pour les premiers produits
        if (index < 3) {
          console.log(`🔍 Produit ${index + 1} "${product.name}":`, productCategories);
        }

        // 🔥 SI MODE SÉLECTION : ne garder que les produits dans les catégories effectives
        if (selectedCategories.length > 0) {
          const matchingCategories = productCategories.filter((catId) =>
            effectiveCategories.includes(catId)
          );

          if (matchingCategories.length === 0) {
            // Ce produit n'est dans aucune catégorie sélectionnée, on le skip
            return;
          }

          // Grouper par la catégorie racine sélectionnée
          matchingCategories.forEach((categoryId) => {
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
                    stats: { productCount: 0, totalStock: 0, totalValue: 0, totalTax: 0 },
                  };
                }

                // Éviter les doublons
                if (!groupedProducts[key].products.find((p) => p._id === product._id)) {
                  groupedProducts[key].products.push(product);
                }
              }
            }
          });

          processedProductIds.add(product._id);
        } else {
          // 🔥 MODE COMPLET : traiter toutes les catégories du produit
          if (productCategories.length > 0) {
            productCategories.forEach((categoryId) => {
              const categoryInfo = getCategoryPath(categoryId);
              if (categoryInfo) {
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
            });

            processedProductIds.add(product._id);
          }
        }
      });

      // 🔥 ÉTAPE 3 : Produits non catégorisés
      if (includeUncategorized) {
        let uncategorizedProducts;

        if (selectedCategories.length > 0) {
          // Mode sélection : produits sans catégorie ou pas dans la sélection
          uncategorizedProducts = products.filter((product) => {
            const hasNoCategories = !product.categories || product.categories.length === 0;
            if (hasNoCategories) return true;

            // Vérifier si le produit est dans une des catégories effectives
            return !product.categories.some((catId) => effectiveCategories.includes(catId));
          });
        } else {
          // Mode complet : seulement les vrais sans catégorie
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

      // 🔥 ÉTAPE 4 : Calcul des statistiques
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

      // 🔥 ÉTAPE 5 : Tri et résultat final
      const sortedGroups = Object.entries(groupedProducts)
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

      // 🔥 LOGS DE RÉSULTAT
      console.log(`✅ RÉSULTAT FINAL : ${Object.keys(sortedGroups).length} groupes créés`);
      console.log(`🔍 Mode sélection actif:`, selectedCategories.length > 0);
      Object.entries(sortedGroups).forEach(([key, group]) => {
        console.log(`  📂 "${key}": ${group.stats.productCount} produits`);
      });

      // 🔥 VÉRIFICATION : Si mode sélection et aucun groupe, il y a un problème
      if (selectedCategories.length > 0 && Object.keys(sortedGroups).length === 0) {
        console.warn(`⚠️  ATTENTION: Mode sélection mais aucun groupe créé !`);
        console.warn(`   - selectedCategories:`, selectedCategories);
        console.warn(`   - effectiveCategories:`, effectiveCategories);
        console.warn(
          `   - Produits avec catégories:`,
          products.filter((p) => p.categories?.length > 0).length
        );
      }

      return sortedGroups;
    } catch (error) {
      console.error('❌ Erreur groupement par catégories:', error);
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
  }

  /**
   * 🔥 MÉTHODE DE DEBUG
   */
  debugCategorySelection(selectedCategories, products) {
    console.log(`🐛 DEBUG - Sélection de catégories`);
    console.log(`📂 Catégories sélectionnées:`, selectedCategories);
    console.log(`📦 Nombre de produits:`, products.length);

    // Compter les produits par catégorie
    const categoryCount = {};
    products.forEach((product) => {
      if (product.categories) {
        product.categories.forEach((catId) => {
          categoryCount[catId] = (categoryCount[catId] || 0) + 1;
        });
      }
    });

    console.log(`📊 Répartition des produits par catégorie:`, categoryCount);

    // Vérifier si les catégories sélectionnées existent dans les produits
    selectedCategories.forEach((selectedCat) => {
      const count = categoryCount[selectedCat] || 0;
      console.log(`🎯 Catégorie "${selectedCat}": ${count} produits`);
    });
  }

  // 🔥 === MÉTHODES DE RENDU ===

  renderCategoryGroups(groupEntries) {
    const categoryGroups = groupEntries
      .map(([categoryKey, group]) => {
        return this.renderSingleCategoryGroup(categoryKey, group);
      })
      .join('');

    // Total général à la fin
    const finalTotal = `
    <div style="page-break-before: avoid; margin-top: 6mm;">
      <table class="data-table">
          <tbody>
              <tr class="final-totals-row">
                  <td colspan="4"><strong>TOTAL GÉNÉRAL TOUTES CATÉGORIES</strong></td>
                  <td><strong>${this.helpers.formatNumber(groupEntries.reduce((sum, [key, group]) => sum + group.stats.totalStock, 0))}</strong></td>
                  <td>-</td>
                  <td><strong>${this.helpers.formatCurrency(groupEntries.reduce((sum, [key, group]) => sum + group.stats.totalValue, 0))}</strong></td>
                  <td><strong>${this.helpers.formatCurrency(groupEntries.reduce((sum, [key, group]) => sum + group.stats.totalTax, 0))}</strong></td>
              </tr>
          </tbody>
      </table>
    </div>
    `;

    return categoryGroups + finalTotal;
  }

  renderSingleCategoryGroup(categoryKey, group) {
    const { categoryInfo, products, stats } = group;

    // Pour l'instant, tableau simple (vous pourrez ajouter la pagination plus tard)
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
      </tr>
      `;
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
    </div>
    `;
  }

  renderHeader(title, selectedCategoriesCount = 0) {
    const subtitle =
      selectedCategoriesCount > 0
        ? `Généré le ${this.helpers.formatDate()} à ${this.helpers.formatTime()} • ${selectedCategoriesCount} catégorie(s) sélectionnée(s)`
        : `Généré le ${this.helpers.formatDate()} à ${this.helpers.formatTime()}`;

    return `
    <header class="header">
        <h1>${this.helpers.escapeHtml(title)}</h1>
        <div class="subtitle">${this.helpers.escapeHtml(subtitle)}</div>
    </header>
    `;
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
    </section>
    `;
  }

  renderCategorySummary(stockStats, groupEntries, selectedCategories) {
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

    return `
    <section class="summary">
        <h3>Synthèse par Catégories${selectionMode ? ' (Sélection)' : ''}</h3>
        <p>
            Ce rapport présente <span class="highlight">${this.helpers.formatNumber(selectedProductsCount)} produits</span> 
            dans ${groupEntries.length > 1 ? 'les catégories' : 'la catégorie'} ${selectionMode ? 'sélectionnée(s)' : 'analysée(s)'}.
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
        ${
          selectionMode
            ? `
        <p style="margin-top: 6mm; font-size: 8pt; color: #666; font-style: italic;">
            Note: Ce rapport ne présente que les catégories sélectionnées (${selectedCategories.length} sur le total disponible) et leurs sous-catégories.
        </p>
        `
            : ''
        }
        <p style="margin-top: 6mm; font-size: 8pt; color: #666;">
            Rapport établi le ${this.helpers.formatShortDate()} à ${this.helpers.formatTime()} par APPPOS.
        </p>
    </section>
    `;
  }

  // === MÉTHODES UTILITAIRES ===

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
