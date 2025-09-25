// AppServe/scripts/products-scan.js
const Datastore = require('nedb');
const path = require('path');

const productsPath = path.join(__dirname, '../data/products.db');
const categoriesPath = path.join(__dirname, '../data/categories.db');

const productsDb = new Datastore({ filename: productsPath, autoload: true });
const categoriesDb = new Datastore({ filename: categoriesPath, autoload: true });

console.log('🔍 SCAN PRODUCTS CATEGORY_INFO\n');

// Charger les catégories d'abord
categoriesDb.find({}, (err, categories) => {
  if (err) {
    console.error('Erreur categories:', err);
    return;
  }

  const categoryMap = new Map(categories.map((c) => [c._id, c]));

  productsDb.find({}, (err, products) => {
    if (err) {
      console.error('Erreur products:', err);
      return;
    }

    console.log(`Total: ${products.length} produits\n`);

    let corrupted = 0;
    let withCategoryInfo = 0;
    let withCategories = 0;

    products.forEach((product) => {
      if (product.categories && product.categories.length > 0) {
        withCategories++;
      }

      if (product.category_info) {
        withCategoryInfo++;

        // Vérifier si category_info est corrompu
        if (product.category_info.refs && Array.isArray(product.category_info.refs)) {
          const refs = product.category_info.refs;

          // Détecter les chemins aberrants (plus de 10 niveaux = suspect)
          const longPaths = refs.filter((ref) => ref.path && ref.path.length > 10);
          if (longPaths.length > 0) {
            console.log(`❌ PRODUIT CORROMPU: ${product.name || product._id}`);
            console.log(`   SKU: ${product.sku || 'N/A'}`);
            console.log(`   Categories: [${product.categories?.join(', ') || 'N/A'}]`);
            console.log(`   Path aberrant: ${longPaths[0].path_string}`);
            console.log(`   Longueur path: ${longPaths[0].path.length} niveaux\n`);
            corrupted++;
          }

          // Vérifier la cohérence avec les vraies catégories
          refs.forEach((ref) => {
            if (ref.id && !categoryMap.has(ref.id)) {
              console.log(
                `⚠️  Référence catégorie inexistante: ${ref.id} dans produit ${product._id}`
              );
            }
          });
        }
      }
    });

    console.log('📊 STATISTIQUES:');
    console.log(`  - Produits avec categories: ${withCategories}`);
    console.log(`  - Produits avec category_info: ${withCategoryInfo}`);
    console.log(`  - Produits corrompus: ${corrupted}`);

    if (corrupted > 0) {
      console.log('\n🔧 RECOMMANDATION:');
      console.log('Les produits corrompus doivent être réparés en supprimant leur category_info');
      console.log('et en laissant le système le recalculer via findByIdWithCategoryInfo()');
    } else {
      console.log('\n✅ Aucune corruption détectée');
    }

    process.exit(0);
  });
});
