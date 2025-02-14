// services/woocommerceService.js
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const Category = require('../models/Category');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs').promises;
const { createWriteStream, createReadStream } = require('fs');
const path = require('path');

const wcApi = new WooCommerceRestApi({
  url: process.env.WC_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: 'wc/v3',
});

// Upload d'image vers WordPress
async function uploadToWordPress(categoryId, filename) {
  const imagePath = path.join('I:', 'AppPOS', 'public', 'categories', categoryId, filename);
  try {
    await fs.access(imagePath);
  } catch {
    throw new Error(`Image not found at ${imagePath}`);
  }

  const form = new FormData();
  form.append('file', createReadStream(imagePath));

  const credentials = Buffer.from(`${process.env.WP_USER}:${process.env.WP_APP_PASSWORD}`).toString(
    'base64'
  );

  try {
    const response = await axios.post(`${process.env.WC_URL}/wp-json/wp/v2/media`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Basic ${credentials}`,
      },
    });
    return response.data.id;
  } catch (error) {
    console.error('Erreur upload WordPress:', error.message);
    throw error;
  }
}

async function cleanTempDirectory() {
  const tempDir = path.join('I:', 'AppPOS', 'public', 'categories', 'temp');
  try {
    await fs.access(tempDir);
    await fs.rm(tempDir, { recursive: true });
  } catch (error) {
    // Le dossier n'existe pas, on ignore l'erreur
  }
}
// Synchronisation WooCommerce → Local
async function syncFromWooCommerce() {
  try {
    const wcCategories = await wcApi.get('products/categories', { per_page: 100 });
    const existingCategories = await Category.findAll();
    const results = { created: 0, updated: 0, errors: [] };

    for (const wcCategory of wcCategories.data) {
      try {
        let localCategory = existingCategories.find((cat) => cat.woo_id === wcCategory.id);

        if (!localCategory) {
          localCategory = await Category.create({
            name: wcCategory.name,
            description: wcCategory.description,
            woo_id: wcCategory.id,
            parent_id: wcCategory.parent,
            slug: wcCategory.slug,
          });
          results.created++;
        }

        if (wcCategory.image) {
          const dirPath = path.join('I:', 'AppPOS', 'public', 'categories', localCategory._id);
          await fs.mkdir(dirPath, { recursive: true });

          const localPath = path.join(dirPath, path.basename(wcCategory.image.src));
          const response = await axios.get(wcCategory.image.src, { responseType: 'stream' });

          const fileStream = createWriteStream(localPath);
          response.data.pipe(fileStream);

          await new Promise((resolve, reject) => {
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
          });

          await Category.update(localCategory._id, {
            image: {
              id: wcCategory.image.id,
              src: wcCategory.image.src,
              local_path: localPath,
            },
            last_sync: new Date(),
          });
          results.updated++;
        }
      } catch (error) {
        results.errors.push({
          category_id: wcCategory.id,
          error: error.message,
        });
      }
    }
    await cleanTempDirectory();
    return results;
  } catch (error) {
    throw new Error(`Sync from WC failed: ${error.message}`);
  }
}

// Synchronisation Local → WooCommerce
async function syncToWooCommerce(input = null) {
  const results = { created: 0, updated: 0, deleted: 0, errors: [], pending: [] };

  if (Array.isArray(input)) {
    for (const category of input) {
      try {
        await syncCategoryToWC(category, results);
      } catch (error) {
        results.errors.push({
          category_id: category._id,
          error: error.message,
        });
      }
    }
    return results;
  }

  // Si c'est un ID
  if (typeof input === 'string') {
    const category = await Category.findById(input);
    if (!category) throw new Error('Catégorie non trouvée');

    try {
      await syncCategoryToWC(category, results);
      return results;
    } catch (error) {
      results.errors.push({
        category_id: input,
        error: error.message,
      });
      return results;
    }
  }

  // Récupérer toutes les catégories WooCommerce
  const localCategories = await Category.findAll();
  const wcResponse = await wcApi.get('products/categories', { per_page: 100 });
  const wcCategories = wcResponse.data;

  // Supprimer les catégories WooCommerce qui n'existent plus en local
  for (const wcCategory of wcCategories) {
    const localExists = localCategories.some((cat) => cat.woo_id === wcCategory.id);
    if (!localExists) {
      try {
        if (wcCategory.image?.id) {
          try {
            const credentials = Buffer.from(
              `${process.env.WP_USER}:${process.env.WP_APP_PASSWORD}`
            ).toString('base64');
            await axios.delete(
              `${process.env.WC_URL}/wp-json/wp/v2/media/${wcCategory.image.id}?force=true`,
              {
                headers: { Authorization: `Basic ${credentials}` },
              }
            );
          } catch (error) {
            console.error(`Erreur suppression media ${wcCategory.image.id}:`, error.message);
          }
        }
        await wcApi.delete(`products/categories/${wcCategory.id}`, { force: true });
        results.deleted++;
      } catch (error) {
        results.errors.push({
          category_id: wcCategory.id,
          error: `Erreur suppression WC: ${error.message}`,
        });
      }
    }
  }

  // Synchroniser les catégories existantes
  for (const category of localCategories.filter((c) => !c.parent_id)) {
    try {
      await syncCategoryToWC(category, results);
    } catch (error) {
      results.errors.push({
        category_id: category._id,
        error: error.message,
      });
    }
  }

  for (const category of localCategories.filter((c) => c.parent_id)) {
    try {
      const parent = localCategories.find((c) => c._id === category.parent_id);
      if (!parent?.woo_id) {
        results.pending.push(category._id);
        continue;
      }
      await syncCategoryToWC(category, results);
    } catch (error) {
      results.errors.push({
        category_id: category._id,
        error: error.message,
      });
    }
  }

  return results;
}

async function syncCategoryToWC(category, results) {
  const wcData = {
    name: category.name,
    description: category.description || '',
    parent: category.parent_id ? (await Category.findById(category.parent_id))?.woo_id || 0 : 0,
  };

  if (category.image?.wp_id) {
    wcData.image = { id: category.image.wp_id };
  } else if (category.image?.local_path) {
    const filename = path.basename(category.image.local_path);
    const imageId = await uploadToWordPress(category._id, filename);
    wcData.image = { id: imageId };

    await Category.update(category._id, {
      image: {
        ...category.image,
        wp_id: imageId,
      },
    });
  }

  if (category.woo_id) {
    await wcApi.put(`products/categories/${category.woo_id}`, wcData);
    results.updated++;
  } else {
    const response = await wcApi.post('products/categories', wcData);
    await Category.update(category._id, {
      woo_id: response.data.id,
      last_sync: new Date(),
    });
    results.created++;
  }
}

// Suppression d'une catégorie
async function deleteCategory(categoryId) {
  const category = await Category.findById(categoryId);
  if (!category) throw new Error('Category not found');

  if (category.woo_id) {
    try {
      // Supprimer l'image WordPress si elle existe
      if (category.image?.wp_id) {
        const credentials = Buffer.from(
          `${process.env.WP_USER}:${process.env.WP_APP_PASSWORD}`
        ).toString('base64');

        try {
          const response = await axios.delete(
            `${process.env.WC_URL}/wp-json/wp/v2/media/${category.image.wp_id}?force=true`,
            {
              headers: { Authorization: `Basic ${credentials}` },
            }
          );
          console.log(`Image WordPress ${category.image.wp_id} supprimée`);
        } catch (error) {
          if (error.response?.status !== 404) {
            console.error(`Erreur suppression image WordPress:`, error);
            throw error;
          }
        }
      }

      // Supprimer la catégorie WooCommerce
      await wcApi.delete(`products/categories/${category.woo_id}`, { force: true });
    } catch (error) {
      if (error.response?.status !== 404) {
        throw error;
      }
    }
  }

  // Supprimer la catégorie en local (y compris les images)
  await Category.delete(categoryId);
  return { success: true };
}

module.exports = {
  syncFromWooCommerce,
  syncToWooCommerce,
  deleteCategory,
  cleanTempDirectory,
  testConnection: async () => {
    try {
      await wcApi.get('products/categories');
      return { status: 'success' };
    } catch (error) {
      throw new Error(`WC connection failed: ${error.message}`);
    }
  },
};
