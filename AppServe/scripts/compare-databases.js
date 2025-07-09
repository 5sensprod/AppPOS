#!/usr/bin/env node
// scripts/compare-databases.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Configuration des chemins
const MY_DB_PATH = path.join(__dirname, '../data/products.db');
const CLIENT_DB_PATH = path.join(__dirname, '../data/source/products.db');

console.log('🔍 [COMPARAISON] Analyse des différences entre les bases de données');
console.log(`📂 [MA BDD] ${MY_DB_PATH}`);
console.log(`📂 [CLIENT BDD] ${CLIENT_DB_PATH}`);

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
    // Clé composite pour identifier un produit unique
    compositeKey: `${sku}_${gencode}_${name}`.toLowerCase(),
  };
}

// Fonction pour extraire le gencode/barcode (réutilisée du script detect-duplicates)
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

// Fonction pour créer un hash simple des données importantes d'un produit
function createProductHash(product) {
  const importantFields = {
    name: product.name || '',
    sku: product.sku || '',
    gencode: extractGencode(product),
    price: product.price || 0,
    stock: product.stock || 0,
    description: product.description || '',
    status: product.status || '',
    brand_id: product.brand_id || '',
    category_id: product.category_id || '',
    categories: JSON.stringify(product.categories || []),
    supplier_id: product.supplier_id || '',
  };

  return JSON.stringify(importantFields);
}

// Fonction pour comparer deux produits en détail
function compareProducts(myProduct, clientProduct) {
  const differences = [];

  const fieldsToCompare = [
    'name',
    'sku',
    'price',
    'stock',
    'description',
    'status',
    'brand_id',
    'category_id',
    'supplier_id',
    'woo_id',
  ];

  fieldsToCompare.forEach((field) => {
    const myValue = myProduct[field] || '';
    const clientValue = clientProduct[field] || '';

    if (JSON.stringify(myValue) !== JSON.stringify(clientValue)) {
      differences.push({
        field: field,
        myValue: myValue,
        clientValue: clientValue,
      });
    }
  });

  // Comparer les gencodes
  const myGencode = extractGencode(myProduct);
  const clientGencode = extractGencode(clientProduct);
  if (myGencode !== clientGencode) {
    differences.push({
      field: 'gencode',
      myValue: myGencode,
      clientValue: clientGencode,
    });
  }

  // Comparer les catégories (arrays)
  const myCategories = JSON.stringify(myProduct.categories || []);
  const clientCategories = JSON.stringify(clientProduct.categories || []);
  if (myCategories !== clientCategories) {
    differences.push({
      field: 'categories',
      myValue: myProduct.categories || [],
      clientValue: clientProduct.categories || [],
    });
  }

  return differences;
}

// Fonction pour créer l'en-tête de fichier
function createFileHeader(title, counts) {
  const date = new Date().toLocaleString('fr-FR');
  return `# ${title}
# Généré le: ${date}
# Nouveaux produits client: ${counts.newInClient}
# Produits modifiés: ${counts.modified}
# Produits supprimés chez client: ${counts.deletedInClient}
# Produits identiques: ${counts.identical}
# Format détaillé ci-dessous
#================================================

`;
}

// Fonction pour créer le nom de fichier
function createFileName(baseName) {
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return `${baseName}_${timestamp}.txt`;
}

