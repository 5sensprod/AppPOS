// syncUpdatedProducts.js
const Datastore = require('nedb');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs').promises; // Utiliser fs.promises explicitement
const util = require('util');
const WooCommerceClient = require('../base/WooCommerceClient');

// Charger les variables d'environnement
dotenv.config();

// Chemins
const PRODUCTS_DB = path.join(__dirname, 'data', 'products.db');
const BRANDS_DB = path.join(__dirname, 'data', 'brands.db');
const CATEGORIES_DB = path.join(__dirname, 'data', 'categories.db');

// Promisify nedb functions
function createDatastore(filePath) {
  const db = new Datastore({ filename: filePath, autoload: true });
  db.findAsync = util.promisify(db.find);
  db.findOneAsync = util.promisify(db.findOne);
  return db;
}

// Fonction pour mapper les catégories
async function mapCategories(categoryIds) {
  try {
    const dbContent = await fs.readFile(CATEGORIES_DB, 'utf8');
    const lines = dbContent.split('\n').filter((line) => line.trim());
    const categories = [];

    for (const line of lines) {
      try {
        categories.push(JSON.parse(line));
      } catch (error) {
        console.warn(`Impossible de parser la ligne catégorie: ${line.substring(0, 50)}...`);
      }
    }

    const mappedCategories = categories
      .filter((cat) => categoryIds.includes(cat._id) && cat.woo_id)
      .map((cat) => ({ id: parseInt(cat.woo_id) }));

    if (mappedCategories.length === 0) {
      return [{ id: 1 }]; // Catégorie "non classée" de WooCommerce
    }

    return mappedCategories;
  } catch (error) {
    console.error('Erreur lors du mapping des catégories:', error);
    return [{ id: 1 }];
  }
}

// Fonction pour mapper la marque
async function mapBrand(brandId) {
  if (!brandId) return null;

  try {
    const dbContent = await fs.readFile(BRANDS_DB, 'utf8');
    const lines = dbContent.split('\n').filter((line) => line.trim());
    const brands = [];

    for (const line of lines) {
      try {
        brands.push(JSON.parse(line));
      } catch (error) {
        console.warn(`Impossible de parser la ligne marque: ${line.substring(0, 50)}...`);
      }
    }

    const brand = brands.find((b) => b._id === brandId);

    if (brand && brand.woo_id) {
      return [{ id: parseInt(brand.woo_id) }];
    }

    return null;
  } catch (error) {
    console.error('Erreur lors du mapping de la marque:', error);
    return null;
  }
}

