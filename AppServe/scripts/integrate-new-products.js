#!/usr/bin/env node
// scripts/integrate-new-products.js
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

if (!isDryRun && !isExecute) {
  console.log('Usage:');
  console.log('  node scripts/integrate-new-products.js --test     # Mode simulation');
  console.log('  node scripts/integrate-new-products.js --execute # Exécution réelle');
  process.exit(1);
}

console.log(`🔧 [INTÉGRATION] Mode: ${isDryRun ? 'TEST (simulation)' : 'EXÉCUTION RÉELLE'}`);
console.log('🎯 [OBJECTIF] Intégration des nouveaux produits client dans ma base');
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

// Fonction pour préparer un produit pour l'insertion
function prepareProductForInsertion(clientProduct) {
  // Créer une copie du produit client
  const newProduct = { ...clientProduct };

  // Supprimer l'ancien _id pour laisser NeDB en générer un nouveau
  delete newProduct._id;

  // Ajouter des valeurs par défaut si nécessaires (comme dans votre BaseModel)
  const defaultValues = {
    total_sold: 0,
    sales_count: 0,
    last_sold_at: null,
    revenue_total: 0,
    type: 'simple',
  };

  // Merger avec les valeurs par défaut (sans écraser les valeurs existantes)
  Object.keys(defaultValues).forEach((key) => {
    if (newProduct[key] === undefined || newProduct[key] === null) {
      newProduct[key] = defaultValues[key];
    }
  });

  // Ajouter des métadonnées d'intégration
  newProduct.imported_from_client = true;
  newProduct.imported_at = new Date().toISOString();
  newProduct.original_client_id = clientProduct._id;

  return newProduct;
}

