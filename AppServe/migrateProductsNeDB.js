// migrateProductsNeDB.js
const fs = require('fs').promises;
const path = require('path');
const Datastore = require('nedb');
const util = require('util');
const { v4: uuidv4 } = require('uuid');

// Chemins des fichiers
const SOURCE_PRODUCTS_FILE = path.join(__dirname, 'data', 'source', 'old_products.db');
const TARGET_PRODUCTS_FILE = path.join(__dirname, 'data', 'products.db');
const BRANDS_FILE = path.join(__dirname, 'data', 'brands.db');
const SUPPLIERS_FILE = path.join(__dirname, 'data', 'suppliers.db');
const CATEGORIES_FILE = path.join(__dirname, 'data', 'categories.db');
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

// Fonction pour récupérer l'ID et le nom de la marque à partir de son nom
async function getBrandInfoByName(brandName, brandsDb) {
  try {
    const brand = await brandsDb.findOneAsync({ name: brandName });
    if (brand) {
      return {
        id: brand._id,
        name: brand.name,
      };
    }
    return null;
  } catch (error) {
    console.warn(`Erreur lors de la recherche de la marque ${brandName}:`, error.message);
    return null;
  }
}

// Fonction pour récupérer les infos d'un fournisseur à partir de son ID
async function getSupplierInfoById(supplierId, suppliersDb) {
  try {
    if (!supplierId) return null;

    const supplier = await suppliersDb.findOneAsync({ _id: supplierId });
    if (supplier) {
      return {
        id: supplier._id,
        name: supplier.name,
      };
    }
    return null;
  } catch (error) {
    console.warn(`Erreur lors de la recherche du fournisseur ${supplierId}:`, error.message);
    return null;
  }
}

// Fonction pour charger toutes les catégories en une seule fois
async function loadAllCategories(categoriesDb) {
  try {
    const categories = await categoriesDb.findAsync({});
    const categoryMap = {};

    categories.forEach((cat) => {
      categoryMap[cat._id] = cat;
    });

    return categoryMap;
  } catch (error) {
    console.error('Erreur lors du chargement des catégories:', error);
    return {};
  }
}

// Fonction pour récupérer la hiérarchie complète d'une catégorie
function getCategoryHierarchy(categoryId, categoryMap, maxDepth = 10) {
  const hierarchy = [];
  let currentId = categoryId;
  let depth = 0;

  // Remonter la hiérarchie jusqu'à la racine ou la profondeur maximale
  while (currentId && depth < maxDepth) {
    const category = categoryMap[currentId];
    if (!category) break;

    hierarchy.unshift({
      id: category._id,
      name: category.name,
      level: category.level || 0,
      woo_id: category.woo_id || null,
    });

    currentId = category.parent_id;
    depth++;
  }

  return hierarchy;
}

// NOUVELLE FONCTION: Générer directement category_info à partir d'un ID de catégorie
function generateCategoryInfo(categoryId, categoryMap) {
  if (!categoryId) return { refs: [], primary: null };

  // Obtenir la hiérarchie complète
  const hierarchy = getCategoryHierarchy(categoryId, categoryMap);
  if (!hierarchy.length) return { refs: [], primary: null };

  // Générer les références pour chaque niveau de la hiérarchie
  const refs = [];

  for (let i = 0; i < hierarchy.length; i++) {
    const level = hierarchy[i];

    // Construire le chemin jusqu'à ce niveau
    const path = hierarchy.slice(0, i + 1).map((h) => h.name);
    const pathIds = hierarchy.slice(0, i + 1).map((h) => h.id);

    refs.push({
      id: level.id,
      name: level.name,
      woo_id: level.woo_id || null,
      path: path,
      path_ids: pathIds,
      path_string: path.join(' > '),
    });
  }

  // La catégorie principale est la catégorie racine (premier élément)
  const primary = refs.length > 0 ? refs[0] : null;

  return {
    refs,
    primary,
  };
}

