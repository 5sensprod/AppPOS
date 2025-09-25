// fixCategoryWooIds.js - Corrige les woo_id manquants dans category_info des produits
const fs = require('fs').promises;
const path = require('path');

class CategoryWooIdsFixer {
  constructor() {
    this.productsPath = path.join(process.cwd(), 'data', 'products.db');
    this.categoriesPath = path.join(process.cwd(), 'data', 'categories.db');
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

  async saveProducts(products) {
    const backupPath = path.join(
      process.cwd(),
      'data',
      `products.db.backup.category-fix.${Date.now()}`
    );

    // Sauvegarde
    await fs.copyFile(this.productsPath, backupPath);
    console.log(`💾 Sauvegarde créée: ${backupPath}`);

    // Sauvegarder les modifications
    const content = products.map((p) => JSON.stringify(p)).join('\n');
    await fs.writeFile(this.productsPath, content);
  }

  async fixCategoryWooIds(reportPath = null, targetProductIds = []) {
    try {
      console.log('🔧 CORRECTION DES WOO_ID DANS CATEGORY_INFO');
      console.log('═'.repeat(70));

      // 1. Charger les données
      console.log('\n📦 Chargement des données...');
      const [products, categories] = await Promise.all([
        this.loadProducts(),
        this.loadCategories(),
      ]);

      // Créer un index des catégories
      const categoriesById = new Map();
      categories.forEach((cat) => categoriesById.set(cat._id, cat));

      console.log(`📊 ${products.length} produits chargés`);
      console.log(`📊 ${categories.length} catégories chargées`);

      // 2. Filtrer les produits à traiter
      let productsToFix = products;

      if (targetProductIds.length > 0) {
        productsToFix = products.filter((p) => targetProductIds.includes(p._id));
        console.log(`🎯 ${productsToFix.length} produits ciblés`);
      } else {
        // Filtrer les produits synchronisés en brouillon si pas d'IDs spécifiques
        productsToFix = products.filter((p) => p.woo_id && p.status === 'draft');
        console.log(`🎯 ${productsToFix.length} produits synchronisés en brouillon`);
      }

      // 3. Corriger les woo_id manquants
      console.log('\n🔧 Correction des woo_id...');

      let fixedProducts = 0;
      let fixedReferences = 0;

      for (const product of productsToFix) {
        if (!product.category_info || !product.category_info.refs) {
          console.log(`⚠️ ${product.name}: Pas de category_info.refs`);
          continue;
        }

        let productFixed = false;

        // Corriger chaque référence de catégorie
        for (const ref of product.category_info.refs) {
          const category = categoriesById.get(ref.id);

          if (!category) {
            console.log(`⚠️ ${product.name}: Catégorie ${ref.id} non trouvée`);
            continue;
          }

          // Corriger le woo_id s'il manque
          if (!ref.woo_id && category.woo_id) {
            ref.woo_id = category.woo_id;
            fixedReferences++;
            productFixed = true;
            console.log(`   ✅ ${ref.name}: woo_id ajouté (${category.woo_id})`);
          }

          // Corriger le nom s'il est obsolète
          if (ref.name !== category.name) {
            console.log(`   📝 ${ref.name} → ${category.name}`);
            ref.name = category.name;
            productFixed = true;
          }
        }

        // Corriger aussi dans primary si présent
        if (product.category_info.primary) {
          const primaryRef = product.category_info.primary;
          const category = categoriesById.get(primaryRef.id);

          if (category) {
            if (!primaryRef.woo_id && category.woo_id) {
              primaryRef.woo_id = category.woo_id;
              productFixed = true;
            }
            if (primaryRef.name !== category.name) {
              primaryRef.name = category.name;
              productFixed = true;
            }
          }
        }

        if (productFixed) {
          // Marquer pour resynchronisation
          product.pending_sync = true;
          fixedProducts++;
          console.log(`✅ ${product.sku || product.name}: corrigé + pending_sync=true`);
        }
      }

      // 4. Sauvegarder les modifications
      if (fixedProducts > 0) {
        console.log('\n💾 Sauvegarde des modifications...');
        await this.saveProducts(products);

        console.log('\n═'.repeat(70));
        console.log('🎉 CORRECTION TERMINÉE !');
        console.log(`📊 ${fixedProducts} produits corrigés`);
        console.log(`🔗 ${fixedReferences} références de catégories corrigées`);
        console.log(`🔄 ${fixedProducts} produits marqués pending_sync=true`);

        // Générer un rapport de correction
        const fixReport = {
          timestamp: new Date().toISOString(),
          sourceReport: reportPath,
          fixedProducts: fixedProducts,
          fixedReferences: fixedReferences,
          pendingSyncMarked: fixedProducts,
        };

        const reportPath2 = `./reports/category_woo_ids_fix_${Date.now()}.json`;
        await fs.writeFile(reportPath2, JSON.stringify(fixReport, null, 2));
        console.log(`📄 Rapport de correction: ${reportPath2}`);
      } else {
        console.log('\n✅ Aucune correction nécessaire');
        console.log('Tous les woo_id sont déjà corrects');
      }

      return {
        fixedProducts,
        fixedReferences,
      };
    } catch (error) {
      console.error('❌ Erreur lors de la correction:', error.message);
      throw error;
    }
  }

  // Corriger à partir d'un rapport d'audit
  async fixFromAuditReport(reportPath) {
    try {
      console.log(`📄 Chargement du rapport d'audit: ${reportPath}`);
      const reportContent = await fs.readFile(reportPath, 'utf8');
      const report = JSON.parse(reportContent);

      if (!report.issues || !report.issues.nullWooIds) {
        console.log("❌ Rapport d'audit invalide ou pas de woo_id manquants");
        return { fixedProducts: 0, fixedReferences: 0 };
      }

      console.log(
        `📊 ${report.issues.nullWooIds.length} références avec woo_id manquant détectées`
      );

      // Extraire les IDs des produits à corriger
      const productIds = [...new Set(report.issues.nullWooIds.map((issue) => issue.productId))];
      console.log(`🎯 ${productIds.length} produits uniques à corriger`);

      return await this.fixCategoryWooIds(reportPath, productIds);
    } catch (error) {
      console.error('❌ Erreur lecture rapport:', error.message);
      throw error;
    }
  }
}

// Fonction principale
async function runCategoryWooIdsFix() {
  try {
    const fixer = new CategoryWooIdsFixer();
    const args = process.argv.slice(2);

    // Vérifier s'il y a un rapport d'audit
    const reportPath = args.find((arg) => arg.includes('audit') && arg.includes('.json'));
    const specificIds = args.filter((arg) => !arg.includes('.json'));

    if (reportPath) {
      // Mode rapport d'audit
      console.log(`📄 Mode rapport d'audit: ${reportPath}`);
      const results = await fixer.fixFromAuditReport(reportPath);
      console.log(
        `\n✅ Correction terminée: ${results.fixedReferences} références sur ${results.fixedProducts} produits`
      );
    } else if (specificIds.length > 0) {
      // Mode IDs spécifiques
      console.log(`🎯 Mode IDs spécifiques: ${specificIds.length} produits`);
      const results = await fixer.fixCategoryWooIds(null, specificIds);
      console.log(
        `\n✅ Correction terminée: ${results.fixedReferences} références sur ${results.fixedProducts} produits`
      );
    } else {
      // Mode automatique (tous les produits synchronisés en brouillon)
      console.log('🔄 Mode automatique: produits synchronisés en brouillon');
      const results = await fixer.fixCategoryWooIds();
      console.log(
        `\n✅ Correction terminée: ${results.fixedReferences} références sur ${results.fixedProducts} produits`
      );
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runCategoryWooIdsFix();
}

module.exports = { CategoryWooIdsFixer };
