#!/usr/bin/env node
// scripts/sync-stock-gencode.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Configuration des chemins
const MY_DB_PATH = path.join(__dirname, '../data/products.db');
const CLIENT_DB_PATH = path.join(__dirname, '../data/source/products.db');

// Vérifier les arguments de ligne de commande
const args = process.argv.slice(2);
const isDryRun = args.includes('--test') || args.includes('--dry-run');
const isExecute = args.includes('--execute');
const syncStock = args.includes('--stock') || args.includes('--all');
const syncGencode = args.includes('--gencode') || args.includes('--all');

if (!isDryRun && !isExecute) {
  console.log('Usage:');
  console.log('  node scripts/sync-stock-gencode.js --test [--stock] [--gencode] [--all]');
  console.log('  node scripts/sync-stock-gencode.js --execute [--stock] [--gencode] [--all]');
  console.log('');
  console.log('Options:');
  console.log('  --stock    : Synchroniser uniquement les stocks');
  console.log('  --gencode  : Synchroniser uniquement les gencodes/barcodes');
  console.log('  --all      : Synchroniser stock ET gencode');
  console.log('  --test     : Mode simulation (recommandé)');
  console.log('  --execute  : Exécution réelle');
  process.exit(1);
}

if (!syncStock && !syncGencode) {
  console.log('❌ Veuillez spécifier quoi synchroniser : --stock, --gencode, ou --all');
  process.exit(1);
}

console.log(`🔧 [SYNCHRONISATION] Mode: ${isDryRun ? 'TEST (simulation)' : 'EXÉCUTION RÉELLE'}`);
console.log(
  `🎯 [CIBLES] Stock: ${syncStock ? 'OUI' : 'NON'} | Gencode: ${syncGencode ? 'OUI' : 'NON'}`
);
console.log('');

// Fonction pour extraire le gencode/barcode (réutilisée)
function extractGencode(product) {
  let gencode = product.gencode || product.barcode || product.ean || product.upc || '';

  if (!gencode && product.meta_data && Array.isArray(product.meta_data)) {
    const barcodeMetaData = product.meta_data.find(
      (meta) =>
        meta.key === 'barcode' || meta.key === 'gencode' || meta.key === 'ean' || meta.key === 'upc'
    );
    if (barcodeMetaData && barcodeMetaData.value) {
      gencode = barcodeMetaData.value;
    }
  }

  return gencode ? String(gencode).trim() : '';
}

// Fonction pour extraire les champs clés d'un produit
function extractProductKey(product) {
  const gencode = extractGencode(product);
  const sku = product.sku || '';
  const name = (product.name || '').toLowerCase().trim();

  return {
    id: product._id,
    sku: sku,
    gencode: gencode,
    name: name,
    compositeKey: `${sku}_${gencode}_${name}`.toLowerCase(),
  };
}

// Fonction pour comparer stock et gencode spécifiquement
function compareStockAndGencode(myProduct, clientProduct) {
  const differences = [];

  // Comparer le stock
  if (syncStock) {
    const myStock = Number(myProduct.stock) || 0;
    const clientStock = Number(clientProduct.stock) || 0;

    if (myStock !== clientStock) {
      differences.push({
        field: 'stock',
        myValue: myStock,
        clientValue: clientStock,
        type: 'number',
      });
    }
  }

  // Comparer les gencodes
  if (syncGencode) {
    const myGencode = extractGencode(myProduct);
    const clientGencode = extractGencode(clientProduct);

    if (myGencode !== clientGencode) {
      differences.push({
        field: 'gencode',
        myValue: myGencode,
        clientValue: clientGencode,
        type: 'string',
      });
    }
  }

  return differences;
}

// Fonction pour appliquer les modifications
function applyModifications(myProduct, clientProduct, differences) {
  const updates = {};

  differences.forEach((diff) => {
    switch (diff.field) {
      case 'stock':
        updates.stock = diff.clientValue;
        break;

      case 'gencode':
        // Déterminer quel champ utiliser pour le gencode
        if (clientProduct.gencode) {
          updates.gencode = diff.clientValue;
        } else if (clientProduct.barcode) {
          updates.barcode = diff.clientValue;
        } else if (clientProduct.ean) {
          updates.ean = diff.clientValue;
        } else if (clientProduct.upc) {
          updates.upc = diff.clientValue;
        }

        // Gérer les meta_data si c'est là que le gencode est stocké
        if (clientProduct.meta_data && Array.isArray(clientProduct.meta_data)) {
          const barcodeMetaData = clientProduct.meta_data.find(
            (meta) =>
              meta.key === 'barcode' ||
              meta.key === 'gencode' ||
              meta.key === 'ean' ||
              meta.key === 'upc'
          );
          if (barcodeMetaData) {
            updates.meta_data = [...(myProduct.meta_data || [])];
            // Mettre à jour ou ajouter le meta_data du barcode
            const existingMetaIndex = updates.meta_data.findIndex(
              (meta) => meta.key === barcodeMetaData.key
            );
            if (existingMetaIndex >= 0) {
              updates.meta_data[existingMetaIndex] = barcodeMetaData;
            } else {
              updates.meta_data.push(barcodeMetaData);
            }
          }
        }
        break;
    }
  });

  // Ajouter des métadonnées de synchronisation
  updates.last_sync_from_client = new Date().toISOString();
  updates.sync_fields = differences.map((d) => d.field);

  return updates;
}

