#!/usr/bin/env node
// scripts/set-min-stock-null.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Configuration du chemin
const NEW_DB_PATH = path.join(__dirname, '../data/products.db');

// Vérifier les arguments de ligne de commande
const args = process.argv.slice(2);
const isDryRun = args.includes('--test') || args.includes('--dry-run');
const isExecute = args.includes('--execute');

if (!isDryRun && !isExecute) {
  console.log('Usage:');
  console.log('  node scripts/set-min-stock-null.js --test     # Mode test (simulation)');
  console.log('  node scripts/set-min-stock-null.js --execute  # Exécution réelle');
  process.exit(1);
}

console.log(`🔧 [MIN_STOCK] Mode: ${isDryRun ? 'TEST (simulation)' : 'EXÉCUTION RÉELLE'}`);
console.log('📋 [OBJECTIF] Définir min_stock = null pour tous les produits');
console.log('');

async function setMinStockNull() {
  try {
    if (!fs.existsSync(NEW_DB_PATH)) {
      console.error(`❌ [ERREUR] Base de données non trouvée: ${NEW_DB_PATH}`);
      process.exit(1);
    }

    console.log('📂 [INFO] Chargement de la base de données...');

    const db = new Datastore({ filename: NEW_DB_PATH, autoload: true });

    // Obtenir tous les produits
    const products = await new Promise((resolve, reject) => {
      db.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    console.log(`📊 [INFO] ${products.length} produits trouvés`);

    // Analyser l'état actuel des min_stock
    let alreadyNull = 0;
    let needsUpdate = 0;
    let hasValue = 0;
    let missingField = 0;

    products.forEach((product) => {
      if (!product.hasOwnProperty('min_stock')) {
        missingField++;
        needsUpdate++;
      } else if (product.min_stock === null) {
        alreadyNull++;
      } else {
        hasValue++;
        needsUpdate++;
      }
    });

    console.log('\n📊 [ANALYSE ACTUELLE]');
    console.log('====================');
    console.log(`Produits avec min_stock = null: ${alreadyNull}`);
    console.log(`Produits avec une valeur min_stock: ${hasValue}`);
    console.log(`Produits sans champ min_stock: ${missingField}`);
    console.log(`Total produits à mettre à jour: ${needsUpdate}`);
    console.log(`Pourcentage déjà correct: ${((alreadyNull / products.length) * 100).toFixed(1)}%`);

    if (needsUpdate === 0) {
      console.log('\n✅ [PARFAIT] Tous les produits ont déjà min_stock = null !');
      return;
    }

    // Afficher des exemples de produits à modifier
    console.log('\n📝 [EXEMPLES] Produits à modifier (5 premiers):');
    const productsToUpdate = products.filter(
      (p) => !p.hasOwnProperty('min_stock') || p.min_stock !== null
    );
    productsToUpdate.slice(0, 5).forEach((product, index) => {
      const currentValue = product.hasOwnProperty('min_stock') ? product.min_stock : 'MANQUANT';
      console.log(
        `  ${index + 1}. ${product._id} | SKU: ${product.sku || 'N/A'} | min_stock actuel: ${currentValue}`
      );
    });

    if (productsToUpdate.length > 5) {
      console.log(`  ... et ${productsToUpdate.length - 5} autres`);
    }

    // Exécuter ou simuler la mise à jour
    let updated = 0;
    let errors = [];

    console.log(`\n🔄 [${isDryRun ? 'SIMULATION' : 'MISE À JOUR'}] Traitement des produits...`);

    if (!isDryRun) {
      // Mise à jour en lot pour de meilleures performances
      try {
        const result = await new Promise((resolve, reject) => {
          db.update(
            {}, // Tous les produits
            { $set: { min_stock: null } },
            { multi: true }, // Mise à jour multiple
            (err, numReplaced) => {
              if (err) reject(err);
              else resolve(numReplaced);
            }
          );
        });

        updated = result;
        console.log(`✅ [SUCCÈS] ${updated} produits mis à jour en une opération`);
      } catch (error) {
        console.error(`❌ [ERREUR] Erreur lors de la mise à jour en lot: ${error.message}`);

        // Fallback : mise à jour individuelle
        console.log('🔄 [FALLBACK] Tentative de mise à jour individuelle...');

        for (const product of productsToUpdate) {
          try {
            await new Promise((resolve, reject) => {
              db.update(
                { _id: product._id },
                { $set: { min_stock: null } },
                {},
                (err, numReplaced) => {
                  if (err) reject(err);
                  else resolve(numReplaced);
                }
              );
            });
            updated++;

            if (updated % 100 === 0) {
              console.log(`   Progression: ${updated}/${needsUpdate} produits traités`);
            }
          } catch (error) {
            errors.push(`Erreur ${product._id}: ${error.message}`);
          }
        }
      }
    } else {
      // Mode simulation
      updated = needsUpdate;
      console.log(`🔄 [TEST] ${updated} produits seraient mis à jour`);
    }

    // Rapport final
    console.log('\n📋 [RAPPORT FINAL]');
    console.log('================');
    console.log(`Total produits dans la base: ${products.length}`);
    console.log(`Produits ${isDryRun ? 'à mettre à jour' : 'mis à jour'}: ${updated}`);
    console.log(`Produits déjà corrects: ${alreadyNull}`);

    if (errors.length > 0) {
      console.log(`Erreurs rencontrées: ${errors.length}`);
      errors.slice(0, 5).forEach((error) => console.log(`  - ${error}`));
      if (errors.length > 5) {
        console.log(`  ... et ${errors.length - 5} autres erreurs`);
      }
    }

    // Calculs de progression
    const finalCorrect = alreadyNull + (isDryRun ? 0 : updated);
    const finalPercentage = ((finalCorrect / products.length) * 100).toFixed(1);

    console.log('\n📊 [RÉSULTAT]');
    console.log('=============');
    if (!isDryRun) {
      console.log(
        `Produits avec min_stock = null: ${finalCorrect}/${products.length} (${finalPercentage}%)`
      );

      if (updated === needsUpdate && errors.length === 0) {
        console.log('🎉 [SUCCÈS COMPLET] Tous les produits ont maintenant min_stock = null !');
      } else if (errors.length > 0) {
        console.log(
          `⚠️  [SUCCÈS PARTIEL] ${updated} produits mis à jour, ${errors.length} erreurs`
        );
      }
    } else {
      console.log(
        `Après exécution: ${products.length}/${products.length} produits auront min_stock = null (100%)`
      );
    }

    if (isDryRun) {
      console.log(
        '\n💡 [INFO] Mode test terminé. Utilisez --execute pour appliquer les changements.'
      );
      if (needsUpdate > 0) {
        console.log(`🔧 [PRÊT] ${needsUpdate} produits seront mis à jour lors de l'exécution`);
      }
    } else {
      console.log('\n🎉 [TERMINÉ] Opération de mise à jour terminée avec succès !');
      console.log('✅ [RECOMMANDATION] Tous les produits ont maintenant min_stock = null');
    }
  } catch (error) {
    console.error('❌ [ERREUR CRITIQUE]', error);
    process.exit(1);
  }
}

// Exécuter le script
console.log('🚀 [DÉMARRAGE] Définition min_stock = null...');
setMinStockNull()
  .then(() => {
    console.log(`✅ [TERMINÉ] Opération ${isDryRun ? 'simulée' : 'exécutée'} avec succès`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 [ÉCHEC] Erreur durant l'opération:", error);
    process.exit(1);
  });
