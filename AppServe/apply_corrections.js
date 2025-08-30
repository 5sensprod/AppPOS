const fs = require('fs');
const path = require('path');

// Chemins des fichiers
const currentDbPath = path.join('data', 'products.db');
const correctionsFile = 'ean13_invalides_current.json';
const backupDbPath = path.join('data', 'products_backup_corrections_' + Date.now() + '.db');

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

// Fonction pour charger les corrections
function loadCorrections(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Erreur lecture des corrections ${filePath}:`, error.message);
    return [];
  }
}

// Fonction pour mettre à jour le code-barres d'un produit
function updateBarcode(product, newBarcode) {
  if (!product.meta_data) {
    product.meta_data = [];
  }

  // Chercher l'item barcode existant
  const barcodeIndex = product.meta_data.findIndex((item) => item.key === 'barcode');

  if (barcodeIndex >= 0) {
    // Mettre à jour l'existant
    product.meta_data[barcodeIndex].value = newBarcode;
  } else {
    // Ajouter un nouveau (normalement ne devrait pas arriver)
    product.meta_data.push({
      key: 'barcode',
      value: newBarcode,
    });
  }

  return product;
}

// Fonction principale d'application des corrections
function applyCorrections() {
  console.log('🔧 Application des corrections EAN13...\n');

  // Vérifier que le fichier de corrections existe
  if (!fs.existsSync(correctionsFile)) {
    console.error(`❌ Fichier de corrections introuvable: ${correctionsFile}`);
    console.log("💡 Exécutez d'abord le script de validation pour générer ce fichier.");
    return;
  }

  // Charger les corrections
  console.log('📖 Chargement des corrections...');
  const corrections = loadCorrections(correctionsFile);
  console.log(`   • ${corrections.length} corrections trouvées`);

  if (corrections.length === 0) {
    console.log('✅ Aucune correction à appliquer !');
    return;
  }

  // Filtrer les corrections applicables (qui ont une correction proposée)
  const applicableCorrections = corrections.filter(
    (item) => item.correction && item.correction.corrected
  );

  console.log(`   • ${applicableCorrections.length} corrections applicables`);

  if (applicableCorrections.length === 0) {
    console.log('⚠️  Aucune correction automatique possible dans le fichier');
    return;
  }

  // Lire la base de données actuelle
  console.log('\n📖 Chargement de la base de données...');
  const currentProducts = readDatabase(currentDbPath);
  console.log(`   • ${currentProducts.length} produits chargés`);

  if (currentProducts.length === 0) {
    console.error('❌ Impossible de charger la base de données');
    return;
  }

  // Créer un index des produits par _id
  const productIndex = {};
  currentProducts.forEach((product, index) => {
    if (product._id) {
      productIndex[product._id] = index;
    }
  });

  // Créer une sauvegarde
  console.log("\n💾 Création d'une sauvegarde...");
  try {
    fs.copyFileSync(currentDbPath, backupDbPath);
    console.log(`   ✅ Sauvegarde créée: ${backupDbPath}`);
  } catch (error) {
    console.error(`   ❌ Erreur sauvegarde: ${error.message}`);
    return;
  }

  // Appliquer les corrections
  console.log('\n🔧 Application des corrections...');
  let successCount = 0;
  let errorCount = 0;
  const appliedCorrections = [];

  applicableCorrections.forEach((correction) => {
    const productIndex_val = productIndex[correction._id];

    if (productIndex_val === undefined) {
      console.error(`   ❌ Produit introuvable: ${correction._id}`);
      errorCount++;
      return;
    }

    const product = currentProducts[productIndex_val];

    try {
      // Appliquer la correction
      updateBarcode(product, correction.correction.corrected);

      appliedCorrections.push({
        _id: correction._id,
        name: correction.name || correction.sku,
        barcode_old: correction.barcode_original,
        barcode_new: correction.correction.corrected,
        reason: correction.correction.reason,
      });

      console.log(`   ✅ ${correction.name || correction.sku || correction._id}`);
      console.log(`      ${correction.barcode_original} → ${correction.correction.corrected}`);

      successCount++;
    } catch (error) {
      console.error(`   ❌ Erreur pour ${correction._id}: ${error.message}`);
      errorCount++;
    }
  });

  console.log(`\n📊 Résultats:`);
  console.log(`   • Corrections appliquées: ${successCount}`);
  console.log(`   • Erreurs: ${errorCount}`);

  if (successCount === 0) {
    console.log('⚠️  Aucune correction appliquée, pas de sauvegarde nécessaire');
    return;
  }

  // Sauvegarder la base mise à jour
  console.log('\n💾 Sauvegarde de la base corrigée...');
  try {
    saveDatabase(currentDbPath, currentProducts);
    console.log(`   ✅ Base de données mise à jour`);
  } catch (error) {
    console.error(`   ❌ Erreur sauvegarde: ${error.message}`);
    console.log(`   🔄 Tentative de restauration...`);
    try {
      fs.copyFileSync(backupDbPath, currentDbPath);
      console.log(`   ✅ Base restaurée depuis la sauvegarde`);
    } catch (restoreError) {
      console.error(`   ❌ Erreur restauration: ${restoreError.message}`);
      console.error(`   ⚠️  ATTENTION: Base potentiellement corrompue !`);
    }
    return;
  }

  // Générer un rapport des corrections appliquées
  const reportFile = 'rapport_corrections_ean13_' + Date.now() + '.json';
  const report = {
    timestamp: new Date().toISOString(),
    stats: {
      corrections_found: corrections.length,
      corrections_applicable: applicableCorrections.length,
      corrections_applied: successCount,
      corrections_failed: errorCount,
    },
    applied_corrections: appliedCorrections,
    backup_file: backupDbPath,
    source_file: correctionsFile,
  };

  try {
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n📊 Rapport détaillé sauvegardé: ${reportFile}`);
  } catch (error) {
    console.warn(`⚠️  Impossible de sauvegarder le rapport: ${error.message}`);
  }

  console.log('\n✅ Corrections EAN13 appliquées avec succès !');
  console.log(`🔧 ${successCount} codes-barres corrigés`);
  console.log(`💾 Sauvegarde disponible: ${backupDbPath}`);

  // Suggestion de vérification
  console.log(
    '\n💡 Suggestion: Exécutez à nouveau le script de validation pour vérifier les corrections'
  );
}

// Exécuter le script
if (require.main === module) {
  applyCorrections();
}

module.exports = { applyCorrections, updateBarcode };