// Fonction pour créer le rapport de synchronisation
function createSyncReport(synchronizations, timestamp) {
  const exportPath = path.join(__dirname, '../data/export');
  if (!fs.existsSync(exportPath)) {
    fs.mkdirSync(exportPath, { recursive: true });
  }

  const fileName = `sync-stock-gencode_${timestamp}.txt`;
  const filePath = path.join(exportPath, fileName);

  let content = `# Synchronisation Stock et Gencode
# Généré le: ${new Date().toLocaleString('fr-FR')}
# Total: ${synchronizations.length} produits synchronisés
# Champs: ${syncStock ? 'Stock' : ''}${syncStock && syncGencode ? ' + ' : ''}${syncGencode ? 'Gencode' : ''}
# Format: ID | MATCH_TYPE | CHAMP | ANCIENNE_VALEUR | NOUVELLE_VALEUR | SKU | NOM
#================================================

`;

  synchronizations.forEach((sync) => {
    const product = sync.myProduct;
    content += `${product._id} | ${sync.matchType} | ${product.sku || 'N/A'} | ${product.name || 'N/A'}\n`;

    sync.differences.forEach((diff) => {
      content += `  └─ ${diff.field.toUpperCase()} | ${diff.myValue} → ${diff.clientValue}\n`;
    });
    content += '\n';
  });

  fs.writeFileSync(filePath, content, 'utf8');
  return fileName;
}

