const fs = require('fs');
const path = require('path');

// Chemins vers les bases de données (relatifs au répertoire courant)
const sourceDbPath = path.join('data', 'source', 'products.db');
const currentDbPath = path.join('data', 'products.db');

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
          console.warn(`Ligne ignorée (format invalide): ${line.substring(0, 50)}...`);
          return null;
        }
      })
      .filter((item) => item !== null);
  } catch (error) {
    console.error(`Erreur lors de la lecture de ${filePath}:`, error.message);
    return [];
  }
}

// Fonction pour extraire les gencodes de la base de données actuelle
function extractCurrentGencodes(products) {
  const gencodes = new Set();

  products.forEach((product) => {
    // Chercher dans meta_data pour la clé "barcode"
    if (product.meta_data && Array.isArray(product.meta_data)) {
      const barcodeItem = product.meta_data.find((item) => item.key === 'barcode');
      if (barcodeItem && barcodeItem.value) {
        gencodes.add(barcodeItem.value);
      }
    }
  });

  return gencodes;
}

// Fonction pour trouver les produits source avec gencode manquant
function findMissingGencodes(sourceProducts, currentGencodes) {
  return sourceProducts.filter((product) => {
    // Vérifier si le produit source a un gencode
    if (!product.gencode) {
      return false;
    }

    // Vérifier si ce gencode n'existe pas dans la base actuelle
    return !currentGencodes.has(product.gencode);
  });
}

// Fonction principale
function main() {
  console.log("📊 Début de l'analyse des gencodes manquants...\n");

  // Lire les bases de données
  console.log('📖 Lecture de la base de données source...');
  const sourceProducts = readDatabase(sourceDbPath);
  console.log(`   ✅ ${sourceProducts.length} produits trouvés dans la source`);

  console.log('📖 Lecture de la base de données actuelle...');
  const currentProducts = readDatabase(currentDbPath);
  console.log(`   ✅ ${currentProducts.length} produits trouvés dans la base actuelle`);

  if (sourceProducts.length === 0) {
    console.error('❌ Aucun produit trouvé dans la base source. Vérifiez le chemin.');
    return;
  }

  if (currentProducts.length === 0) {
    console.error('❌ Aucun produit trouvé dans la base actuelle. Vérifiez le chemin.');
    return;
  }

  // Extraire les gencodes existants
  console.log('\n🔍 Extraction des gencodes de la base actuelle...');
  const currentGencodes = extractCurrentGencodes(currentProducts);
  console.log(`   ✅ ${currentGencodes.size} gencodes uniques trouvés`);

  // Compter les produits source avec gencode
  const sourceWithGencode = sourceProducts.filter((p) => p.gencode);
  console.log(`   ℹ️  ${sourceWithGencode.length} produits source ont un gencode`);

  // Trouver les produits avec gencode manquant
  console.log('\n🔍 Recherche des produits avec gencode manquant...');
  const missingProducts = findMissingGencodes(sourceProducts, currentGencodes);

  // Afficher les résultats
  console.log(`\n📋 RÉSULTATS:`);
  console.log(`   • Produits source avec gencode: ${sourceWithGencode.length}`);
  console.log(`   • Gencodes présents dans la base actuelle: ${currentGencodes.size}`);
  console.log(`   • Produits avec gencode manquant: ${missingProducts.length}\n`);

  if (missingProducts.length === 0) {
    console.log(
      '✅ Tous les produits source avec gencode sont déjà présents dans la base actuelle !'
    );
    return;
  }

  console.log('📝 LISTE DES PRODUITS AVEC GENCODE MANQUANT:');
  console.log('='.repeat(80));

  missingProducts.forEach((product, index) => {
    console.log(`${index + 1}. ${product.designation || product.reference || 'Sans nom'}`);
    console.log(`   • ID: ${product._id}`);
    console.log(`   • Référence: ${product.reference || 'N/A'}`);
    console.log(`   • Marque: ${product.marque || product.brand || 'N/A'}`);
    console.log(`   • Gencode: ${product.gencode}`);
    console.log(`   • Prix vente: ${product.prixVente || 'N/A'}€`);
    console.log(`   • Stock: ${product.stock || 'N/A'}`);
    console.log('-'.repeat(40));
  });

  // Optionnel: Sauvegarder les résultats dans un fichier
  const outputFile = 'produits_gencode_manquant.json';
  try {
    fs.writeFileSync(outputFile, JSON.stringify(missingProducts, null, 2), 'utf8');
    console.log(`\n💾 Résultats sauvegardés dans: ${outputFile}`);
  } catch (error) {
    console.warn(`⚠️  Impossible de sauvegarder le fichier: ${error.message}`);
  }

  console.log('\n✅ Analyse terminée !');
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { main, readDatabase, extractCurrentGencodes, findMissingGencodes };
