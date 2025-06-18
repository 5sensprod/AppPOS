#!/usr/bin/env node
// scripts/resolve-duplicates.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Configuration des chemins
const NEW_DB_PATH = path.join(__dirname, '../data/products.db');

// Vérifier les arguments de ligne de commande
const args = process.argv.slice(2);
const isDryRun = args.includes('--test') || args.includes('--dry-run');
const isExecute = args.includes('--execute');
const resolveGencode = args.includes('--gencode') || args.includes('--all');
const resolveSku = args.includes('--sku') || args.includes('--all');

if (!isDryRun && !isExecute) {
  console.log('Usage:');
  console.log('  node scripts/resolve-duplicates.js --test [--gencode] [--sku] [--all]');
  console.log('  node scripts/resolve-duplicates.js --execute [--gencode] [--sku] [--all]');
  console.log('');
  console.log('Options:');
  console.log('  --gencode  : Résoudre uniquement les doublons par gencode/barcode');
  console.log('  --sku      : Résoudre uniquement les doublons par SKU');
  console.log('  --all      : Résoudre tous les types de doublons');
  console.log('  --test     : Mode simulation (recommandé)');
  console.log('  --execute  : Exécution réelle');
  process.exit(1);
}

if (!resolveGencode && !resolveSku) {
  console.log('❌ Veuillez spécifier le type de doublons à résoudre : --gencode, --sku, ou --all');
  process.exit(1);
}

console.log(
  `🔧 [RÉSOLUTION DOUBLONS] Mode: ${isDryRun ? 'TEST (simulation)' : 'EXÉCUTION RÉELLE'}`
);
console.log(
  `🎯 [CIBLES] Gencode: ${resolveGencode ? 'OUI' : 'NON'} | SKU: ${resolveSku ? 'OUI' : 'NON'}`
);
console.log('');

// Fonction pour extraire le gencode/barcode
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

// Fonction pour calculer le "score de qualité" d'un produit
function calculateQualityScore(product) {
  let score = 0;

  // Score basé sur la complétude des informations
  if (product.name && product.name.trim() !== '') score += 10;
  if (product.sku && product.sku.trim() !== '' && product.sku !== 'N/A') score += 10;
  if (extractGencode(product)) score += 15;
  if (product.description && product.description.trim() !== '') score += 5;
  if (product.price && product.price > 0) score += 10;
  if (product.stock && product.stock > 0) score += 8;
  if (product.brand_ref && product.brand_ref.name) score += 5;
  if (product.category_info && product.category_info.primary) score += 5;
  if (product.supplier_ref && product.supplier_ref.name) score += 3;
  if (product.image && product.image.url) score += 7;
  if (product.gallery_images && product.gallery_images.length > 0) score += 3;

  // Score basé sur l'activité commerciale
  if (product.total_sold && product.total_sold > 0) score += 15;
  if (product.revenue_total && product.revenue_total > 0) score += 10;
  if (product.sales_count && product.sales_count > 0) score += 5;

  // Score basé sur les métadonnées de qualité
  if (product.woo_id) score += 5; // Synchronisé avec WooCommerce
  if (product.last_sync) score += 3; // Récemment synchronisé

  // Pénalités
  if (product.status === 'draft') score -= 5;
  if (!product.name || product.name.includes('N/A')) score -= 10;
  if (!product.sku || product.sku === 'N/A') score -= 8;

  return Math.max(0, score);
}

// Fonction pour choisir le meilleur produit parmi les doublons
function chooseBestProduct(products, criterion) {
  if (products.length <= 1) return null;

  // Calculer le score de chaque produit
  const scoredProducts = products.map((product) => ({
    product,
    score: calculateQualityScore(product),
    hasStock: product.stock && product.stock > 0,
    hasSales: product.total_sold && product.total_sold > 0,
  }));

  // Trier par score décroissant
  scoredProducts.sort((a, b) => {
    // Priorité aux produits avec des ventes
    if (a.hasSales && !b.hasSales) return -1;
    if (!a.hasSales && b.hasSales) return 1;

    // Priorité aux produits avec du stock
    if (a.hasStock && !b.hasStock) return -1;
    if (!a.hasStock && b.hasStock) return 1;

    // Sinon, trier par score
    return b.score - a.score;
  });

  const best = scoredProducts[0];
  const toRemove = scoredProducts.slice(1);

  return {
    keep: best.product,
    remove: toRemove.map((item) => item.product),
    reason: `Score: ${best.score}, Stock: ${best.hasStock ? 'OUI' : 'NON'}, Ventes: ${best.hasSales ? 'OUI' : 'NON'}`,
    criterion,
  };
}

