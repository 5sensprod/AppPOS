// auditProductCategories.js - Audit des informations de catégories dans les produits
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

class ProductCategoriesAuditor {
  constructor() {
    this.productsPath = path.join(process.cwd(), 'data', 'products.db');
    this.categoriesPath = path.join(process.cwd(), 'data', 'categories.db');
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    this.jwtToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IlVnUHdqZ3FCWlNqVnRtTHIiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU4NjM2NDYzLCJleHAiOjE3NTg3MjI4NjMsImF1ZCI6IkFwcFBPUy1DbGllbnQiLCJpc3MiOiJBcHBQT1MtU2VydmVyIn0.cylgsIiVcEQjv5JUN_63OGQTDdtWf4UwjjDjBtq8cf4';
  }

  async loadProducts() {
    const fileContent = await fs.readFile(this.productsPath, 'utf8');
    const lines = fileContent.split('\n').filter((line) => line.trim());

    const products = [];
    for (const line of lines) {
      try {
        products.push(JSON.parse(line));
      } catch (error) {
        // Ignorer lignes invalides
      }
    }
    return products;
  }

  async loadCategories() {
    const fileContent = await fs.readFile(this.categoriesPath, 'utf8');
    const lines = fileContent.split('\n').filter((line) => line.trim());

    const categories = [];
    for (const line of lines) {
      try {
        categories.push(JSON.parse(line));
      } catch (error) {
        // Ignorer lignes invalides
      }
    }
    return categories;
  }

