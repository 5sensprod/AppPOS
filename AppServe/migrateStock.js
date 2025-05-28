// migrateStock.js
const fs = require('fs').promises;
const path = require('path');
const Datastore = require('nedb');
const util = require('util');

// Chemins des fichiers
const SOURCE_PRODUCTS_FILE = path.join(__dirname, 'data', 'source', 'old_products.db');
const TARGET_PRODUCTS_FILE = path.join(__dirname, 'data', 'products.db');

// Promisify nedb functions
function createDatastore(filePath) {
  const db = new Datastore({ filename: filePath, autoload: true });
  db.findAsync = util.promisify(db.find);
  db.findOneAsync = util.promisify(db.findOne);
  db.updateAsync = util.promisify(db.update);
  db.insertAsync = util.promisify(db.insert);
  return db;
}

// Fonction pour valider et nettoyer la valeur de stock
function validateStock(stockValue) {
  if (stockValue === null || stockValue === undefined || stockValue === '') {
    return 0;
  }

  // Convertir en nombre
  const numericStock = parseInt(stockValue);

  // Vérifier si c'est un nombre valide
  if (isNaN(numericStock) || numericStock < 0) {
    return 0;
  }

  return numericStock;
}

// Fonction pour sauvegarder la base de données avant modification
async function createBackup() {
  try {
    const now = new Date().toISOString().replace(/:/g, '-');
    const backupFile = `${TARGET_PRODUCTS_FILE}.stock-backup-${now}`;

    await fs.copyFile(TARGET_PRODUCTS_FILE, backupFile);
    console.log(`✅ Sauvegarde créée: ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.warn('⚠️ Impossible de créer une sauvegarde:', error.message);
    return null;
  }
}

// Fonction principale de migration du stock
async function migrateStock(options = {}) {
  const { dryRun = false, createBackupFirst = true } = options;

  console.log('🚀 Démarrage de la migration du stock...');

  if (dryRun) {
    console.log('📋 MODE TEST ACTIVÉ - Aucune modification ne sera effectuée');
  }

  try {
    // Créer une sauvegarde avant modification
    if (createBackupFirst && !dryRun) {
      await createBackup();
    }

    // 1. Lecture du fichier source des produits
    console.log('📖 Lecture du fichier source...');
    const sourceData = await fs.readFile(SOURCE_PRODUCTS_FILE, 'utf8');
    const sourceProducts = sourceData
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));

    console.log(`📊 ${sourceProducts.length} produits trouvés dans la source`);

    // 2. Connexion à la base de données cible
    console.log('🔌 Connexion à la base de données cible...');
    const productsDb = createDatastore(TARGET_PRODUCTS_FILE);

    // 3. Statistiques de migration
    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    let unchangedCount = 0;
    const updateLog = [];

    console.log('🔄 Traitement des mises à jour de stock...');

    for (const sourceProduct of sourceProducts) {
      try {
        const productId = sourceProduct._id;
        const newStock = validateStock(sourceProduct.stock);

        // Rechercher le produit dans la base cible
        const targetProduct = await productsDb.findOneAsync({ _id: productId });

        if (!targetProduct) {
          console.log(`❌ Produit ${productId} non trouvé dans la base cible`);
          notFoundCount++;
          continue;
        }

        // Vérifier si le stock a changé
        const currentStock = validateStock(targetProduct.stock);

        if (currentStock === newStock) {
          console.log(`➡️ Produit ${productId}: Stock inchangé (${currentStock})`);
          unchangedCount++;
          continue;
        }

        // Préparer les données de mise à jour
        const updateData = {
          stock: newStock,
          manage_stock: newStock > 0, // Activer la gestion de stock si stock > 0
        };

        // Log de la modification
        const logEntry = {
          id: productId,
          sku: targetProduct.sku || 'N/A',
          name: targetProduct.name || 'Sans nom',
          oldStock: currentStock,
          newStock: newStock,
          change: newStock - currentStock,
        };

        updateLog.push(logEntry);

        if (!dryRun) {
          // Effectuer la mise à jour
          const result = await productsDb.updateAsync({ _id: productId }, { $set: updateData }, {});

          if (result === 1) {
            console.log(
              `✅ Produit ${productId} (${logEntry.sku}): ${currentStock} → ${newStock} (${logEntry.change >= 0 ? '+' : ''}${logEntry.change})`
            );
            updatedCount++;
          } else {
            console.log(`⚠️ Produit ${productId}: Mise à jour échouée`);
            errorCount++;
          }
        } else {
          console.log(
            `📝 [TEST] Produit ${productId} (${logEntry.sku}): ${currentStock} → ${newStock} (${logEntry.change >= 0 ? '+' : ''}${logEntry.change})`
          );
          updatedCount++;
        }
      } catch (error) {
        console.error(
          `❌ Erreur lors du traitement du produit ${sourceProduct._id}:`,
          error.message
        );
        errorCount++;
      }
    }

    // 4. Affichage des statistiques finales
    console.log('\n📊 STATISTIQUES DE MIGRATION');
    console.log('================================');
    console.log(`📈 Produits mis à jour: ${updatedCount}`);
    console.log(`➡️ Produits inchangés: ${unchangedCount}`);
    console.log(`❌ Produits non trouvés: ${notFoundCount}`);
    console.log(`⚠️ Erreurs: ${errorCount}`);
    console.log(`📦 Total traité: ${sourceProducts.length}`);

    // 5. Résumé des modifications importantes
    if (updateLog.length > 0) {
      console.log('\n📋 RÉSUMÉ DES MODIFICATIONS');
      console.log('============================');

      // Trier par changement de stock (plus important d'abord)
      const sortedLog = updateLog.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

      // Afficher les 10 plus gros changements
      const topChanges = sortedLog.slice(0, 10);
      topChanges.forEach((entry, index) => {
        const changeStr = entry.change >= 0 ? `+${entry.change}` : `${entry.change}`;
        console.log(
          `${index + 1}. ${entry.sku} (${entry.name.substring(0, 30)}...): ${entry.oldStock} → ${entry.newStock} (${changeStr})`
        );
      });

      if (sortedLog.length > 10) {
        console.log(`... et ${sortedLog.length - 10} autres modifications`);
      }

      // Statistiques sur les changements
      const stockIncreases = updateLog.filter((entry) => entry.change > 0).length;
      const stockDecreases = updateLog.filter((entry) => entry.change < 0).length;
      const totalStockChange = updateLog.reduce((sum, entry) => sum + entry.change, 0);

      console.log(`\n📈 Augmentations de stock: ${stockIncreases}`);
      console.log(`📉 Diminutions de stock: ${stockDecreases}`);
      console.log(
        `📊 Variation totale de stock: ${totalStockChange >= 0 ? '+' : ''}${totalStockChange}`
      );
    }

    // 6. Mode test - Instructions pour l'utilisateur
    if (dryRun) {
      console.log('\n🔄 POUR APPLIQUER LES MODIFICATIONS:');
      console.log('node migrateStock.js --apply');
    }

    return {
      success: true,
      updated: updatedCount,
      unchanged: unchangedCount,
      notFound: notFoundCount,
      errors: errorCount,
      total: sourceProducts.length,
      dryRun: dryRun,
    };
  } catch (error) {
    console.error('💥 Erreur lors de la migration:', error);
    return { success: false, error: error.message };
  }
}

// Fonction pour afficher l'aide
function showHelp() {
  console.log(`
🔧 SCRIPT DE MIGRATION DU STOCK
===============================

Usage: node migrateStock.js [options]

Options:
  --test, -t          Mode test (aucune modification effectuée)
  --apply, -a         Appliquer les modifications
  --no-backup         Ne pas créer de sauvegarde
  --help, -h          Afficher cette aide

Exemples:
  node migrateStock.js --test      # Tester la migration sans modifier
  node migrateStock.js --apply     # Appliquer la migration
  node migrateStock.js --apply --no-backup  # Appliquer sans sauvegarde

⚠️  ATTENTION: Toujours tester avec --test avant d'appliquer !
`);
}

// Exécuter la migration
if (require.main === module) {
  // Analyser les arguments de ligne de commande
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const isTest = args.includes('--test') || args.includes('-t');
  const isApply = args.includes('--apply') || args.includes('-a');
  const noBackup = args.includes('--no-backup');

  // Par défaut, utiliser le mode test si aucune option n'est spécifiée
  const dryRun = isTest || !isApply;
  const createBackupFirst = !noBackup;

  const options = {
    dryRun: dryRun,
    createBackupFirst: createBackupFirst,
  };

  console.log(`🎯 Mode: ${dryRun ? 'TEST' : 'APPLICATION'}`);

  migrateStock(options)
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 Migration terminée avec succès!');

        if (result.dryRun) {
          console.log(
            '💡 Pour appliquer ces modifications, utilisez: node migrateStock.js --apply'
          );
        }
      } else {
        console.error('\n💥 Échec de la migration:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Erreur non gérée:', error);
      process.exit(1);
    });
}

module.exports = { migrateStock };
