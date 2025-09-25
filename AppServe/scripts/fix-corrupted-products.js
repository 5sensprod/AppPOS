// AppServe/scripts/fix-corrupted-products.js
const Datastore = require('nedb');
const path = require('path');

const productsPath = path.join(__dirname, '../data/products.db');
const productsDb = new Datastore({ filename: productsPath, autoload: true });

console.log('🔧 RÉPARATION DES PRODUITS CORROMPUS\n');

productsDb.find({}, (err, products) => {
  if (err) {
    console.error('Erreur:', err);
    return;
  }

  const corruptedProducts = [];

  // Identifier les produits corrompus
  products.forEach((product) => {
    if (
      product.category_info &&
      product.category_info.refs &&
      Array.isArray(product.category_info.refs)
    ) {
      const refs = product.category_info.refs;
      const longPaths = refs.filter((ref) => ref.path && ref.path.length > 10);

      if (longPaths.length > 0) {
        corruptedProducts.push(product);
      }
    }
  });

  console.log(`Trouvé ${corruptedProducts.length} produits corrompus`);

  if (corruptedProducts.length === 0) {
    console.log('✅ Aucun produit à réparer');
    process.exit(0);
    return;
  }

  console.log('Démarrage de la réparation...\n');

  let fixed = 0;
  let errors = 0;

  // Réparer chaque produit
  corruptedProducts.forEach((product, index) => {
    // Supprimer le category_info corrompu
    const cleanProduct = { ...product };
    delete cleanProduct.category_info;

    productsDb.update(
      { _id: product._id },
      { $unset: { category_info: 1 } },
      {},
      (err, numReplaced) => {
        if (err) {
          console.error(`❌ Erreur produit ${product._id}:`, err);
          errors++;
        } else {
          console.log(`✅ Réparé: ${product.name || product._id} (${product.sku || 'N/A'})`);
          fixed++;
        }

        // Vérifier si c'est le dernier
        if (index === corruptedProducts.length - 1) {
          setTimeout(() => {
            console.log(`\n📊 RÉSULTAT:`);
            console.log(`  - Produits réparés: ${fixed}`);
            console.log(`  - Erreurs: ${errors}`);
            console.log(
              '\n💡 Les category_info seront recalculées automatiquement lors du prochain accès API'
            );
            process.exit(0);
          }, 100);
        }
      }
    );
  });
});