// Fonction pour créer le rapport de résolution
function createResolutionReport(resolutions, timestamp) {
  const exportPath = path.join(__dirname, '../data/export');
  if (!fs.existsSync(exportPath)) {
    fs.mkdirSync(exportPath, { recursive: true });
  }

  const fileName = `resolution-doublons_${timestamp}.txt`;
  const filePath = path.join(exportPath, fileName);

  let content = `# Résolution automatique des doublons
# Généré le: ${new Date().toLocaleString('fr-FR')}
# Total: ${resolutions.length} groupes résolus
# Format: ACTION | CRITÈRE | PRODUIT_CONSERVÉ | PRODUITS_SUPPRIMÉS | RAISON
#================================================

`;

  resolutions.forEach((resolution) => {
    const kept = resolution.keep;
    const removed = resolution.remove;
    content += `KEEP | ${resolution.criterion} | ${kept._id} (${kept.sku || 'N/A'}) | `;
    content +=
      removed.map((p) => `${p._id}(${p.sku || 'N/A'})`).join(',') + ` | ${resolution.reason}\n`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  return fileName;
}

async function resolveDuplicates() {
  try {
    if (!fs.existsSync(NEW_DB_PATH)) {
      console.error(`❌ [ERREUR] Base de données non trouvée: ${NEW_DB_PATH}`);
      process.exit(1);
    }

    console.log('📂 [INFO] Chargement de la base de données...');

    const db = new Datastore({ filename: NEW_DB_PATH, autoload: true });

    const products = await new Promise((resolve, reject) => {
      db.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    console.log(`📊 [INFO] ${products.length} produits chargés`);

    // Maps pour collecter les doublons
    const gencodeMap = new Map();
    const skuMap = new Map();

    // Analyser les produits
    products.forEach((product) => {
      const gencode = extractGencode(product);
      const sku = product.sku || '';

      // Collecter par gencode
      if (resolveGencode && gencode && gencode !== '') {
        if (!gencodeMap.has(gencode)) {
          gencodeMap.set(gencode, []);
        }
        gencodeMap.get(gencode).push(product);
      }

      // Collecter par SKU
      if (resolveSku && sku && sku !== '' && sku !== 'N/A') {
        if (!skuMap.has(sku)) {
          skuMap.set(sku, []);
        }
        skuMap.get(sku).push(product);
      }
    });

    // Identifier les doublons
    const duplicatesByGencode = Array.from(gencodeMap.entries()).filter(
      ([_, prods]) => prods.length > 1
    );
    const duplicatesBySku = Array.from(skuMap.entries()).filter(([_, prods]) => prods.length > 1);

    console.log('\n🔍 [DOUBLONS DÉTECTÉS]');
    console.log('=====================');
    if (resolveGencode) console.log(`Doublons par gencode: ${duplicatesByGencode.length} groupes`);
    if (resolveSku) console.log(`Doublons par SKU: ${duplicatesBySku.length} groupes`);

    // Préparer les résolutions
    let resolutions = [];
    let totalProductsToRemove = 0;

    // Résoudre les doublons par gencode
    if (resolveGencode) {
      console.log('\n🔧 [RÉSOLUTION GENCODE]');
      console.log('======================');

      duplicatesByGencode.forEach(([gencode, prods]) => {
        const resolution = chooseBestProduct(prods, `GENCODE:${gencode}`);
        if (resolution) {
          resolutions.push(resolution);
          totalProductsToRemove += resolution.remove.length;

          console.log(
            `📦 Gencode "${gencode}": Garder ${resolution.keep._id} (${resolution.keep.sku || 'N/A'})`
          );
          console.log(`   └─ Supprimer: ${resolution.remove.map((p) => p._id).join(', ')}`);
          console.log(`   └─ Raison: ${resolution.reason}`);
        }
      });
    }

    // Résoudre les doublons par SKU (en évitant ceux déjà traités par gencode)
    if (resolveSku) {
      console.log('\n🔧 [RÉSOLUTION SKU]');
      console.log('==================');

      duplicatesBySku.forEach(([sku, prods]) => {
        // Filtrer les produits déjà traités par gencode
        const alreadyProcessed = new Set();
        resolutions.forEach((res) => {
          alreadyProcessed.add(res.keep._id);
          res.remove.forEach((p) => alreadyProcessed.add(p._id));
        });

        const unprocessedProds = prods.filter((p) => !alreadyProcessed.has(p._id));

        if (unprocessedProds.length > 1) {
          const resolution = chooseBestProduct(unprocessedProds, `SKU:${sku}`);
          if (resolution) {
            resolutions.push(resolution);
            totalProductsToRemove += resolution.remove.length;

            console.log(
              `📦 SKU "${sku}": Garder ${resolution.keep._id} (${resolution.keep.name || 'N/A'})`
            );
            console.log(`   └─ Supprimer: ${resolution.remove.map((p) => p._id).join(', ')}`);
            console.log(`   └─ Raison: ${resolution.reason}`);
          }
        }
      });
    }

    // Statistiques
    console.log('\n📊 [RÉSUMÉ]');
    console.log('===========');
    console.log(`Groupes de doublons à résoudre: ${resolutions.length}`);
    console.log(`Produits à supprimer: ${totalProductsToRemove}`);
    console.log(`Produits restants: ${products.length - totalProductsToRemove}`);

    // Exécuter ou simuler
    if (resolutions.length > 0) {
      const timestamp = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');

      if (!isDryRun) {
        // Exécution réelle
        console.log('\n🗑️  [SUPPRESSION] Suppression des doublons...');
        let deleted = 0;
        let errors = [];

        for (const resolution of resolutions) {
          for (const productToRemove of resolution.remove) {
            try {
              await new Promise((resolve, reject) => {
                db.remove({ _id: productToRemove._id }, {}, (err, numRemoved) => {
                  if (err) reject(err);
                  else resolve(numRemoved);
                });
              });
              deleted++;
              console.log(`✅ Supprimé: ${productToRemove._id}`);
            } catch (error) {
              errors.push(`Erreur suppression ${productToRemove._id}: ${error.message}`);
              console.error(`❌ Erreur: ${productToRemove._id}`);
            }
          }
        }

        console.log(`\n🎉 [SUCCÈS] ${deleted} produits supprimés`);
        if (errors.length > 0) {
          console.log(`⚠️  ${errors.length} erreurs`);
        }
      } else {
        console.log('\n🔄 [SIMULATION] Mode test - aucune suppression effectuée');
      }

      // Créer le rapport
      const reportFile = createResolutionReport(resolutions, timestamp);
      console.log(`📄 [RAPPORT] Généré: ${reportFile}`);

      if (isDryRun) {
        console.log('\n💡 [INFO] Utilisez --execute pour appliquer les suppressions');
      }
    } else {
      console.log('\n✅ [PARFAIT] Aucun doublon à résoudre !');
    }
  } catch (error) {
    console.error('❌ [ERREUR CRITIQUE]', error);
    process.exit(1);
  }
}

// Exécuter la résolution
console.log('🚀 [DÉMARRAGE] Résolution automatique des doublons...');
resolveDuplicates()
  .then(() => {
    console.log(`✅ [TERMINÉ] Résolution ${isDryRun ? 'simulée' : 'exécutée'} avec succès`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 [ÉCHEC] Erreur durant la résolution:', error);
    process.exit(1);
  });
