const fs = require('fs');
const path = require('path');

// Chemin vers les fichiers de base de données
const PRODUCTS_DB_PATH = path.join(__dirname, 'data', 'products.db');
const CATEGORIES_DB_PATH = path.join(__dirname, 'data', 'categories.db');

/**
 * Lit un fichier JSON Lines et retourne les objets
 */
function readJsonLinesFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  } catch (error) {
    console.error(`❌ Erreur lecture ${filePath}:`, error.message);
    return [];
  }
}

/**
 * DIAGNOSTIC UNIQUEMENT - Pas de correction
 */
function diagnosticCategories() {
  console.log('🔍 DIAGNOSTIC DES CATÉGORIES\n');

  // Lecture des données
  const products = readJsonLinesFile(PRODUCTS_DB_PATH);
  const categories = readJsonLinesFile(CATEGORIES_DB_PATH);

  if (products.length === 0 || categories.length === 0) {
    console.error('❌ Impossible de lire les fichiers de données');
    return;
  }

  console.log(`📊 ${products.length} produits • ${categories.length} catégories\n`);

  // IDs des catégories existantes
  const existingCategoryIds = new Set(categories.map((cat) => cat._id));

  // Recherche des catégories manquantes
  const missingCategories = new Map(); // ID -> liste des produits

  products.forEach((product) => {
    const checkCategory = (categoryId, field) => {
      if (categoryId && !existingCategoryIds.has(categoryId)) {
        if (!missingCategories.has(categoryId)) {
          missingCategories.set(categoryId, []);
        }
        missingCategories.get(categoryId).push({
          name: product.name || 'Sans nom',
          sku: product.sku || 'Sans SKU',
          field: field,
        });
      }
    };

    // Vérifications
    checkCategory(product.category_id, 'category_id');

    if (product.categories) {
      product.categories.forEach((catId) => checkCategory(catId, 'categories[]'));
    }

    if (product.category_info?.refs) {
      product.category_info.refs.forEach((ref) => checkCategory(ref.id, 'category_info.refs'));
    }
  });

  // RÉSULTATS DU DIAGNOSTIC
  console.log('📋 RÉSULTATS :\n');

  if (missingCategories.size === 0) {
    console.log('✅ AUCUN PROBLÈME DÉTECTÉ');
    console.log('   Toutes les catégories référencées existent\n');
  } else {
    console.log(`❌ ${missingCategories.size} CATÉGORIE(S) MANQUANTE(S) :\n`);

    missingCategories.forEach((products, categoryId) => {
      console.log(`🚫 Catégorie manquante: ${categoryId}`);
      console.log(`   Utilisée dans ${products.length} produit(s):`);
      products.forEach((prod) => {
        console.log(`   • ${prod.name} (${prod.sku}) - ${prod.field}`);
      });
      console.log('');
    });
  }

  // Statistiques finales
  const totalReferences = [...missingCategories.values()].reduce(
    (sum, prods) => sum + prods.length,
    0
  );
  console.log(`📈 RÉSUMÉ:`);
  console.log(`   • Catégories manquantes: ${missingCategories.size}`);
  console.log(`   • Références cassées: ${totalReferences}`);
  console.log(
    `   • Produits affectés: ${new Set([...missingCategories.values()].flat().map((p) => p.sku)).size}`
  );
}

// Vérification des fichiers et exécution
console.log('🎵 DIAGNOSTIC CATÉGORIES - AXE MUSIQUE\n');

if (!fs.existsSync(PRODUCTS_DB_PATH)) {
  console.error(`❌ Fichier non trouvé: ${PRODUCTS_DB_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(CATEGORIES_DB_PATH)) {
  console.error(`❌ Fichier non trouvé: ${CATEGORIES_DB_PATH}`);
  process.exit(1);
}

diagnosticCategories();