async function compareDatabases() {
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
    const clientProductsMap = new Map();

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

    // Indexer les produits client
    clientProducts.forEach((product) => {
      const key = extractProductKey(product);

      // Index par ID
      clientProductsMap.set(product._id, { product, key, type: 'id' });

      // Index par SKU
      if (key.sku && key.sku !== 'N/A') {
        if (!clientProductsMap.has(`sku_${key.sku}`)) {
          clientProductsMap.set(`sku_${key.sku}`, { product, key, type: 'sku' });
        }
      }

      // Index par gencode
      if (key.gencode) {
        if (!clientProductsMap.has(`gencode_${key.gencode}`)) {
          clientProductsMap.set(`gencode_${key.gencode}`, { product, key, type: 'gencode' });
        }
      }
    });

    // Analyser les différences
    const results = {
      newInClient: [], // Produits qui existent chez le client mais pas chez moi
      modified: [], // Produits modifiés chez le client
      deletedInClient: [], // Produits qui existent chez moi mais pas chez le client
      identical: 0, // Produits identiques
    };

    console.log('\n🔍 [ANALYSE] Recherche des différences...');

    // Analyser chaque produit client
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
        // Produit trouvé, vérifier s'il y a des différences
        const myHash = createProductHash(myMatch.product);
        const clientHash = createProductHash(clientProduct);

        if (myHash === clientHash) {
          results.identical++;
        } else {
          // Produit modifié
          const differences = compareProducts(myMatch.product, clientProduct);
          results.modified.push({
            clientProduct,
            myProduct: myMatch.product,
            matchType,
            differences,
          });
        }
      } else {
        // Nouveau produit chez le client
        results.newInClient.push(clientProduct);
      }
    }

    // Analyser les produits supprimés chez le client
    for (const myProduct of myProducts) {
      const myKey = extractProductKey(myProduct);

      // Chercher si ce produit existe chez le client
      let clientMatch = null;

      // 1. Chercher par ID exact
      if (clientProductsMap.has(myProduct._id)) {
        clientMatch = clientProductsMap.get(myProduct._id);
      }
      // 2. Chercher par gencode
      else if (myKey.gencode && clientProductsMap.has(`gencode_${myKey.gencode}`)) {
        clientMatch = clientProductsMap.get(`gencode_${myKey.gencode}`);
      }
      // 3. Chercher par SKU
      else if (myKey.sku && myKey.sku !== 'N/A' && clientProductsMap.has(`sku_${myKey.sku}`)) {
        clientMatch = clientProductsMap.get(`sku_${myKey.sku}`);
      }

      if (!clientMatch) {
        results.deletedInClient.push(myProduct);
      }
    }

    // Afficher les résultats
    console.log('\n📊 [RÉSULTATS COMPARAISON]');
    console.log('==========================');
    console.log(`✅ Produits identiques: ${results.identical}`);
    console.log(`🆕 Nouveaux chez client: ${results.newInClient.length}`);
    console.log(`📝 Modifiés chez client: ${results.modified.length}`);
    console.log(`🗑️  Supprimés chez client: ${results.deletedInClient.length}`);

    // Afficher quelques exemples
    if (results.newInClient.length > 0) {
      console.log('\n🆕 [NOUVEAUX PRODUITS CLIENT] (échantillon)');
      results.newInClient.slice(0, 5).forEach((product, index) => {
        const gencode = extractGencode(product);
        console.log(
          `  ${index + 1}. ${product._id} | SKU: ${product.sku || 'N/A'} | Gencode: ${gencode || 'N/A'} | ${product.name || 'N/A'}`
        );
      });
      if (results.newInClient.length > 5) {
        console.log(`  ... et ${results.newInClient.length - 5} autres`);
      }
    }

    if (results.modified.length > 0) {
      console.log('\n📝 [PRODUITS MODIFIÉS] (échantillon)');
      results.modified.slice(0, 3).forEach((item, index) => {
        console.log(
          `  ${index + 1}. ${item.clientProduct._id} | Match: ${item.matchType} | ${item.clientProduct.name || 'N/A'}`
        );
        console.log(`     Différences: ${item.differences.map((d) => d.field).join(', ')}`);
      });
      if (results.modified.length > 3) {
        console.log(`  ... et ${results.modified.length - 3} autres`);
      }
    }

    if (results.deletedInClient.length > 0) {
      console.log('\n🗑️ [SUPPRIMÉS CHEZ CLIENT] (échantillon)');
      results.deletedInClient.slice(0, 5).forEach((product, index) => {
        const gencode = extractGencode(product);
        console.log(
          `  ${index + 1}. ${product._id} | SKU: ${product.sku || 'N/A'} | Gencode: ${gencode || 'N/A'} | ${product.name || 'N/A'}`
        );
      });
      if (results.deletedInClient.length > 5) {
        console.log(`  ... et ${results.deletedInClient.length - 5} autres`);
      }
    }

    // Exporter le rapport détaillé
    const exportPath = path.join(__dirname, '../data/export');
    if (!fs.existsSync(exportPath)) {
      fs.mkdirSync(exportPath, { recursive: true });
    }

    const fileName = createFileName('comparaison-bases-donnees');
    const filePath = path.join(exportPath, fileName);

    const counts = {
      newInClient: results.newInClient.length,
      modified: results.modified.length,
      deletedInClient: results.deletedInClient.length,
      identical: results.identical,
    };

    let fileContent = createFileHeader('Comparaison des bases de données produits', counts);

    // Section nouveaux produits
    if (results.newInClient.length > 0) {
      fileContent += '\n## NOUVEAUX PRODUITS CHEZ LE CLIENT\n';
      fileContent += '# Ces produits existent chez le client mais pas dans votre base\n';
      fileContent += '# Format: ID | SKU | GENCODE | NOM | PRIX | STOCK | STATUS\n\n';

      results.newInClient.forEach((product) => {
        const gencode = extractGencode(product);
        fileContent += `NOUVEAU | ${product._id} | ${product.sku || 'N/A'} | ${gencode || 'N/A'} | ${product.name || 'N/A'} | ${product.price || '0'} | ${product.stock || '0'} | ${product.status || 'N/A'}\n`;
      });
    }

    // Section produits modifiés
    if (results.modified.length > 0) {
      fileContent += '\n## PRODUITS MODIFIÉS CHEZ LE CLIENT\n';
      fileContent += '# Ces produits ont été modifiés chez le client\n';
      fileContent += '# Format: ID | MATCH_TYPE | CHAMP | VOTRE_VALEUR | VALEUR_CLIENT\n\n';

      results.modified.forEach((item) => {
        const product = item.clientProduct;
        fileContent += `MODIFIÉ | ${product._id} | ${item.matchType} | ${product.name || 'N/A'}\n`;

        item.differences.forEach((diff) => {
          fileContent += `  └─ ${diff.field} | ${JSON.stringify(diff.myValue)} | ${JSON.stringify(diff.clientValue)}\n`;
        });
        fileContent += '\n';
      });
    }

    // Section produits supprimés
    if (results.deletedInClient.length > 0) {
      fileContent += '\n## PRODUITS SUPPRIMÉS CHEZ LE CLIENT\n';
      fileContent += '# Ces produits existent dans votre base mais pas chez le client\n';
      fileContent += '# Format: ID | SKU | GENCODE | NOM | PRIX | STOCK\n\n';

      results.deletedInClient.forEach((product) => {
        const gencode = extractGencode(product);
        fileContent += `SUPPRIMÉ | ${product._id} | ${product.sku || 'N/A'} | ${gencode || 'N/A'} | ${product.name || 'N/A'} | ${product.price || '0'} | ${product.stock || '0'}\n`;
      });
    }

    fs.writeFileSync(filePath, fileContent, 'utf8');

    console.log(`\n✅ [EXPORT] Rapport détaillé généré: ${fileName}`);
    console.log(`📄 [EXPORT] Chemin: ${filePath}`);

    // Recommandations
    console.log('\n💡 [RECOMMANDATIONS]');
    console.log('====================');
    if (results.newInClient.length > 0) {
      console.log(
        `🆕 ${results.newInClient.length} nouveaux produits à intégrer depuis la base client`
      );
    }
    if (results.modified.length > 0) {
      console.log(`📝 ${results.modified.length} produits modifiés à synchroniser`);
    }
    if (results.deletedInClient.length > 0) {
      console.log(
        `🗑️ ${results.deletedInClient.length} produits à vérifier (supprimés chez le client)`
      );
    }
    if (
      results.newInClient.length === 0 &&
      results.modified.length === 0 &&
      results.deletedInClient.length === 0
    ) {
      console.log('✅ PARFAIT: Les bases de données sont synchronisées !');
    }
  } catch (error) {
    console.error('❌ [ERREUR CRITIQUE]', error);
    process.exit(1);
  }
}

// Exécuter la comparaison
console.log('🚀 [DÉMARRAGE] Comparaison des bases de données...');
compareDatabases()
  .then(() => {
    console.log('\n✅ [TERMINÉ] Comparaison terminée avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 [ÉCHEC] Erreur durant la comparaison:', error);
    process.exit(1);
  });
