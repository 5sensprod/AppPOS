//AppServe\scripts\cleanupLegacyCategoryFields.js

const db = require('./config/database');
const Product = require('./models/Product');

async function cleanupLegacyCategoryFields() {
  try {
    console.log('Démarrage du nettoyage des champs de catégorie obsolètes...');

    // Récupérer tous les produits avec les anciens champs
    const allProducts = await new Promise((resolve, reject) => {
      db.products.find(
        {
          $or: [{ category_ref: { $exists: true } }, { categories_refs: { $exists: true } }],
        },
        (err, products) => {
          if (err) reject(err);
          else resolve(products);
        }
      );
    });

    console.log(`Nombre de produits à nettoyer: ${allProducts.length}`);

    let successCount = 0;

    // Traiter chaque produit
    for (const product of allProducts) {
      try {
        // Supprimer les anciens champs mais conserver category_info
        const updateData = {
          $unset: {
            category_ref: '',
            categories_refs: '',
          },
        };

        await new Promise((resolve, reject) => {
          db.products.update({ _id: product._id }, updateData, {}, (err, numReplaced) => {
            if (err) reject(err);
            else resolve(numReplaced);
          });
        });

        successCount++;

        if (successCount % 10 === 0) {
          console.log(`Progression: ${successCount}/${allProducts.length}`);
        }
      } catch (error) {
        console.error(`Erreur lors du nettoyage du produit ${product._id}:`, error);
      }
    }

    console.log(`Nettoyage terminé: ${successCount} produits mis à jour`);
  } catch (error) {
    console.error('Erreur globale:', error);
  }
}

cleanupLegacyCategoryFields()
  .then(() => {
    console.log('Script terminé');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
