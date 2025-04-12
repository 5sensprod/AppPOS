// merge-descriptions.js
const db = require('./config/database');
const Product = require('./models/Product');

async function mergeDescriptions() {
  try {
    console.log('Début de la fusion des descriptions...');

    // Récupérer tous les produits
    const products = await Product.findAll();
    console.log(`Nombre de produits trouvés: ${products.length}`);

    let updatedCount = 0;

    // Traiter chaque produit
    for (const product of products) {
      let description = product.description || '';
      let hasUpdates = false;

      // Vérifier si le produit a des spécifications
      if (product.specifications && product.specifications.content) {
        description += `\n${product.specifications.content}`;
        hasUpdates = true;
      }

      // Vérifier si le produit a une description courte
      if (product.description_short) {
        description += `\n${product.description_short}`;
        hasUpdates = true;
      }

      // Si des mises à jour sont nécessaires, mettre à jour le produit
      if (hasUpdates) {
        await Product.update(product._id, {
          description: description,
          specifications: null,
          description_short: null,
        });
        updatedCount++;
        console.log(`Produit mis à jour: ${product._id} - ${product.name}`);
      }
    }

    console.log(`Opération terminée. ${updatedCount} produits mis à jour.`);
  } catch (error) {
    console.error('Erreur lors de la fusion des descriptions:', error);
  }
}

// Exécuter la fonction
mergeDescriptions()
  .then(() => {
    console.log('Script terminé.');
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erreur lors de l'exécution du script:", error);
    process.exit(1);
  });
