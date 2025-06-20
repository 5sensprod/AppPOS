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
      // 🔥 Grouper les produits par catégorie avec prise en compte de la hiérarchie
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
          </style>
      </head>
      <body>
          <div class="page">
              ${this.renderHeader('Rapport de Stock par Catégories', selectedCategories.length)}
              ${includeCompanyInfo ? this.renderCompanyInfo(companyInfo) : ''}
              ${this.renderCategoryGroups(groupEntries)}
              ${this.renderFinalTotals(productsInStock, stockStats)}
              ${this.renderCategorySummary(stockStats, groupEntries, selectedCategories)}
          </div>
      </body>
      </html>
      `;
    } catch (error) {
      console.error('❌ Erreur génération rapport groupé:', error);
      // En cas d'erreur, retourner vers le rapport standard
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
            <div class="category-header">
                <div class="category-title">${this.helpers.escapeHtml(categoryInfo.path_string)}</div>
                <div class="category-stats">
                    <div class="category-stat">
                        <span class="stat-label">Produits</span>
                        <span class="stat-value">${this.helpers.formatNumber(stats.productCount)}</span>
                    </div>
                    <div class="category-stat">
                        <span class="stat-label">Stock Total</span>
                        <span class="stat-value">${this.helpers.formatNumber(stats.totalStock)}</span>
                    </div>
                    <div class="category-stat">
                        <span class="stat-label">Valeur</span>
                        <span class="stat-value">${this.helpers.formatCurrency(stats.totalValue)}</span>
                    </div>
                    <div class="category-stat">
                        <span class="stat-label">TVA</span>
                        <span class="stat-value">${this.helpers.formatCurrency(stats.totalTax)}</span>
                    </div>
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

    /* Styles spécifiques pour les groupes de catégories */
    .category-section {
      margin-bottom: 15mm;
      page-break-inside: avoid;
    }

    .category-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 6mm;
      margin-bottom: 5mm;
      border-radius: 3mm;
      page-break-inside: avoid;
    }

    .category-title {
      font-size: 16pt;
      font-weight: 700;
      margin-bottom: 2mm;
    }

    .category-stats {
      font-size: 10pt;
      opacity: 0.9;
      display: flex;
      gap: 15mm;
      flex-wrap: wrap;
    }

    .category-stat {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 8pt;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }

    .stat-value {
      font-size: 11pt;
      font-weight: 600;
    }

    .category-totals-row { 
      background: #e2e8f0 !important; 
      font-weight: bold; 
      border-top: 2px solid #374151 !important;
    }

    .final-totals-row { 
      background: #d1d5db !important; 
      font-weight: bold; 
      border-top: 3px solid #1f2937 !important;
      font-size: 9pt;
    }

    .summary-section {
      background: #f0f9ff;
      border: 2px solid #3b82f6;
      border-radius: 5mm;
      padding: 8mm;
      margin-top: 10mm;
      page-break-inside: avoid;
    }

    .summary-title {
      font-size: 14pt;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 5mm;
      text-align: center;
    }

    .summary-content {
      font-size: 10pt;
      line-height: 1.6;
      text-align: justify;
    }
    `;
  }
}

module.exports = DetailedStockReportTemplate;