// Fonction pour créer le rapport d'intégration
function createIntegrationReport(newProducts, timestamp) {
  const exportPath = path.join(__dirname, '../data/export');
  if (!fs.existsSync(exportPath)) {
    fs.mkdirSync(exportPath, { recursive: true });
  }

  const fileName = `integration-nouveaux-produits_${timestamp}.txt`;
  const filePath = path.join(exportPath, fileName);

  let content = `# Intégration des nouveaux produits client
# Généré le: ${new Date().toLocaleString('fr-FR')}
# Total: ${newProducts.length} nouveaux produits intégrés
# Format: NOUVEAU_ID | ANCIEN_ID_CLIENT | SKU | GENCODE | NOM | PRIX | STOCK
#================================================

`;

  newProducts.forEach((integration) => {
    const product = integration.product;
    const gencode = extractGencode(integration.originalProduct);
    content += `${integration.newId || 'PENDING'} | ${integration.originalProduct._id} | ${product.sku || 'N/A'} | ${gencode || 'N/A'} | ${product.name || 'N/A'} | ${product.price || '0'} | ${product.stock || '0'}\n`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  return fileName;
}

async function integrateNewProducts() {
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

    // Créer des maps pour la comparaison (même logique que le script de comparaison)
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

    // Identifier les nouveaux produits chez le client
    console.log('\n🔍 [ANALYSE] Identification des nouveaux produits...');

    const newProducts = [];

    for (const clientProduct of clientProducts) {
      const clientKey = extractProductKey(clientProduct);

      // Chercher une correspondance dans ma base
      let myMatch = null;

      // 1. Chercher par ID exact
      if (myProductsMap.has(clientProduct._id)) {
        myMatch = myProductsMap.get(clientProduct._id);
      }
      // 2. Chercher par gencode
      else if (clientKey.gencode && myProductsMap.has(`gencode_${clientKey.gencode}`)) {
        myMatch = myProductsMap.get(`gencode_${clientKey.gencode}`);
      }
      // 3. Chercher par SKU
      else if (
        clientKey.sku &&
        clientKey.sku !== 'N/A' &&
        myProductsMap.has(`sku_${clientKey.sku}`)
      ) {
        myMatch = myProductsMap.get(`sku_${clientKey.sku}`);
      }

      if (!myMatch) {
        // Nouveau produit chez le client
        newProducts.push(clientProduct);
      }
    }

    console.log(`📊 [RÉSULTAT] ${newProducts.length} nouveaux produits identifiés`);

    if (newProducts.length === 0) {
      console.log('✅ [INFO] Aucun nouveau produit à intégrer !');
      return;
    }

    // Afficher la liste des nouveaux produits
    console.log('\n🆕 [NOUVEAUX PRODUITS À INTÉGRER]');
    console.log('================================');
    newProducts.forEach((product, index) => {
      const gencode = extractGencode(product);
      console.log(`${index + 1}. ID: ${product._id}`);
      console.log(`   └─ SKU: ${product.sku || 'N/A'}`);
      console.log(`   └─ Gencode: ${gencode || 'N/A'}`);
      console.log(`   └─ Nom: ${product.name || 'N/A'}`);
      console.log(`   └─ Prix: ${product.price || '0'}€`);
      console.log(`   └─ Stock: ${product.stock || '0'}`);
      console.log(`   └─ Status: ${product.status || 'N/A'}`);
      console.log('');
    });

    // Préparer les produits pour l'insertion
    console.log('🔧 [PRÉPARATION] Préparation des produits pour linsertion...');

    const productsToInsert = newProducts.map((clientProduct) => {
      const preparedProduct = prepareProductForInsertion(clientProduct);
      return {
        originalProduct: clientProduct,
        product: preparedProduct,
      };
    });

    // Exécuter l'insertion ou la simulation
    if (!isDryRun) {
      console.log('\n💾 [INSERTION] Insertion des nouveaux produits...');

      const insertedProducts = [];
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const { originalProduct, product } of productsToInsert) {
        try {
          const insertedProduct = await new Promise((resolve, reject) => {
            myDb.insert(product, (err, newDoc) => {
              if (err) reject(err);
              else resolve(newDoc);
            });
          });

          insertedProducts.push({
            originalProduct,
            product,
            newId: insertedProduct._id,
          });

          successCount++;
          console.log(`✅ Inséré: ${insertedProduct._id} (${product.name || 'N/A'})`);
        } catch (error) {
          errorCount++;
          const errorMsg = `Erreur insertion ${originalProduct._id}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`\n🎉 [SUCCÈS] ${successCount} produits insérés avec succès`);
      if (errorCount > 0) {
        console.log(`⚠️ [ERREURS] ${errorCount} erreurs d'insertion`);
        errors.forEach((error) => console.log(`   - ${error}`));
      }

      // Créer le rapport d'intégration
      if (insertedProducts.length > 0) {
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        const reportFile = createIntegrationReport(insertedProducts, timestamp);
        console.log(`📄 [RAPPORT] Généré: ${reportFile}`);
      }

      // Vérification finale
      const finalCount = await new Promise((resolve, reject) => {
        myDb.count({}, (err, count) => {
          if (err) reject(err);
          else resolve(count);
        });
      });

      console.log(`📊 [FINAL] Total produits dans ma base: ${finalCount} (+${successCount})`);
    } else {
      console.log('\n🔄 [SIMULATION] Mode test - aucune insertion effectuée');

      console.log('\n📋 [APERÇU INSERTION]');
      productsToInsert.forEach((item, index) => {
        console.log(`${index + 1}. SERAIT INSÉRÉ:`);
        console.log(`   └─ Ancien ID client: ${item.originalProduct._id}`);
        console.log(`   └─ Nouveau nom: ${item.product.name || 'N/A'}`);
        console.log(`   └─ Nouveau SKU: ${item.product.sku || 'N/A'}`);
        console.log(`   └─ Importé de client: ${item.product.imported_from_client}`);
        console.log(`   └─ ID client original: ${item.product.original_client_id}`);
      });

      console.log('\n💡 [INFO] Utilisez --execute pour effectuer linsertion réelle');
    }

    // Recommandations
    console.log('\n💡 [RECOMMANDATIONS]');
    console.log('====================');
    console.log("✅ Vérifiez les produits insérés dans votre interface d'administration");
    console.log('✅ Contrôlez que les catégories et fournisseurs sont corrects');
    console.log('✅ Vérifiez les images et descriptions si nécessaire');
    console.log('✅ Prochaine étape: synchroniser les produits modifiés');
  } catch (error) {
    console.error('❌ [ERREUR CRITIQUE]', error);
    process.exit(1);
  }
}

// Exécuter l'intégration
console.log('🚀 [DÉMARRAGE] Intégration des nouveaux produits...');
integrateNewProducts()
  .then(() => {
    console.log(`\n✅ [TERMINÉ] Intégration ${isDryRun ? 'simulée' : 'exécutée'} avec succès`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 [ÉCHEC] Erreur durant l'intégration:", error);
    process.exit(1);
  });
