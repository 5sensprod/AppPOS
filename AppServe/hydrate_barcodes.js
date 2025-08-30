const fs = require('fs');
const path = require('path');

// Chemins vers les bases de données
const sourceDbPath = path.join('data', 'source', 'products.db');
const currentDbPath = path.join('data', 'products.db');
const backupDbPath = path.join('data', 'products_backup_' + Date.now() + '.db');

// Fonction pour lire et parser une base de données NeDB
function readDatabase(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    return lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter((item) => item !== null);
  } catch (error) {
    console.error(`Erreur lecture ${filePath}:`, error.message);
    return [];
  }
}

// Fonction pour sauvegarder une base de données NeDB
function saveDatabase(filePath, products) {
  const content = products.map((product) => JSON.stringify(product)).join('\n');
  fs.writeFileSync(filePath, content, 'utf8');
}

// Fonction pour vérifier si un produit a déjà un code-barres
function hasBarcode(product) {
  if (!product.meta_data || !Array.isArray(product.meta_data)) {
    return false;
  }

  const barcodeItem = product.meta_data.find((item) => item.key === 'barcode');
  return barcodeItem && barcodeItem.value && barcodeItem.value.trim() !== '';
}

// Fonction pour ajouter/mettre à jour le code-barres
function addBarcode(product, gencode) {
  // Initialiser meta_data si nécessaire
  if (!product.meta_data) {
    product.meta_data = [];
  }

  // Chercher un item barcode existant
  const barcodeIndex = product.meta_data.findIndex((item) => item.key === 'barcode');

  if (barcodeIndex >= 0) {
    // Mettre à jour l'existant
    product.meta_data[barcodeIndex].value = gencode;
  } else {
    // Ajouter un nouveau
    product.meta_data.push({
      key: 'barcode',
      value: gencode,
    });
  }

  return product;
}

// Fonction principale d'hydratation
function hydrateProducts() {
  console.log("🚀 Début de l'hydratation des codes-barres...\n");

  // Lire les bases de données
  console.log('📖 Lecture des bases de données...');
  const sourceProducts = readDatabase(sourceDbPath);
  const currentProducts = readDatabase(currentDbPath);

  console.log(`   • Source: ${sourceProducts.length} produits`);
  console.log(`   • Actuelle: ${currentProducts.length} produits`);

  if (sourceProducts.length === 0 || currentProducts.length === 0) {
    console.error('❌ Impossible de charger les bases de données');
    return;
  }

  // Créer un index des produits source par _id
  console.log('\n🔍 Indexation des produits source...');
  const sourceIndex = {};
  let sourceWithGencode = 0;

  sourceProducts.forEach((product) => {
    if (product._id && product.gencode) {
      sourceIndex[product._id] = product;
      sourceWithGencode++;
    }
  });

  console.log(`   • ${sourceWithGencode} produits source ont un gencode`);

  // Analyser les produits actuels
  console.log('\n🔍 Analyse des produits actuels...');
  let productsWithoutBarcode = 0;
  let productsToUpdate = [];

  currentProducts.forEach((product, index) => {
    const hasCurrentBarcode = hasBarcode(product);

    if (!hasCurrentBarcode) {
      productsWithoutBarcode++;

      // Chercher dans la source
      if (product._id && sourceIndex[product._id]) {
        const sourceProduct = sourceIndex[product._id];
        productsToUpdate.push({
          index: index,
          product: product,
          gencode: sourceProduct.gencode,
          sourceRef: sourceProduct.reference || sourceProduct.designation,
        });
      }
    }
  });

  console.log(`   • ${productsWithoutBarcode} produits sans code-barres`);
  console.log(`   • ${productsToUpdate.length} produits peuvent être mis à jour`);

  if (productsToUpdate.length === 0) {
    console.log('\n✅ Aucune mise à jour nécessaire !');
    return;
  }

  // Créer une sauvegarde
  console.log("\n💾 Création d'une sauvegarde...");
  try {
    fs.copyFileSync(currentDbPath, backupDbPath);
    console.log(`   ✅ Sauvegarde créée: ${backupDbPath}`);
  } catch (error) {
    console.error(`   ❌ Erreur sauvegarde: ${error.message}`);
    return;
  }

  // Effectuer les mises à jour
  console.log('\n🔄 Mise à jour des produits...');
  let updatedCount = 0;

  productsToUpdate.forEach((item) => {
    try {
      addBarcode(currentProducts[item.index], item.gencode);
      updatedCount++;

      console.log(`   ✅ ${item.product.name || item.sourceRef} → ${item.gencode}`);
    } catch (error) {
      console.error(`   ❌ Erreur pour ${item.product._id}: ${error.message}`);
    }
  });

  // Sauvegarder la base mise à jour
  console.log(`\n💾 Sauvegarde de la base mise à jour...`);
  try {
    saveDatabase(currentDbPath, currentProducts);
    console.log(`   ✅ ${updatedCount} produits mis à jour`);
  } catch (error) {
    console.error(`   ❌ Erreur sauvegarde: ${error.message}`);
    console.log(`   🔄 Restauration depuis la sauvegarde...`);
    try {
      fs.copyFileSync(backupDbPath, currentDbPath);
      console.log(`   ✅ Base restaurée`);
    } catch (restoreError) {
      console.error(`   ❌ Erreur restauration: ${restoreError.message}`);
    }
    return;
  }

  // Générer un rapport
  const reportFile = 'rapport_hydratation_' + Date.now() + '.json';
  const report = {
    timestamp: new Date().toISOString(),
    stats: {
      total_source: sourceProducts.length,
      total_current: currentProducts.length,
      source_with_gencode: sourceWithGencode,
      products_without_barcode: productsWithoutBarcode,
      products_updated: updatedCount,
    },
    updated_products: productsToUpdate.map((item) => ({
      _id: item.product._id,
      name: item.product.name,
      reference: item.sourceRef,
      gencode_added: item.gencode,
    })),
    backup_file: backupDbPath,
  };

  try {
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n📊 Rapport sauvegardé: ${reportFile}`);
  } catch (error) {
    console.warn(`⚠️  Impossible de sauvegarder le rapport: ${error.message}`);
  }

  console.log('\n✅ Hydratation terminée !');
  console.log(`📈 Résumé: ${updatedCount} produits mis à jour`);
  console.log(`💾 Sauvegarde disponible: ${backupDbPath}`);
}

// Exécuter le script
if (require.main === module) {
  hydrateProducts();
}

module.exports = { hydrateProducts, hasBarcode, addBarcode };