// Fonction pour migrer les images d'un produit
async function migrateProductImages(oldProduct, newProductId) {
  // [Le code des images reste inchangé]
  const result = {
    mainImage: null,
    galleryImages: [],
  };

  // Vérifier si le produit a des informations d'images
  const hasPhotos = oldProduct.photos && oldProduct.photos.length > 0;
  const hasFeaturedImage = oldProduct.featuredImage && typeof oldProduct.featuredImage === 'string';
  const hasPhoto = oldProduct.photo && typeof oldProduct.photo === 'string';

  // Si le produit n'a aucune information d'image, retourner le résultat vide
  if (!hasPhotos && !hasFeaturedImage && !hasPhoto) {
    console.log(`Produit ${newProductId}: Aucune information d'image trouvée.`);
    return result;
  }

  // Créer le dossier de destination pour les images du produit
  const productImagesDir = path.join(SOURCE_IMAGES_DIR, newProductId);
  try {
    await fs.mkdir(productImagesDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(`Erreur lors de la création du dossier d'images pour ${newProductId}:`, err);
    }
  }

  // 1. Si featuredImage existe, construire une image à partir de ce nom de fichier
  if (hasFeaturedImage) {
    try {
      // Extraire le nom de fichier et l'extension
      const fileName = oldProduct.featuredImage;
      let fileExt = path.extname(fileName).substring(1).toLowerCase();
      if (!fileExt) fileExt = 'jpg'; // Extension par défaut si non spécifiée

      // Construire les chemins
      const filePath = `/public/products/${newProductId}/${fileName}`;
      const localPath = path.join(productImagesDir, fileName);

      // Créer l'objet image avec _id et statut active
      const imageId = uuidv4();
      const imageObject = {
        _id: imageId,
        src: filePath,
        local_path: localPath,
        status: 'active', // Changé de 'pending' à 'active'
        type: fileExt,
        metadata: {
          original_name: fileName,
          size: 0, // Taille non-nulle
          mimetype: `image/${fileExt}`,
        },
      };

      // Ajouter à la galerie et définir comme image principale
      result.galleryImages.push(imageObject);
      result.mainImage = { ...imageObject };

      console.log(`Image créée à partir de featuredImage pour ${newProductId}: ${fileName}`);
    } catch (error) {
      console.error(
        `Erreur lors de la création de l'image à partir de featuredImage pour ${newProductId}:`,
        error
      );
    }
  }

  // 2. Ajouter les images du tableau photos s'il existe
  if (hasPhotos) {
    for (let i = 0; i < oldProduct.photos.length; i++) {
      const photoUrl = oldProduct.photos[i];

      try {
        if (!photoUrl || typeof photoUrl !== 'string') {
          continue;
        }

        // Extraire le nom de fichier et l'extension
        const fileName = path.basename(photoUrl);
        let fileExt = path.extname(fileName).substring(1).toLowerCase();
        if (!fileExt) fileExt = 'jpg'; // Extension par défaut si non spécifiée

        // Construire les chemins
        const filePath = `/public/products/${newProductId}/${fileName}`;
        const localPath = path.join(productImagesDir, fileName);

        // Créer l'objet image avec _id et statut active
        const imageId = uuidv4();
        const imageObject = {
          _id: imageId,
          src: filePath,
          local_path: localPath,
          status: 'active', // Changé de 'pending' à 'active'
          type: fileExt,
          metadata: {
            original_name: fileName,
            size: 1024, // Taille fictive non-nulle
            mimetype: `image/${fileExt}`,
          },
        };

        // Vérifier si cette image existe déjà dans la galerie (pour éviter les doublons)
        const exists = result.galleryImages.some((img) => img.src === filePath);
        if (!exists) {
          result.galleryImages.push(imageObject);
        }

        // Si c'est la première image et qu'aucune image principale n'est définie
        if (i === 0 && !result.mainImage) {
          result.mainImage = { ...imageObject };
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de l'image ${photoUrl}:`, error);
      }
    }
  }

  // 3. Utiliser le champ "photo" s'il existe (au singulier)
  if (hasPhoto && result.galleryImages.length === 0) {
    try {
      const photoUrl = oldProduct.photo;
      const fileName = path.basename(photoUrl);
      let fileExt = path.extname(fileName).substring(1).toLowerCase();
      if (!fileExt) fileExt = 'jpg'; // Extension par défaut si non spécifiée

      const filePath = `/public/products/${newProductId}/${fileName}`;
      const localPath = path.join(productImagesDir, fileName);

      // Créer l'objet image avec _id et statut active
      const imageId = uuidv4();
      const imageObject = {
        _id: imageId,
        src: filePath,
        local_path: localPath,
        status: 'active', // Changé de 'pending' à 'active'
        type: fileExt,
        metadata: {
          original_name: fileName,
          size: 1024, // Taille fictive non-nulle
          mimetype: `image/${fileExt}`,
        },
      };

      // Ajouter à la galerie et définir comme image principale
      result.galleryImages.push(imageObject);
      result.mainImage = { ...imageObject };

      console.log(`Image créée à partir du champ "photo" pour ${newProductId}: ${fileName}`);
    } catch (error) {
      console.error(
        `Erreur lors de la création de l'image à partir du champ "photo" pour ${newProductId}:`,
        error
      );
    }
  }

  console.log(
    `Produit ${newProductId}: ${result.galleryImages.length} images, image principale: ${result.mainImage ? 'OUI' : 'NON'}`
  );

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
    const suppliersDb = createDatastore(SUPPLIERS_FILE);
    const categoriesDb = createDatastore(CATEGORIES_FILE);

    // Charger toutes les catégories en une seule fois pour optimiser
    console.log('Chargement de toutes les catégories...');
    const categoryMap = await loadAllCategories(categoriesDb);
    console.log(`${Object.keys(categoryMap).length} catégories chargées.`);

    // 3. Migrer les données
    let importedCount = 0;
    let errorCount = 0;
    let productsWithImportedImages = 0;
    let totalImportedImages = 0;
    const processedIds = new Set();
    const processedSKUs = new Set(); // Pour éviter les doublons de SKU

    for (const oldProduct of products) {
      try {
        // Vérifier si l'ID a déjà été traité (éviter les doublons)
        if (processedIds.has(oldProduct._id)) {
          console.log(
            `Produit avec ID ${oldProduct._id} déjà traité, génération d'un nouvel ID...`
          );
          continue;
        }

        // Vérifier si le SKU existe déjà
        const sku = oldProduct.reference || '';
        if (sku && processedSKUs.has(sku)) {
          console.log(`SKU ${sku} déjà importé, modification nécessaire...`);
          // Ajouter un suffixe unique au SKU pour éviter les doublons
          oldProduct.reference = `${sku}-${Date.now().toString().substring(8)}`;
        }
        processedSKUs.add(oldProduct.reference);
        processedIds.add(oldProduct._id);

        // Récupérer les informations de la marque à partir de son nom
        const brandName = (oldProduct.marque || oldProduct.brand || '').trim();
        const brandInfo = await getBrandInfoByName(brandName, brandsDb);

        if (!brandInfo && brandName) {
          console.warn(`⚠️ Marque "${brandName}" introuvable dans brands.db`);
        }

        // Récupérer les informations du fournisseur à partir de son ID
        const supplierId = oldProduct.supplierId || '';
        const supplierInfo = await getSupplierInfoById(supplierId, suppliersDb);

        if (!supplierInfo && supplierId) {
          console.warn(`⚠️ Fournisseur avec ID "${supplierId}" introuvable dans suppliers.db`);
        }

        // Récupérer les ID de catégorie
        const categoryId = oldProduct.categorie;

        // NOUVELLE APPROCHE: Générer directement category_info
        const category_info = generateCategoryInfo(categoryId, categoryMap);

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

        // Mise à jour des statistiques
        if (images.galleryImages.length > 0) {
          productsWithImportedImages++;
          totalImportedImages += images.galleryImages.length;
        }

        // Vérifier si le stock est disponible pour décider du statut de gestion de stock
        const hasStock = oldProduct.stock && parseInt(oldProduct.stock) > 0;

        // Créer le nouvel objet produit conforme au format correct SANS les champs obsolètes
        const newProduct = {
          _id: oldProduct._id,
          name: oldProduct.reference || 'Produit sans nom',
          sku: oldProduct.reference || '',
          description: oldProduct.description || '',
          status: 'draft',
          manage_stock: false,
          stock: oldProduct.stock || 0,
          price: parseFloat(oldProduct.prixVente) || 0,
          brand_id: brandInfo ? brandInfo.id : null,
          brand_ref: brandInfo ? brandInfo : null,
          supplier_id: supplierInfo ? supplierInfo.id : null,
          supplier_ref: supplierInfo ? supplierInfo : null,
          categories: categoryId ? [categoryId] : [],
          category_id: categoryId || null,
          // NOUVEAU: Utiliser seulement category_info, supprimer category_ref et categories_refs
          category_info: category_info,
          image: images.mainImage,
          gallery_images: images.galleryImages,
          designation: oldProduct.designation || '',
          specifications: oldProduct.descriptionCourte
            ? { content: oldProduct.descriptionCourte }
            : null,
        };

        // Ajouter les champs optionnels seulement s'ils ont des valeurs
        if (oldProduct.prixAchat) {
          newProduct.purchase_price = parseFloat(oldProduct.prixAchat);
        }

        if (oldProduct.descriptionCourte) {
          newProduct.description_short = oldProduct.descriptionCourte;
        }

        // Éviter les structures imbriquées complexes qui ne sont pas nécessaires
        if (oldProduct.marge) {
          newProduct.margin_rate = oldProduct.marge;
        }

        if (oldProduct.tva) {
          newProduct.tax_rate = oldProduct.tva;
        }

        // Ajouter des meta_data seulement si nécessaire
        if (oldProduct.gencode) {
          newProduct.meta_data = [{ key: 'barcode', value: oldProduct.gencode || '' }];
        }

        await productsDb.insertAsync(newProduct);
        importedCount++;

        // Log pour vérifier l'importation des images
        console.log(
          `Produit ${newProduct._id} importé avec ${images.galleryImages.length} images et image principale: ${images.mainImage ? 'OUI' : 'NON'}`
        );
      } catch (error) {
        console.error(`Erreur lors de l'import du produit ${oldProduct._id}:`, error);
        errorCount++;
      }
    }

    console.log(`\nStatistiques finales de migration des images:`);
    console.log(
      `- Produits avec images importées: ${productsWithImportedImages}/${importedCount} (${((productsWithImportedImages / importedCount) * 100).toFixed(2)}%)`
    );
    console.log(`- Total d'images importées: ${totalImportedImages}`);
    console.log(
      `- Moyenne d'images par produit: ${(totalImportedImages / importedCount).toFixed(2)}`
    );

    console.log(`\nMigration terminée: ${importedCount} produits importés, ${errorCount} erreurs.`);

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
