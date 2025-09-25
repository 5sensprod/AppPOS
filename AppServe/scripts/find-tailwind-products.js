// AppServe/scripts/find-tailwind-products.js
const Datastore = require('nedb');
const path = require('path');

const productsPath = path.join(__dirname, '../data/products.db');
const productsDb = new Datastore({ filename: productsPath, autoload: true });

console.log('🔍 RECHERCHE PRODUITS AVEC --tw*\n');

productsDb.find({}, (err, products) => {
  if (err) {
    console.error('Erreur:', err);
    return;
  }

  const problematic = products.filter((product) => {
    return product.description && product.description.includes('--tw-');
  });

  console.log(`Total produits: ${products.length}`);
  console.log(`Produits avec --tw-: ${problematic.length}\n`);

  if (problematic.length === 0) {
    console.log('✅ Aucun produit problématique trouvé');
    process.exit(0);
    return;
  }

  const productIds = [];

  problematic.forEach((product, index) => {
    console.log(`${index + 1}. ${product.name || 'Sans nom'}`);
    console.log(`   ID: ${product._id}`);
    console.log(`   SKU: ${product.sku || 'N/A'}`);

    productIds.push(product._id);

    // Extraire et afficher un aperçu de la partie problématique
    const match = product.description.match(/--tw-[^;]*/);
    if (match) {
      console.log(`   Problème: ${match[0]}`);
    }
    console.log('');
  });

  // Liste des IDs en console
  console.log('📋 LISTE DES IDS:');
  console.log('[' + productIds.map((id) => `"${id}"`).join(', ') + ']');

  process.exit(0);
});
