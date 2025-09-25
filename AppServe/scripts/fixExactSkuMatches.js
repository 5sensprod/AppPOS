// fixExactSkuMatches.js - Corrige uniquement les woo_id avec correspondances SKU exactes
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

class ExactSkuMatcher {
  constructor() {
    this.dataPath = path.join(process.cwd(), 'data');
    console.log(`🔧 [FIXER] Répertoire de données: ${this.dataPath}`);
  }

  async loadAnalysisReport(reportPath) {
    try {
      console.log(`📄 Chargement du rapport: ${reportPath}`);
      const reportContent = await fs.readFile(reportPath, 'utf8');
      const report = JSON.parse(reportContent);

      // Filtrer uniquement les correspondances SKU exactes
      const exactSkuMatches = report.details.obsoleteWooIds.filter(
        (item) => item.matchType === 'sku_exact'
      );

      console.log(`✅ ${exactSkuMatches.length} correspondances SKU exactes trouvées`);
      console.log(
        `⏭️  ${report.details.obsoleteWooIds.length - exactSkuMatches.length} correspondances par similarité ignorées`
      );

      return exactSkuMatches;
    } catch (error) {
      console.error('❌ Erreur lecture rapport:', error.message);
      throw error;
    }
  }

  async readProductsFromFile() {
    try {
      const productsPath = path.join(this.dataPath, 'products.db');

      const fileExists = await fs
        .access(productsPath)
        .then(() => true)
        .catch(() => false);
      if (!fileExists) {
        throw new Error(`Fichier products.db non trouvé: ${productsPath}`);
      }

      console.log(`📖 Lecture du fichier: ${productsPath}`);
      const fileContent = await fs.readFile(productsPath, 'utf8');

      if (!fileContent.trim()) {
        throw new Error('Fichier products.db vide');
      }

      const lines = fileContent.split('\n').filter((line) => line.trim());
      const products = [];

      for (const line of lines) {
        try {
          const product = JSON.parse(line);
          products.push(product);
        } catch (error) {
          // Ignorer les lignes JSON invalides
        }
      }

      console.log(`✅ ${products.length} produits lus`);
      return products;
    } catch (error) {
      console.error('❌ Erreur lecture fichier produits:', error.message);
      throw error;
    }
  }

  async updateProductsFile(products) {
    try {
      const productsPath = path.join(this.dataPath, 'products.db');
      const backupPath = path.join(this.dataPath, `products.db.backup.${Date.now()}`);

      // Créer une sauvegarde
      console.log(`💾 Création sauvegarde: ${backupPath}`);
      await fs.copyFile(productsPath, backupPath);

      // Écrire le nouveau fichier
      const content = products.map((product) => JSON.stringify(product)).join('\n');
      await fs.writeFile(productsPath, content);

      console.log(`✅ Fichier products.db mis à jour`);
      console.log(`📁 Sauvegarde disponible: ${backupPath}`);

      return backupPath;
    } catch (error) {
      console.error('❌ Erreur écriture fichier:', error.message);
      throw error;
    }
  }

