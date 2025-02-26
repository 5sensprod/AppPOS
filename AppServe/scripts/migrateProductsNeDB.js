// migrateProductsNeDB.js
const fs = require('fs').promises;
const path = require('path');
const Datastore = require('nedb');
const util = require('util');

// Chemins des fichiers
const SOURCE_PRODUCTS_FILE = path.join(__dirname, 'data', 'source', 'old_products.db');
const TARGET_PRODUCTS_FILE = path.join(__dirname, 'data', 'products.db');
const BRANDS_FILE = path.join(__dirname, 'data', 'brands.db');
const SOURCE_IMAGES_DIR = path.join(__dirname, 'public', 'products');

// Promisify nedb functions
function createDatastore(filePath) {
  const db = new Datastore({ filename: filePath, autoload: true });
  db.findAsync = util.promisify(db.find);
  db.findOneAsync = util.promisify(db.findOne);
  db.insertAsync = util.promisify(db.insert);
  db.removeAsync = util.promisify(db.remove);
  return db;
}

// Vérification et préparation des fichiers de destination
async function prepareDestinationFiles() {
  // Vérifier si les répertoires existent, sinon les créer
  const targetDir = path.dirname(TARGET_PRODUCTS_FILE);
  try {
    await fs.mkdir(targetDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  // Optionnel: Sauvegarder les fichiers existants avant de les modifier
  try {
    const now = new Date().toISOString().replace(/:/g, '-');

    try {
      await fs.access(TARGET_PRODUCTS_FILE);
      await fs.copyFile(TARGET_PRODUCTS_FILE, `${TARGET_PRODUCTS_FILE}.backup-${now}`);
      console.log(`Sauvegarde créée: ${TARGET_PRODUCTS_FILE}.backup-${now}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  } catch (error) {
    console.warn('Avertissement lors de la création des sauvegardes:', error.message);
  }
}

// Fonction pour récupérer l'ID de la marque à partir de son nom
async function getBrandIdByName(brandName, brandsDb) {
  try {
    const brand = await brandsDb.findOneAsync({ name: brandName });
    if (brand) {
      return brand._id;
    }
    return null;
  } catch (error) {
    console.warn(`Erreur lors de la recherche de la marque ${brandName}:`, error.message);
    return null;
  }
}

// Fonction pour migrer les images d'un produit
async function migrateProductImages(oldProduct, newProductId) {
  const result = {
    mainImage: null,
    galleryImages: [],
  };

  // Vérifier si le produit a des images
  if (!oldProduct.photos || !oldProduct.photos.length) {
    return result;
  }

  // Créer le dossier de destination pour les images du produit
  const productImagesDir = path.join(SOURCE_IMAGES_DIR, newProductId);
  try {
    await fs.mkdir(productImagesDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(`Erreur lors de la création du dossier d'images pour ${newProductId}:`, err);
      return result;
    }
  }

  // Traiter chaque image
  for (let i = 0; i < oldProduct.photos.length; i++) {
    const photoUrl = oldProduct.photos[i];

    try {
      // Extraire le nom du fichier de l'URL
      const fileName = path.basename(photoUrl);
      const filePath = `/public/products/${newProductId}/${fileName}`;

      // Construction de l'objet image
      const imageObject = {
        src: filePath,
        local_path: path.join(productImagesDir, fileName),
        status: 'pending', // Sera mis à jour après synchronisation avec WooCommerce
        type: path.extname(fileName).substring(1),
        metadata: {
          original_name: fileName,
          size: 0, // Impossible de déterminer sans le fichier
          mimetype: `image/${path.extname(fileName).substring(1)}`,
        },
      };

      // Ajouter à la galerie
      result.galleryImages.push(imageObject);

      // Si c'est la première image ou l'image principale (featuredImage)
      if (i === 0 || (oldProduct.featuredImage && fileName.includes(oldProduct.featuredImage))) {
        result.mainImage = { ...imageObject };
      }
    } catch (error) {
      console.error(`Erreur lors du traitement de l'image ${photoUrl}:`, error);
    }
  }

  // Si aucune image principale n'a été définie mais qu'il y a des images dans la galerie
  if (!result.mainImage && result.galleryImages.length > 0) {
    result.mainImage = { ...result.galleryImages[0] };
  }

  return result;
}

// Fonction principale de migration
async function migrateProducts(shouldReset = false) {
  console.log('Démarrage de la migration des produits...');

  try {
    // Préparation des fichiers de destination
    await prepareDestinationFiles();

    // Si reset demandé, vider la base de destination
    if (shouldReset) {
      const productsDb = createDatastore(TARGET_PRODUCTS_FILE);
      await productsDb.removeAsync({}, { multi: true });
      console.log('Base de données produits vidée avant migration.');
    }

    // 1. Lecture du fichier source des produits
    const sourceData = await fs.readFile(SOURCE_PRODUCTS_FILE, 'utf8');
    const products = sourceData
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));

    console.log(`Lecture de ${products.length} produits depuis la source.`);

    // 2. Connexion aux bases
    const productsDb = createDatastore(TARGET_PRODUCTS_FILE);
    const brandsDb = createDatastore(BRANDS_FILE);

    // 3. Migrer les données
    let importedCount = 0;
    let errorCount = 0;
    const processedIds = new Set();

    for (const oldProduct of products) {
      try {
        // Vérifier si l'ID a déjà été traité (éviter les doublons)
        if (processedIds.has(oldProduct._id)) {
          console.log(
            `Produit avec ID ${oldProduct._id} déjà traité, génération d'un nouvel ID...`
          );
          continue;
        }

        processedIds.add(oldProduct._id);

        // Récupérer l'ID de la marque à partir de son nom
        const brandId = await getBrandIdByName(oldProduct.marque || oldProduct.brand, brandsDb);

        // Vérifier si le produit existe déjà dans la base cible
        try {
          const existing = await productsDb.findOneAsync({ _id: oldProduct._id });
          if (existing) {
            console.log(`Produit ${oldProduct._id} existe déjà dans la base cible, ignoré`);
            continue;
          }
        } catch (findError) {
          // Ignorer l'erreur de recherche et tenter l'insertion
        }

        // Migrer les images du produit
        const images = await migrateProductImages(oldProduct, oldProduct._id);

        // Créer le nouvel objet produit conforme au schéma Joi
        const newProduct = {
          _id: oldProduct._id,
          name:
            oldProduct.designation ||
            `${oldProduct.marque || oldProduct.brand} ${oldProduct.reference}`,
          sku: oldProduct.SKU || oldProduct.reference,
          description: oldProduct.description || '',
          description_short: oldProduct.descriptionCourte || '',
          price: parseFloat(oldProduct.prixVente) || 0,
          regular_price: parseFloat(oldProduct.prixVente) || 0,
          sale_price: null,
          purchase_price: parseFloat(oldProduct.prixAchat) || 0,
          on_sale: false,
          status: 'draft', // Par défaut en brouillon
          manage_stock: true,
          stock: oldProduct.stock || 0,
          min_stock: 0,
          brand_id: brandId,
          supplier_id: oldProduct.supplierId || null,
          categories: [oldProduct.categorie].filter(Boolean), // Filtrer les valeurs null/undefined
          category_id: oldProduct.categorie || null,
          margins: {
            amount: parseFloat(oldProduct.prixVente) - parseFloat(oldProduct.prixAchat) || 0,
            margin_rate: oldProduct.marge || 0,
            markup_rate: 0,
            coefficient: 0,
          },
          tax: {
            rate: oldProduct.tva || 20,
            included: true,
          },
          meta_data: [
            { key: 'reference', value: oldProduct.reference || '' },
            { key: 'barcode', value: oldProduct.gencode || '' },
          ],
          woo_id: null,
          last_sync: null,
          image: images.mainImage,
          gallery_images: images.galleryImages,
        };

        // Ajouter des videos si présentes
        if (oldProduct.videos && oldProduct.videos.length) {
          newProduct.meta_data.push({
            key: 'product_videos',
            value: JSON.stringify(oldProduct.videos),
          });
        }

        await productsDb.insertAsync(newProduct);
        importedCount++;
      } catch (error) {
        console.error(`Erreur lors de l'import du produit ${oldProduct._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`Migration terminée: ${importedCount} produits importés, ${errorCount} erreurs.`);

    return {
      success: true,
      imported: importedCount,
      errors: errorCount,
    };
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    return { success: false, error: error.message };
  }
}

// Exécuter la migration
if (require.main === module) {
  // Analyser les arguments de ligne de commande
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset') || args.includes('-r');

  if (shouldReset) {
    console.log('Mode reset activé: la base de données produits sera vidée avant migration');
  }

  migrateProducts(shouldReset)
    .then((result) => {
      if (result.success) {
        console.log('Migration réussie!');
      } else {
        console.error('Échec de la migration:', result.error);
      }
    })
    .catch((error) => {
      console.error('Erreur non gérée:', error);
    });
}

module.exports = { migrateProducts };
