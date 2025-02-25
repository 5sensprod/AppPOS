// createWooCommerceBrands.js
const Datastore = require('nedb');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const WooCommerceClient = require('./services/base/WooCommerceClient');

// Charger les variables d'environnement
dotenv.config();

// Chemins
const BRANDS_DB = path.join(__dirname, 'data', 'brands.db');

// Fonction pour manipuler la base de données NeDB
async function updateDatabase(brandId, wooId) {
  // Lire le fichier directement
  const dbContent = await fs.promises.readFile(BRANDS_DB, 'utf8');
  const lines = dbContent.split('\n').filter((line) => line.trim());

  // Créer un contenu modifié
  const updatedLines = lines.map((line) => {
    const brand = JSON.parse(line);
    if (brand._id === brandId) {
      brand.woo_id = wooId;
      brand.last_sync = new Date();
      console.log(`Mise à jour NeDB: ${brand._id} → woo_id: ${wooId}`);
    }
    return JSON.stringify(brand);
  });

  // Écrire le fichier mis à jour
  await fs.promises.writeFile(BRANDS_DB, updatedLines.join('\n'), 'utf8');
  console.log(`Base de données mise à jour pour ${brandId}`);
}

async function createBrands() {
  console.log('Création des marques dans WooCommerce...');

  try {
    // Initialiser le client WooCommerce
    const wooClient = new WooCommerceClient();

    // Lire et parser le fichier de base de données
    const dbContent = await fs.promises.readFile(BRANDS_DB, 'utf8');
    const lines = dbContent.split('\n').filter((line) => line.trim());
    const brands = lines.map((line) => JSON.parse(line));

    console.log(`Chargement de ${brands.length} marques.`);

    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    // Créer ou mettre à jour chaque marque
    for (const brand of brands) {
      try {
        // Préparer les données pour WooCommerce
        const wcData = {
          name: brand.name,
          slug: brand.slug || generateSlug(brand.name),
          description: brand.description || '',
        };

        // Ajouter l'image si présente
        if (brand.image?.wp_id) {
          wcData.image = {
            id: parseInt(brand.image.wp_id),
            src: brand.image.url,
            alt: brand.name,
          };
        }

        let response;

        if (brand.woo_id) {
          // Mettre à jour
          console.log(`Mise à jour marque ${brand.name} (${brand._id}) dans WooCommerce`);
          response = await wooClient.put(`products/brands/${brand.woo_id}`, wcData);
          results.updated++;
        } else {
          // Créer
          console.log(`Création marque ${brand.name} (${brand._id}) dans WooCommerce`);
          response = await wooClient.post('products/brands', wcData);
          results.created++;
        }

        // Mettre à jour la base locale
        await updateDatabase(brand._id, response.data.id);

        console.log(`Marque ${brand.name} synchronisée avec ID WC: ${response.data.id}`);
      } catch (error) {
        console.error(`Erreur pour marque ${brand.name} (${brand._id}):`, error.message);
        results.errors.push({
          brand_id: brand._id,
          name: brand.name,
          error: error.message,
        });
      }

      // Attendre un peu pour éviter de surcharger l'API
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log(`
    Synchronisation terminée:
    - ${results.created} marques créées
    - ${results.updated} marques mises à jour
    - ${results.errors.length} erreurs
    `);

    return results;
  } catch (error) {
    console.error('Erreur globale:', error);
    return { success: false, error: error.message };
  }
}

// Fonction utilitaire pour générer un slug
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Exécuter le script
if (require.main === module) {
  createBrands()
    .then(() => {
      console.log('Script terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur non gérée:', error);
      process.exit(1);
    });
}

module.exports = { createBrands };
