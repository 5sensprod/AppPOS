// createWooCommerceProducts.js
const Datastore = require('nedb');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const util = require('util');
const WooCommerceClient = require('../services/base/WooCommerceClient');
const WordPressImageSync = require('../services/image/WordPressImageSync');

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

// Fonction pour manipuler la base de données NeDB
async function updateDatabase(productId, updates) {
  try {
    // Lire le fichier directement
    const dbContent = await fs.readFile(PRODUCTS_DB, 'utf8');
    const lines = dbContent.split('\n').filter((line) => line.trim());
    let found = false;

    // Créer un contenu modifié
    const updatedLines = [];
    for (const line of lines) {
      try {
        const product = JSON.parse(line);
        if (product._id === productId) {
          // Appliquer les mises à jour
          const updatedProduct = { ...product, ...updates };
          updatedLines.push(JSON.stringify(updatedProduct));
          console.log(`Mise à jour NeDB: ${product._id} → woo_id: ${updates.woo_id}`);
          found = true;
        } else {
          updatedLines.push(line);
        }
      } catch (err) {
        console.error(`Erreur JSON parse pour ligne: ${line.substring(0, 50)}...`, err.message);
        updatedLines.push(line); // conserver la ligne telle quelle
      }
    }

    if (!found) {
      console.error(`Produit avec ID ${productId} non trouvé dans la base de données`);
    }

    // Écrire le fichier mis à jour
    await fs.writeFile(PRODUCTS_DB, updatedLines.join('\n'), 'utf8');

    // Vérification simplifiée
    console.log(`✅ Base de données mise à jour pour ${productId}`);

    return found;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de la base de données:`, error);
    throw error;
  }
}

// Fonction pour retrouver les catégories WooCommerce correspondantes
async function mapCategories(categoryIds) {
  try {
    // Lire et parser le fichier des catégories
    const dbContent = await fs.readFile(CATEGORIES_DB, 'utf8');
    const lines = dbContent.split('\n').filter((line) => line.trim());
    const categories = lines.map((line) => JSON.parse(line));

    const mappedCategories = categories
      .filter((cat) => categoryIds.includes(cat._id) && cat.woo_id)
      .map((cat) => ({ id: parseInt(cat.woo_id) }));

    // Si aucune catégorie valide trouvée, utiliser "non classée"
    if (mappedCategories.length === 0) {
      return [{ id: 1 }]; // Catégorie "non classée" de WooCommerce
    }

    return mappedCategories;
  } catch (error) {
    console.error('Erreur lors du mapping des catégories:', error);
    return [{ id: 1 }]; // Par défaut "non classée"
  }
}

// Fonction pour retrouver la marque WooCommerce correspondante
async function mapBrand(brandId) {
  if (!brandId) return null;

  try {
    // Lire et parser le fichier des marques
    const dbContent = await fs.readFile(BRANDS_DB, 'utf8');
    const lines = dbContent.split('\n').filter((line) => line.trim());
    const brands = lines.map((line) => JSON.parse(line));

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

// Fonction pour uploader une image vers WordPress
async function uploadImageToWordPress(imagePath, wpSync) {
  try {
    // Vérifier si l'image existe
    await fs.access(imagePath);

    // Uploader l'image
    const uploadResult = await wpSync.uploadToWordPress(imagePath);

    return {
      wp_id: uploadResult.id,
      url: uploadResult.url,
      status: 'active',
    };
  } catch (error) {
    console.error(`Erreur lors de l'upload de l'image ${imagePath}:`, error.message);
    return null;
  }
}

// Fonction pour préparer les données d'image pour WooCommerce
async function prepareImageData(product, wpSync) {
  const images = [];
  let mainImageUploaded = false;

  // Uploader l'image principale si elle existe
  if (product.image && product.image.local_path) {
    try {
      const imageUpload = await uploadImageToWordPress(product.image.local_path, wpSync);

      if (imageUpload) {
        images.push({
          id: imageUpload.wp_id,
          src: imageUpload.url,
          position: 0,
          alt: product.name,
        });

        // Mettre à jour les données de l'image
        product.image = {
          ...product.image,
          wp_id: imageUpload.wp_id,
          url: imageUpload.url,
          status: 'active',
        };

        mainImageUploaded = true;
      }
    } catch (error) {
      console.error(
        `Erreur lors de l'upload de l'image principale pour ${product._id}:`,
        error.message
      );
    }
  }

  // Uploader les images de la galerie
  if (product.gallery_images && product.gallery_images.length) {
    for (let i = 0; i < product.gallery_images.length; i++) {
      const img = product.gallery_images[i];

      // Sauter l'image principale si elle a déjà été uploadée
      if (mainImageUploaded && img.local_path === product.image.local_path) {
        continue;
      }

      if (img.local_path) {
        try {
          const imageUpload = await uploadImageToWordPress(img.local_path, wpSync);

          if (imageUpload) {
            // Ajouter à la liste des images pour WooCommerce
            images.push({
              id: imageUpload.wp_id,
              src: imageUpload.url,
              position: images.length,
              alt: `${product.name} - ${images.length + 1}`,
            });

            // Mettre à jour les données de l'image dans la galerie
            product.gallery_images[i] = {
              ...img,
              wp_id: imageUpload.wp_id,
              url: imageUpload.url,
              status: 'active',
            };
          }
        } catch (error) {
          console.error(
            `Erreur lors de l'upload de l'image ${i} pour ${product._id}:`,
            error.message
          );
        }
      }
    }
  }

  return {
    wcImages: images,
    updatedProduct: product,
  };
}

async function createProducts(batchSize = 10) {
  console.log('Création des produits dans WooCommerce...');

  try {
    // Initialiser les clients
    const wooClient = new WooCommerceClient();
    const wpSync = new WordPressImageSync();

    // Lire et parser le fichier de base de données
    const dbContent = await fs.readFile(PRODUCTS_DB, 'utf8');

    // Nettoyer les données pour éviter les problèmes de parsing JSON
    const cleanedContent = dbContent
      .replace(/\\n/g, '\\\\n') // Échapper les sauts de ligne
      .replace(/\\r/g, '\\\\r') // Échapper les retours chariot
      .replace(/([^\\])\\([^\\"/bfnrt])/g, '$1\\\\$2'); // Échapper les caractères mal échappés

    const lines = cleanedContent.split('\n').filter((line) => line.trim());
    const products = [];

    // Parsing sécurisé ligne par ligne
    for (const line of lines) {
      try {
        products.push(JSON.parse(line));
      } catch (error) {
        console.warn(`Impossible de parser la ligne: ${line.substring(0, 50)}...`, error.message);
        // Continuer sans la ligne problématique
      }
    }

    console.log(`Chargement de ${products.length} produits.`);

    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    // Traiter les produits par lots
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      console.log(
        `Traitement du lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)}`
      );

      // Traiter chaque produit du lot
      for (const product of batch) {
        try {
          // Préparer les données pour WooCommerce
          const categories = await mapCategories(product.categories || []);
          const brands = await mapBrand(product.brand_id);

          // Préparer et uploader les images
          const { wcImages, updatedProduct } = await prepareImageData(product, wpSync);

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
            images: wcImages,
            meta_data: [
              ...(product.meta_data || []),
              // Ajouter des métadonnées supplémentaires depuis les champs structurés
              { key: 'tax_rate', value: product.tax?.rate?.toString() || '20' },
              { key: 'purchase_price', value: product.purchase_price?.toString() || '0' },
              { key: 'margin_rate', value: product.margins?.margin_rate?.toString() || '0' },
            ],
          };

          // Ajouter la marque si elle existe
          if (brands) {
            wcData.brands = brands;
          }

          let response;

          if (product.woo_id) {
            // Mettre à jour
            console.log(`Mise à jour produit ${product.name} (${product._id}) dans WooCommerce`);
            response = await wooClient.put(`products/${product.woo_id}`, wcData);
            results.updated++;
          } else {
            // Créer
            console.log(`Création produit ${product.name} (${product._id}) dans WooCommerce`);
            response = await wooClient.post('products', wcData);
            results.created++;
          }

          // Mettre à jour la base locale avec les nouvelles données
          const updateData = {
            woo_id: response.data.id,
            last_sync: new Date(),
            image: updatedProduct.image,
            gallery_images: updatedProduct.gallery_images,
          };

          await updateDatabase(product._id, updateData);

          console.log(
            `Produit ${product.name} synchronisé avec ID WC: ${response.data.id}, woo_id ajouté dans la base locale`
          );
        } catch (error) {
          console.error(`Erreur pour produit ${product.name} (${product._id}):`, error.message);
          results.errors.push({
            product_id: product._id,
            name: product.name,
            error: error.message,
          });
        }

        // Attendre un peu pour éviter de surcharger l'API
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Attendre un peu plus longtemps entre les lots
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(`
    Synchronisation terminée:
    - ${results.created} produits créés
    - ${results.updated} produits mis à jour
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
  // Analyser les arguments de ligne de commande
  const args = process.argv.slice(2);
  const batchSize = parseInt(args.find((arg) => arg.startsWith('--batch='))?.split('=')[1] || '10');

  console.log(`Taille de lot: ${batchSize} produits`);

  createProducts(batchSize)
    .then(() => {
      console.log('Script terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur non gérée:', error);
      process.exit(1);
    });
}

module.exports = { createProducts };
