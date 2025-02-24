// createWooCommerceCategories.js
const Datastore = require('nedb');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const WooCommerceClient = require('./services/base/WooCommerceClient');

// Charger les variables d'environnement
dotenv.config();

// Chemins
const CATEGORIES_DB = path.join(__dirname, 'data', 'categories.db');

// Fonction pour manipuler la base de données NeDB
async function updateDatabase(categoryId, wooId) {
  // Lire le fichier directement
  const dbContent = await fs.promises.readFile(CATEGORIES_DB, 'utf8');
  const lines = dbContent.split('\n').filter((line) => line.trim());

  // Créer un contenu modifié
  const updatedLines = lines.map((line) => {
    const category = JSON.parse(line);
    if (category._id === categoryId) {
      category.woo_id = wooId;
      category.last_sync = new Date();
      console.log(`Mise à jour NeDB: ${category._id} → woo_id: ${wooId}`);
    }
    return JSON.stringify(category);
  });

  // Écrire le fichier mis à jour
  await fs.promises.writeFile(CATEGORIES_DB, updatedLines.join('\n'), 'utf8');
  console.log(`Base de données mise à jour pour ${categoryId}`);
}

async function createCategories() {
  console.log('Création des catégories dans WooCommerce...');

  try {
    // Initialiser le client WooCommerce
    const wooClient = new WooCommerceClient();

    // Lire et parser le fichier de base de données
    const dbContent = await fs.promises.readFile(CATEGORIES_DB, 'utf8');
    const lines = dbContent.split('\n').filter((line) => line.trim());
    const categories = lines.map((line) => JSON.parse(line));

    console.log(`Chargement de ${categories.length} catégories.`);

    // Trier par niveau (parents d'abord)
    const sortedCategories = categories.sort((a, b) => a.level - b.level);

    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    // Créer ou mettre à jour chaque catégorie
    for (const category of sortedCategories) {
      try {
        // Préparer les données pour WooCommerce
        let parentId = 0;
        if (category.parent_id) {
          // Trouver le woo_id du parent
          const parentCat = sortedCategories.find((c) => c._id === category.parent_id);
          if (parentCat && parentCat.woo_id) {
            parentId = parentCat.woo_id;
          } else {
            console.log(
              `Parent non trouvé ou non synchronisé pour ${category.name} (${category._id}), parent_id: ${category.parent_id}`
            );
            continue; // Passer à la suivante si le parent n'est pas synchronisé
          }
        }

        const wcData = {
          name: category.name,
          parent: parentId,
        };

        let response;

        if (category.woo_id) {
          // Mettre à jour
          console.log(`Mise à jour catégorie ${category.name} (${category._id}) dans WooCommerce`);
          response = await wooClient.put(`products/categories/${category.woo_id}`, wcData);
          results.updated++;
        } else {
          // Créer
          console.log(`Création catégorie ${category.name} (${category._id}) dans WooCommerce`);
          response = await wooClient.post('products/categories', wcData);
          results.created++;
        }

        // Mettre à jour la base locale
        await updateDatabase(category._id, response.data.id);

        // Mettre à jour l'objet en mémoire pour les références futures
        category.woo_id = response.data.id;

        console.log(`Catégorie ${category.name} synchronisée avec ID WC: ${response.data.id}`);
      } catch (error) {
        console.error(`Erreur pour catégorie ${category.name} (${category._id}):`, error.message);
        results.errors.push({
          category_id: category._id,
          name: category.name,
          error: error.message,
        });
      }

      // Attendre un peu pour éviter de surcharger l'API
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log(`
    Synchronisation terminée:
    - ${results.created} catégories créées
    - ${results.updated} catégories mises à jour
    - ${results.errors.length} erreurs
    `);

    return results;
  } catch (error) {
    console.error('Erreur globale:', error);
    return { success: false, error: error.message };
  }
}

// Exécuter le script
if (require.main === module) {
  createCategories()
    .then(() => {
      console.log('Script terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur non gérée:', error);
      process.exit(1);
    });
}