// Fonction principale pour synchroniser les produits mis à jour
async function syncUpdatedProducts(syncAllProducts = false) {
  console.log('Synchronisation des produits mis à jour avec WooCommerce...');

  try {
    // Initialiser le client WooCommerce
    const wooClient = new WooCommerceClient();

    // Lire la base de données des produits
    const dbContent = await fs.readFile(PRODUCTS_DB, 'utf8');
    const lines = dbContent.split('\n').filter((line) => line.trim());
    const products = [];

    // Parsing sécurisé ligne par ligne
    for (const line of lines) {
      try {
        products.push(JSON.parse(line));
      } catch (error) {
        console.warn(`Impossible de parser la ligne produit: ${line.substring(0, 50)}...`);
      }
    }

    console.log(`Chargement de ${products.length} produits.`);

    // Filtrer les produits qui ont un woo_id (déjà synchronisés avec WooCommerce)
    // et qui ont été modifiés depuis la dernière synchronisation ou si syncAllProducts est true
    const productsToSync = products.filter((product) => {
      if (!product.woo_id) {
        return false; // Ne pas synchroniser les produits sans woo_id
      }

      if (syncAllProducts) {
        return true; // Synchroniser tous les produits avec woo_id
      }

      // Comparer les dates si last_sync existe
      if (product.last_sync) {
        const lastSyncDate = new Date(product.last_sync);
        const lastModifiedDate = product.updated_at ? new Date(product.updated_at) : new Date(0);
        return lastModifiedDate > lastSyncDate;
      }

      return true; // Si last_sync n'existe pas, synchroniser
    });

    console.log(`${productsToSync.length} produits à synchroniser avec WooCommerce.`);

    // Résultats
    const results = {
      synced: 0,
      errors: [],
    };

    // Synchroniser chaque produit avec WooCommerce
    for (const product of productsToSync) {
      try {
        console.log(
          `Synchronisation du produit ${product.name} (${product._id}) avec WooCommerce...`
        );

        // Préparer les données pour WooCommerce
        const categories = await mapCategories(product.categories || []);
        const brands = await mapBrand(product.brand_id);

        const wcData = {
          name: product.name,
          sku: product.sku,
          description: product.description || '',
          short_description: product.description_short || '',
          regular_price: (product.regular_price || product.price).toString(),
          price: product.price.toString(),
          sale_price: (product.sale_price || '').toString(),
          status: product.status === 'published' ? 'publish' : 'draft',
          manage_stock: product.manage_stock || false,
          stock_quantity: product.stock || 0,
          categories: categories,
          meta_data: [
            ...(product.meta_data || []),
            { key: 'tax_rate', value: product.tax?.rate?.toString() || '20' },
            { key: 'purchase_price', value: product.purchase_price?.toString() || '0' },
            { key: 'margin_rate', value: product.margins?.margin_rate?.toString() || '0' },
          ],
        };

        // Ajouter la marque si elle existe
        if (brands) {
          wcData.brands = brands;
        }

        // Mettre à jour le produit dans WooCommerce
        const response = await wooClient.put(`products/${product.woo_id}`, wcData);

        // Mettre à jour la date de dernière synchronisation
        await updateLastSync(product._id);

        results.synced++;
        console.log(`✅ Produit ${product.name} synchronisé avec succès.`);
      } catch (error) {
        console.error(
          `❌ Erreur lors de la synchronisation du produit ${product.name} (${product._id}):`,
          error.message
        );
        results.errors.push({
          product_id: product._id,
          name: product.name,
          error: error.message,
        });
      }

      // Attendre un peu pour éviter de surcharger l'API
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`
    Synchronisation terminée:
    - ${results.synced} produits synchronisés
    - ${results.errors.length} erreurs
    `);

    return results;
  } catch (error) {
    console.error('Erreur globale:', error);
    return { success: false, error: error.message };
  }
}

// Fonction pour mettre à jour la date de dernière synchronisation
async function updateLastSync(productId) {
  try {
    const dbContent = await fs.readFile(PRODUCTS_DB, 'utf8');
    const lines = dbContent.split('\n').filter((line) => line.trim());
    let found = false;

    const updatedLines = [];
    for (const line of lines) {
      try {
        const product = JSON.parse(line);
        if (product._id === productId) {
          // Mettre à jour la date de dernière synchronisation
          product.last_sync = new Date();
          updatedLines.push(JSON.stringify(product));
          found = true;
        } else {
          updatedLines.push(line);
        }
      } catch (err) {
        updatedLines.push(line); // conserver la ligne telle quelle
      }
    }

    if (!found) {
      console.error(`Produit avec ID ${productId} non trouvé dans la base de données`);
      return false;
    }

    // Écrire le fichier mis à jour
    await fs.writeFile(PRODUCTS_DB, updatedLines.join('\n'), 'utf8');
    return true;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de la date de synchronisation:`, error);
    return false;
  }
}

// Exécuter le script
if (require.main === module) {
  // Analyser les arguments de ligne de commande
  const args = process.argv.slice(2);
  const syncAll = args.includes('--all') || args.includes('-a');

  if (syncAll) {
    console.log('Mode sync-all activé: tous les produits avec woo_id seront synchronisés');
  } else {
    console.log('Mode standard: seuls les produits modifiés seront synchronisés');
  }

  syncUpdatedProducts(syncAll)
    .then(() => {
      console.log('Script terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur non gérée:', error);
      process.exit(1);
    });
}

module.exports = { syncUpdatedProducts };