async function syncStockAndGencode() {
  try {
    // Vérifier que les fichiers existent
    if (!fs.existsSync(MY_DB_PATH)) {
      console.error(`❌ [ERREUR] Ma base de données non trouvée: ${MY_DB_PATH}`);
      process.exit(1);
    }

    if (!fs.existsSync(CLIENT_DB_PATH)) {
      console.error(`❌ [ERREUR] Base de données client non trouvée: ${CLIENT_DB_PATH}`);
      console.log(`💡 [INFO] Veuillez copier la base du client dans: ${CLIENT_DB_PATH}`);
      process.exit(1);
    }

    console.log('📂 [INFO] Chargement des bases de données...');

    // Charger ma base de données
    const myDb = new Datastore({ filename: MY_DB_PATH, autoload: true });
    const myProducts = await new Promise((resolve, reject) => {
      myDb.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    // Charger la base de données client
    const clientDb = new Datastore({ filename: CLIENT_DB_PATH, autoload: true });
    const clientProducts = await new Promise((resolve, reject) => {
      clientDb.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    console.log(`📊 [INFO] Ma BDD: ${myProducts.length} produits`);
    console.log(`📊 [INFO] Client BDD: ${clientProducts.length} produits`);

    // Créer des maps pour la comparaison
    const myProductsMap = new Map();

    // Indexer mes produits par différentes clés
    myProducts.forEach((product) => {
      const key = extractProductKey(product);

      // Index par ID
      myProductsMap.set(product._id, { product, key, type: 'id' });

      // Index par SKU si disponible et unique
      if (key.sku && key.sku !== 'N/A') {
        if (!myProductsMap.has(`sku_${key.sku}`)) {
          myProductsMap.set(`sku_${key.sku}`, { product, key, type: 'sku' });
        }
      }

      // Index par gencode si disponible et unique
      if (key.gencode) {
        if (!myProductsMap.has(`gencode_${key.gencode}`)) {
          myProductsMap.set(`gencode_${key.gencode}`, { product, key, type: 'gencode' });
        }
      }
    });

    // Identifier les produits à synchroniser
    console.log('\n🔍 [ANALYSE] Identification des produits à synchroniser...');

    const toSync = [];

    for (const clientProduct of clientProducts) {
      const clientKey = extractProductKey(clientProduct);

      // Chercher une correspondance dans ma base
      let myMatch = null;
      let matchType = null;

      // 1. Chercher par ID exact
      if (myProductsMap.has(clientProduct._id)) {
        myMatch = myProductsMap.get(clientProduct._id);
        matchType = 'id';
      }
      // 2. Chercher par gencode
      else if (clientKey.gencode && myProductsMap.has(`gencode_${clientKey.gencode}`)) {
        myMatch = myProductsMap.get(`gencode_${clientKey.gencode}`);
        matchType = 'gencode';
      }
      // 3. Chercher par SKU
      else if (
        clientKey.sku &&
        clientKey.sku !== 'N/A' &&
        myProductsMap.has(`sku_${clientKey.sku}`)
      ) {
        myMatch = myProductsMap.get(`sku_${clientKey.sku}`);
        matchType = 'sku';
      }

      if (myMatch) {
        // Produit trouvé, vérifier les différences de stock/gencode
        const differences = compareStockAndGencode(myMatch.product, clientProduct);

        if (differences.length > 0) {
          toSync.push({
            myProduct: myMatch.product,
            clientProduct: clientProduct,
            matchType,
            differences,
          });
        }
      }
    }

    console.log(`📊 [RÉSULTAT] ${toSync.length} produits nécessitent une synchronisation`);

    if (toSync.length === 0) {
      console.log('✅ [INFO] Aucun produit à synchroniser !');
      return;
    }

    // Analyser les types de modifications
    let stockChanges = 0;
    let gencodeChanges = 0;

    toSync.forEach((sync) => {
      sync.differences.forEach((diff) => {
        if (diff.field === 'stock') stockChanges++;
        if (diff.field === 'gencode') gencodeChanges++;
      });
    });

    console.log(
      `📈 [STATS] ${stockChanges} modifications de stock, ${gencodeChanges} modifications de gencode`
    );

    // Afficher la liste des modifications
    console.log('\n📝 [MODIFICATIONS À APPLIQUER]');
    console.log('==============================');
    toSync.slice(0, 10).forEach((sync, index) => {
      console.log(
        `${index + 1}. ${sync.myProduct._id} (${sync.matchType}) - ${sync.myProduct.name || 'N/A'}`
      );
      sync.differences.forEach((diff) => {
        const icon = diff.field === 'stock' ? '📦' : '🏷️';
        console.log(
          `   ${icon} ${diff.field.toUpperCase()}: ${diff.myValue} → ${diff.clientValue}`
        );
      });
      console.log('');
    });

    if (toSync.length > 10) {
      console.log(`... et ${toSync.length - 10} autres modifications`);
    }

    // Exécuter la synchronisation ou la simulation
    if (!isDryRun) {
      console.log('\n🔄 [SYNCHRONISATION] Application des modifications...');

      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      const appliedSyncs = [];

      for (const sync of toSync) {
        try {
          const updates = applyModifications(sync.myProduct, sync.clientProduct, sync.differences);

          await new Promise((resolve, reject) => {
            myDb.update({ _id: sync.myProduct._id }, { $set: updates }, {}, (err, numReplaced) => {
              if (err) reject(err);
              else resolve(numReplaced);
            });
          });

          appliedSyncs.push(sync);
          successCount++;

          const changedFields = sync.differences.map((d) => d.field).join(', ');
          console.log(`✅ Synchronisé: ${sync.myProduct._id} (${changedFields})`);
        } catch (error) {
          errorCount++;
          const errorMsg = `Erreur sync ${sync.myProduct._id}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`\n🎉 [SUCCÈS] ${successCount} produits synchronisés`);
      if (errorCount > 0) {
        console.log(`⚠️ [ERREURS] ${errorCount} erreurs de synchronisation`);
        errors.forEach((error) => console.log(`   - ${error}`));
      }

      // Créer le rapport de synchronisation
      if (appliedSyncs.length > 0) {
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        const reportFile = createSyncReport(appliedSyncs, timestamp);
        console.log(`📄 [RAPPORT] Généré: ${reportFile}`);
      }
    } else {
      console.log('\n🔄 [SIMULATION] Mode test - aucune modification effectuée');

      console.log('\n📋 [APERÇU SYNCHRONISATION]');
      toSync.slice(0, 5).forEach((sync, index) => {
        console.log(`${index + 1}. SERAIT MODIFIÉ:`);
        console.log(`   └─ ID: ${sync.myProduct._id}`);
        console.log(`   └─ Produit: ${sync.myProduct.name || 'N/A'}`);
        console.log(`   └─ Match par: ${sync.matchType}`);
        sync.differences.forEach((diff) => {
          console.log(`   └─ ${diff.field.toUpperCase()}: ${diff.myValue} → ${diff.clientValue}`);
        });
        console.log('');
      });

      console.log('\n💡 [INFO] Utilisez --execute pour effectuer la synchronisation réelle');
    }

    // Recommandations
    console.log('\n💡 [RECOMMANDATIONS]');
    console.log('====================');
    if (stockChanges > 0) {
      console.log(`📦 ${stockChanges} stocks ont été ${isDryRun ? 'seraient' : ''} mis à jour`);
    }
    if (gencodeChanges > 0) {
      console.log(`🏷️ ${gencodeChanges} gencodes ont été ${isDryRun ? 'seraient' : ''} mis à jour`);
    }
    console.log("✅ Vérifiez les modifications dans votre interface d'administration");
    console.log('✅ Contrôlez que les stocks correspondent à la réalité');
    if (!isDryRun) {
      console.log(
        '✅ Prochaine étape: traiter les autres produits modifiés (prix, descriptions, etc.)'
      );
    }
  } catch (error) {
    console.error('❌ [ERREUR CRITIQUE]', error);
    process.exit(1);
  }
}

// Exécuter la synchronisation
console.log('🚀 [DÉMARRAGE] Synchronisation stock et gencode...');
syncStockAndGencode()
  .then(() => {
    console.log(`\n✅ [TERMINÉ] Synchronisation ${isDryRun ? 'simulée' : 'exécutée'} avec succès`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 [ÉCHEC] Erreur durant la synchronisation:', error);
    process.exit(1);
  });