  async fixExactSkuMatches(reportPath) {
    try {
      console.log('🔧 CORRECTION DES WOO_ID - CORRESPONDANCES SKU EXACTES');
      console.log('═'.repeat(80));

      // 1. Charger le rapport d'analyse
      const exactMatches = await this.loadAnalysisReport(reportPath);

      if (exactMatches.length === 0) {
        console.log('ℹ️  Aucune correspondance SKU exacte à corriger');
        return { corrected: 0, errors: 0 };
      }

      // 2. Charger les produits locaux
      console.log('\n📦 Chargement des produits locaux...');
      const products = await this.readProductsFromFile();

      // 3. Créer un index des produits par ID pour performance
      const productsById = new Map();
      products.forEach((product) => {
        productsById.set(product._id, product);
      });

      // 4. Appliquer les corrections
      console.log('\n🔄 Application des corrections...');
      const corrections = [];
      const errors = [];

      for (const match of exactMatches) {
        const product = productsById.get(match.localId);

        if (!product) {
          errors.push({
            localId: match.localId,
            sku: match.sku,
            error: 'Produit non trouvé dans le fichier local',
          });
          continue;
        }

        // Vérifier que le woo_id actuel correspond bien à l'ancien
        if (product.woo_id !== match.oldWooId) {
          errors.push({
            localId: match.localId,
            sku: match.sku,
            error: `woo_id actuel (${product.woo_id}) différent de l'ancien attendu (${match.oldWooId})`,
          });
          continue;
        }

        // Appliquer la correction
        const oldWooId = product.woo_id;
        product.woo_id = match.newWooId;
        product.last_sync = new Date().toISOString(); // Mettre à jour la date de sync

        corrections.push({
          localId: match.localId,
          localName: match.localName,
          sku: match.sku,
          oldWooId: oldWooId,
          newWooId: match.newWooId,
          wooName: match.wooName,
        });

        console.log(`✅ ${match.sku}: ${oldWooId} → ${match.newWooId}`);
      }

      // 5. Afficher le résumé
      console.log('\n📊 RÉSUMÉ DES CORRECTIONS:');
      console.log('─'.repeat(80));
      console.log(`✅ Corrections appliquées: ${corrections.length}`);
      console.log(`❌ Erreurs rencontrées: ${errors.length}`);

      if (errors.length > 0) {
        console.log('\n❌ ERREURS DÉTECTÉES:');
        errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error.sku} (${error.localId}): ${error.error}`);
        });
      }

      // 6. Sauvegarder les modifications
      if (corrections.length > 0) {
        console.log('\n💾 Sauvegarde des modifications...');
        const backupPath = await this.updateProductsFile(products);

        // Sauvegarder un rapport de correction
        const correctionReport = {
          timestamp: new Date().toISOString(),
          sourceReport: reportPath,
          corrections: corrections,
          errors: errors,
          backupFile: backupPath,
        };

        const reportPath2 = `./reports/woo_id_corrections_${Date.now()}.json`;
        await fs.writeFile(reportPath2, JSON.stringify(correctionReport, null, 2));
        console.log(`📄 Rapport de correction sauvegardé: ${reportPath2}`);
      }

      console.log('\n═'.repeat(80));
      console.log('🎉 CORRECTION TERMINÉE AVEC SUCCÈS !');
      console.log(`📊 ${corrections.length} woo_id mis à jour`);

      if (corrections.length > 0) {
        console.log('\n💡 PROCHAINES ÉTAPES RECOMMANDÉES:');
        console.log("   1. Vérifier que l'application fonctionne correctement");
        console.log('   2. Lancer une synchronisation pour confirmer les corrections');
        console.log('   3. Relancer le script de détection pour vérifier les résultats');
      }

      return {
        corrected: corrections.length,
        errors: errors.length,
        corrections: corrections,
        errorDetails: errors,
      };
    } catch (error) {
      console.error('❌ Erreur lors de la correction:', error.message);
      throw error;
    }
  }

  // Fonction utilitaire pour restaurer depuis une sauvegarde
  async restoreBackup(backupPath) {
    try {
      const productsPath = path.join(this.dataPath, 'products.db');
      await fs.copyFile(backupPath, productsPath);
      console.log(`✅ Restauration depuis ${backupPath} terminée`);
    } catch (error) {
      console.error('❌ Erreur lors de la restauration:', error.message);
      throw error;
    }
  }
}

// Fonction principale
async function runExactSkuFix(reportPath) {
  try {
    if (!reportPath) {
      console.error("❌ Veuillez spécifier le chemin du rapport d'analyse");
      console.log('Usage: node fixExactSkuMatches.js <chemin_rapport>');
      console.log(
        'Exemple: node fixExactSkuMatches.js ./reports/woo_id_analysis_1758645138038.json'
      );
      process.exit(1);
    }

    // Vérifier que le fichier rapport existe
    const reportExists = await fs
      .access(reportPath)
      .then(() => true)
      .catch(() => false);

    if (!reportExists) {
      console.error(`❌ Fichier rapport non trouvé: ${reportPath}`);
      process.exit(1);
    }

    const fixer = new ExactSkuMatcher();
    const results = await fixer.fixExactSkuMatches(reportPath);

    console.log('\n✅ Opération terminée avec succès!');
    console.log(`📊 Résultat: ${results.corrected} corrections, ${results.errors} erreurs`);

    return results;
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  const reportPath = process.argv[2];
  runExactSkuFix(reportPath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { ExactSkuMatcher, runExactSkuFix };