  async getProductFromAPI(productId) {
    return new Promise((resolve, reject) => {
      const url = `${this.apiBaseUrl}/api/products/${productId}`;

      const options = {
        headers: {
          Authorization: `Bearer ${this.jwtToken}`,
          'Content-Type': 'application/json',
        },
      };

      http
        .get(url, options, (res) => {
          if (res.statusCode !== 200) {
            resolve(null);
            return;
          }

          let data = '';
          res.on('data', (chunk) => (data += chunk));

          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              resolve(response.success ? response.data : null);
            } catch (error) {
              resolve(null);
            }
          });
        })
        .on('error', () => resolve(null));
    });
  }

  async auditProductCategories(sampleSize = 20) {
    try {
      console.log('📋 AUDIT DES CATÉGORIES - PRODUITS SYNCHRONISÉS EN BROUILLON');
      console.log('═'.repeat(80));

      // 1. Charger les données
      console.log('\n📦 Chargement des données...');
      const [allProducts, categories] = await Promise.all([
        this.loadProducts(),
        this.loadCategories(),
      ]);

      // Filtrer les produits synchronisés ET en draft
      const products = allProducts.filter((p) => p.woo_id && p.status === 'draft');

      console.log(`📊 ${allProducts.length} produits total chargés`);
      console.log(`🎯 ${products.length} produits synchronisés en brouillon`);
      console.log(`📊 ${categories.length} catégories chargées`);

      // 2. Créer des index
      const categoriesById = new Map();
      const categoriesByWooId = new Map();

      categories.forEach((cat) => {
        categoriesById.set(cat._id, cat);
        if (cat.woo_id) {
          categoriesByWooId.set(cat.woo_id, cat);
        }
      });

      console.log(`📊 ${categoriesById.size} catégories indexées par ID`);
      console.log(`📊 ${categoriesByWooId.size} catégories avec woo_id`);

      // 3. Analyser les produits
      console.log('\n🔍 Analyse des informations de catégories...');

      const issues = {
        missingCategoryInfo: [],
        nullWooIds: [],
        invalidCategoryRefs: [],
        mismatchedHierarchy: [],
        obsoleteReferences: [],
      };

      const stats = {
        totalProducts: allProducts.length,
        syncedDraftProducts: products.length,
        productsWithCategoryInfo: 0,
        productsWithValidWooIds: 0,
        categoriesReferencedTotal: 0,
        uniqueCategoriesReferenced: new Set(),
      };

      // Prendre un échantillon pour l'analyse détaillée
      const sampleProducts = products.slice(0, Math.min(sampleSize, products.length));
      console.log(`📊 Analyse d'un échantillon de ${sampleProducts.length} produits`);

      for (const product of products) {
        // Statistiques générales
        if (product.category_info) {
          stats.productsWithCategoryInfo++;

          if (product.category_info.refs) {
            stats.categoriesReferencedTotal += product.category_info.refs.length;

            product.category_info.refs.forEach((ref) => {
              stats.uniqueCategoriesReferenced.add(ref.id);

              // Vérifier les woo_id
              if (ref.woo_id) {
                stats.productsWithValidWooIds++;
              }
            });
          }
        } else {
          issues.missingCategoryInfo.push({
            productId: product._id,
            name: product.name,
            sku: product.sku,
          });
        }

        // Analyse détaillée sur l'échantillon
        if (sampleProducts.includes(product)) {
          await this.analyzeProductCategoryInfo(product, categoriesById, issues);
        }
      }

      // 4. Comparer avec quelques produits API
      console.log("\n🌐 Comparaison avec l'API...");
      const apiComparisons = [];

      for (let i = 0; i < Math.min(5, sampleProducts.length); i++) {
        const product = sampleProducts[i];
        const apiProduct = await this.getProductFromAPI(product._id);

        if (apiProduct) {
          const comparison = this.compareProductCategories(product, apiProduct);
          if (comparison.hasDifferences) {
            apiComparisons.push(comparison);
          }
        }

        // Délai pour ne pas surcharger l'API
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // 5. Afficher les résultats
      this.displayAuditResults(stats, issues, apiComparisons);

      // 6. Sauvegarder le rapport
      const auditReport = {
        timestamp: new Date().toISOString(),
        stats,
        issues,
        apiComparisons,
        recommendations: this.generateRecommendations(stats, issues, apiComparisons),
      };

      const reportPath = `./reports/product_categories_audit_${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(auditReport, null, 2));
      console.log(`📄 Rapport d'audit sauvegardé: ${reportPath}`);

      return auditReport;
    } catch (error) {
      console.error("❌ Erreur lors de l'audit:", error.message);
      throw error;
    }
  }

  async analyzeProductCategoryInfo(product, categoriesById, issues) {
    if (!product.category_info || !product.category_info.refs) return;

    for (const ref of product.category_info.refs) {
      // Vérifier si la catégorie existe
      const category = categoriesById.get(ref.id);
      if (!category) {
        issues.invalidCategoryRefs.push({
          productId: product._id,
          productName: product.name,
          invalidCategoryId: ref.id,
          referencedName: ref.name,
        });
        continue;
      }

      // Vérifier les woo_id
      if (!ref.woo_id && category.woo_id) {
        issues.nullWooIds.push({
          productId: product._id,
          productName: product.name,
          categoryId: ref.id,
          categoryName: ref.name,
          expectedWooId: category.woo_id,
        });
      }

      // Vérifier les noms
      if (ref.name !== category.name) {
        issues.obsoleteReferences.push({
          productId: product._id,
          productName: product.name,
          categoryId: ref.id,
          productRefName: ref.name,
          actualCategoryName: category.name,
        });
      }
    }
  }

  compareProductCategories(localProduct, apiProduct) {
    const comparison = {
      productId: localProduct._id,
      productName: localProduct.name,
      hasDifferences: false,
      differences: [],
    };

    const localRefs = localProduct.category_info?.refs || [];
    const apiRefs = apiProduct.category_info?.refs || [];

    // Comparer le nombre de références
    if (localRefs.length !== apiRefs.length) {
      comparison.hasDifferences = true;
      comparison.differences.push({
        type: 'count_mismatch',
        local: localRefs.length,
        api: apiRefs.length,
      });
    }

    // Comparer les woo_id
    const localWooIds = localRefs.map((r) => r.woo_id).filter(Boolean);
    const apiWooIds = apiRefs.map((r) => r.woo_id).filter(Boolean);

    if (JSON.stringify(localWooIds.sort()) !== JSON.stringify(apiWooIds.sort())) {
      comparison.hasDifferences = true;
      comparison.differences.push({
        type: 'woo_ids_mismatch',
        local: localWooIds,
        api: apiWooIds,
      });
    }

    return comparison;
  }

  displayAuditResults(stats, issues, apiComparisons) {
    console.log('\n═'.repeat(80));
    console.log("📊 RÉSULTATS DE L'AUDIT");
    console.log('═'.repeat(80));

    console.log('\n📈 STATISTIQUES - PRODUITS SYNCHRONISÉS EN BROUILLON:');
    console.log(`   📦 Total produits (tous): ${stats.totalProducts}`);
    console.log(`   🎯 Produits synchronisés + draft: ${stats.syncedDraftProducts}`);
    console.log(`   📋 Produits avec category_info: ${stats.productsWithCategoryInfo}`);
    console.log(`   🔗 Produits avec woo_id valides: ${stats.productsWithValidWooIds}`);
    console.log(`   📊 Catégories référencées (total): ${stats.categoriesReferencedTotal}`);
    console.log(`   📊 Catégories uniques référencées: ${stats.uniqueCategoriesReferenced.size}`);

    console.log('\n🚨 PROBLÈMES DÉTECTÉS:');
    console.log(`   ❌ Produits sans category_info: ${issues.missingCategoryInfo.length}`);
    console.log(`   🔗 Références avec woo_id manquant: ${issues.nullWooIds.length}`);
    console.log(`   🔍 Références de catégories invalides: ${issues.invalidCategoryRefs.length}`);
    console.log(`   📝 Références avec noms obsolètes: ${issues.obsoleteReferences.length}`);

    // Détail des problèmes les plus critiques
    if (issues.nullWooIds.length > 0) {
      console.log('\n🔗 WOO_ID MANQUANTS (échantillon):');
      console.log('─'.repeat(60));
      issues.nullWooIds.slice(0, 5).forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.productName} (${issue.productId})`);
        console.log(
          `   Catégorie: ${issue.categoryName} devrait avoir woo_id: ${issue.expectedWooId}`
        );
      });
      if (issues.nullWooIds.length > 5) {
        console.log(`   ... et ${issues.nullWooIds.length - 5} autres`);
      }
    }

    // Comparaisons API
    if (apiComparisons.length > 0) {
      console.log("\n🌐 DIFFÉRENCES AVEC L'API:");
      console.log('─'.repeat(60));
      apiComparisons.forEach((comp, index) => {
        console.log(`${index + 1}. ${comp.productName} (${comp.productId})`);
        comp.differences.forEach((diff) => {
          if (diff.type === 'woo_ids_mismatch') {
            console.log(
              `   woo_id - Local: [${diff.local.join(', ')}] vs API: [${diff.api.join(', ')}]`
            );
          }
          if (diff.type === 'count_mismatch') {
            console.log(`   Nombre catégories - Local: ${diff.local} vs API: ${diff.api}`);
          }
        });
      });
    }

    console.log('\n═'.repeat(80));
  }

  generateRecommendations(stats, issues, apiComparisons) {
    const recommendations = [];

    if (issues.nullWooIds.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'woo_id manquants dans category_info',
        count: issues.nullWooIds.length,
        action: 'Mettre à jour les woo_id des catégories dans les produits',
      });
    }

    if (issues.obsoleteReferences.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Noms de catégories obsolètes',
        count: issues.obsoleteReferences.length,
        action: 'Synchroniser les noms de catégories dans les produits',
      });
    }

    if (apiComparisons.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: "Différences avec l'API",
        count: apiComparisons.length,
        action: "Resynchroniser les category_info depuis l'API",
      });
    }

    return recommendations;
  }
}

// Fonction principale
async function runProductCategoriesAudit() {
  try {
    const sampleSize = parseInt(process.argv[2]) || 20;

    const auditor = new ProductCategoriesAuditor();
    const results = await auditor.auditProductCategories(sampleSize);

    console.log(`\n✅ Audit terminé sur ${sampleSize} produits`);

    return results;
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runProductCategoriesAudit()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { ProductCategoriesAuditor };
