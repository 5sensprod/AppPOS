// removeSyncData.js - Supprime les données de synchronisation pour des produits spécifiques
const fs = require('fs').promises;
const path = require('path');

class SyncDataRemover {
  constructor() {
    this.dataPath = path.join(process.cwd(), 'data');
    console.log(`🗑️  [REMOVER] Répertoire de données: ${this.dataPath}`);
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

  async removeSyncData(productIds) {
    try {
      console.log('🗑️  SUPPRESSION DES DONNÉES DE SYNCHRONISATION');
      console.log('═'.repeat(80));

      if (productIds.length === 0) {
        console.log('❌ Aucun ID de produit spécifié');
        return { processed: 0, errors: 0 };
      }

      console.log(`🎯 Produits à traiter: ${productIds.join(', ')}`);

      // Charger les produits
      const products = await this.readProductsFromFile();

      // Créer un index par ID
      const productsById = new Map();
      products.forEach((product) => {
        productsById.set(product._id, product);
      });

      // Traiter chaque produit
      const processed = [];
      const errors = [];

      for (const productId of productIds) {
        const product = productsById.get(productId);

        if (!product) {
          errors.push({
            id: productId,
            error: 'Produit non trouvé',
          });
          console.log(`❌ ${productId}: Produit non trouvé`);
          continue;
        }

        // Afficher l'état avant
        console.log(`\n📦 ${productId} - ${product.name || 'Sans nom'}`);
        console.log(`   SKU: ${product.sku || 'N/A'}`);

        const beforeSync = {
          woo_id: product.woo_id || 'Non défini',
          last_sync: product.last_sync || 'Non défini',
          woo_status: product.woo_status || 'Non défini',
          pending_sync: product.pending_sync !== undefined ? product.pending_sync : 'Non défini',
          website_url: product.website_url || 'Non défini',
        };

        console.log(`   🔗 Avant - woo_id: ${beforeSync.woo_id}`);
        console.log(`   📅 Avant - last_sync: ${beforeSync.last_sync}`);
        console.log(`   📊 Avant - woo_status: ${beforeSync.woo_status}`);
        console.log(`   ⏳ Avant - pending_sync: ${beforeSync.pending_sync}`);
        console.log(`   🌐 Avant - website_url: ${beforeSync.website_url}`);

        // Supprimer les données de synchronisation
        const hadSyncData =
          product.woo_id ||
          product.last_sync ||
          product.woo_status ||
          product.pending_sync ||
          product.website_url;

        if (product.woo_id) delete product.woo_id;
        if (product.last_sync) delete product.last_sync;
        if (product.woo_status) delete product.woo_status;
        if (product.pending_sync) delete product.pending_sync;
        if (product.website_url) delete product.website_url;
        if (product.sync_errors) delete product.sync_errors; // Bonus: supprimer aussi les erreurs de sync

        if (hadSyncData) {
          processed.push({
            id: productId,
            name: product.name,
            sku: product.sku,
            removedData: beforeSync,
          });
          console.log(`   ✅ Toutes les données de synchronisation supprimées`);
        } else {
          console.log(`   ℹ️  Aucune donnée de synchronisation à supprimer`);
        }
      }

      // Sauvegarder les modifications
      if (processed.length > 0) {
        console.log('\n💾 Sauvegarde des modifications...');
        const backupPath = await this.updateProductsFile(products);

        // Rapport de suppression
        const removalReport = {
          timestamp: new Date().toISOString(),
          processed: processed,
          errors: errors,
          backupFile: backupPath,
        };

        const reportPath = `./reports/sync_data_removal_${Date.now()}.json`;
        await fs.writeFile(reportPath, JSON.stringify(removalReport, null, 2));
        console.log(`📄 Rapport sauvegardé: ${reportPath}`);
      }

      // Résumé final
      console.log('\n═'.repeat(80));
      console.log('📊 RÉSUMÉ:');
      console.log(`   ✅ Produits traités: ${processed.length}`);
      console.log(`   ❌ Erreurs: ${errors.length}`);

      if (processed.length > 0) {
        console.log('\n🎉 SUPPRESSION TERMINÉE AVEC SUCCÈS !');
        console.log('\n💡 Ces produits sont maintenant "non synchronisés"');
        console.log('   → Ils peuvent être resynchronisés manuellement si nécessaire');
      }

      return {
        processed: processed.length,
        errors: errors.length,
        details: { processed, errors },
      };
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error.message);
      throw error;
    }
  }
}

// Fonction principale
async function runSyncDataRemoval(productIds) {
  try {
    if (productIds.length === 0) {
      console.error('❌ Veuillez spécifier au moins un ID de produit');
      console.log('Usage: node removeSyncData.js <productId1> [productId2] [productId3] ...');
      console.log('Exemple: node removeSyncData.js G2WHdXMcvfIJiPKn');
      console.log('Exemple: node removeSyncData.js G2WHdXMcvfIJiPKn autre_id_produit');
      process.exit(1);
    }

    const remover = new SyncDataRemover();
    const results = await remover.removeSyncData(productIds);

    console.log(`\n✅ Opération terminée: ${results.processed} traités, ${results.errors} erreurs`);

    return results;
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  const productIds = process.argv.slice(2); // Récupère tous les arguments après le nom du script

  runSyncDataRemoval(productIds)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { SyncDataRemover, runSyncDataRemoval };
