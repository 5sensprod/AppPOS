// Script de nettoyage pour supprimer les champs obsolètes
const db = require('./config/database');

async function cleanupLegacyFields() {
  return new Promise((resolve, reject) => {
    db.products.update(
      {}, // Tous les produits
      {
        $unset: {
          category_ref: true,
          categories_refs: true,
        },
      },
      { multi: true }, // Mettre à jour tous les documents
      (err, numUpdated) => {
        if (err) {
          console.error('Erreur lors du nettoyage :', err);
          reject(err);
        } else {
          console.log(`${numUpdated} produits nettoyés avec succès`);
          resolve(numUpdated);
        }
      }
    );
  });
}

cleanupLegacyFields()
  .then(() => console.log('Nettoyage terminé'))
  .catch((err) => console.error('Échec du nettoyage :', err));
