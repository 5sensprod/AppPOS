const SyncStrategy = require('../base/SyncStrategy');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const Brand = require('../../models/Brand');
const categoryService = require('../CategoryWooCommerceService');
const brandService = require('../BrandWooCommerceService');
const WordPressImageSync = require('../image/WordPressImageSync');
const { v4: uuidv4 } = require('uuid');

class ProductSyncStrategy extends SyncStrategy {
  constructor() {
    super('products');
  }

  async _mapLocalToWooCommerce(product) {
    const wcData = {
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      regular_price: (product.regular_price || product.price).toString(),
      price: product.price.toString(),
      sale_price: (product.sale_price || '').toString(),
      status: product.status === 'published' ? 'publish' : 'draft',
      manage_stock: product.manage_stock || false,
      stock_quantity: product.stock || 0,
      meta_data: [...(product.meta_data || []), { key: 'brand_id', value: product.brand_id }],
    };

    wcData.categories = await this._prepareCategoryData(product);

    if (product.brand_id) {
      wcData.brands = await this._prepareBrandData(product.brand_id);
    }

    wcData.images = this._prepareImageData(product);
    return wcData;
  }

  async _prepareCategoryData(product) {
    const categoryIds =
      product.categories?.length > 0
        ? product.categories
        : product.category_id
          ? [product.category_id]
          : [];

    if (categoryIds.length === 0) return [];

    const categories = await Category.findAll();
    const productCategories = categories.filter((c) => categoryIds.includes(c._id));
    const unsynced = productCategories.filter((c) => !c.woo_id);

    // 🔁 Étape 1 : synchro automatique si woo_id manquant
    if (unsynced.length > 0) {
      console.log(
        `[SYNC] 🔄 Synchronisation automatique de ${unsynced.length} catégorie(s) :`,
        unsynced.map((c) => c.name)
      );
      await categoryService.syncToWooCommerce(unsynced);
    }

    // 🧪 Étape 2 : vérification post-synchro
    const updatedCategories = await Category.findAll();
    const mapped = updatedCategories
      .filter((c) => categoryIds.includes(c._id) && c.woo_id)
      .map((c) => ({ id: parseInt(c.woo_id) }));

    const stillMissing = updatedCategories.filter((c) => categoryIds.includes(c._id) && !c.woo_id);

    if (stillMissing.length > 0) {
      throw new Error(
        `⛔ Certaines catégories n'ont pas pu être synchronisées avec WooCommerce : ${stillMissing.map((c) => c.name).join(', ')}`
      );
    }

    // ✅ WooCommerce exige au moins une catégorie : fallback si nécessaire
    return mapped.length > 0 ? mapped : [{ id: 1 }]; // ID 1 = catégorie par défaut Woo
  }

  async _prepareBrandData(brandId) {
    const brand = await Brand.findById(brandId);
    if (!brand) return null;

    if (!brand.woo_id) {
      await brandService.syncToWooCommerce([brand]);
    }

    const updated = await Brand.findById(brandId);
    return updated?.woo_id ? [{ id: parseInt(updated.woo_id) }] : null;
  }

  _prepareImageData(product) {
    const images = [];
    const processedIds = new Set();

    // Ajouter l'image principale si elle existe et a un wp_id
    if (product.image?.wp_id) {
      images.push({
        id: parseInt(product.image.wp_id),
        src: product.image.url || product.image.src,
        position: 0,
        alt: product.name,
      });
      processedIds.add(product.image.wp_id);
    }

    // Ajouter les images de la galerie sans doublons
    if (product.gallery_images?.length) {
      const gallery = product.gallery_images
        .filter((img) => img.wp_id && !processedIds.has(img.wp_id))
        .map((img, i) => {
          processedIds.add(img.wp_id);
          return {
            id: parseInt(img.wp_id),
            src: img.url || img.src,
            position: i + 1,
            alt: `${product.name} - ${i + 1}`,
          };
        });

      images.push(...gallery);
    }

    return images;
  }

  async syncToWooCommerce(product, client, results = { created: 0, updated: 0, errors: [] }) {
    try {
      const updatedProduct = await this._syncPendingImages(product);
      const wcData = await this._mapLocalToWooCommerce(updatedProduct);

      let response;
      if (updatedProduct.woo_id) {
        response = await client.put(`${this.endpoint}/${updatedProduct.woo_id}`, wcData);
        await this._updateLocal(updatedProduct._id, response.data);
        results.updated++;
      } else {
        response = await client.post(this.endpoint, wcData);
        await Product.update(updatedProduct._id, { woo_id: response.data.id });
        await client.put(`${this.endpoint}/${response.data.id}`, { images: wcData.images });
        await this._updateLocal(updatedProduct._id, response.data);
        results.created++;
      }

      return { success: true, product: await Product.findById(updatedProduct._id), results };
    } catch (error) {
      results.errors.push({ product_id: product._id, error: error.message });
      return { success: false, error, results };
    }
  }

  async _syncPendingImages(product) {
    if (!product.gallery_images?.length) return product;

    const pendingImages = product.gallery_images.filter((img) => !img.wp_id && img.local_path);

    if (!pendingImages.length) return product;

    const wpSync = new WordPressImageSync();
    const updatedGallery = [...product.gallery_images];

    // Map pour suivre les chemins d'images déjà téléversées
    const processedPaths = new Map();

    // Téléverser chaque image en attente
    for (let i = 0; i < updatedGallery.length; i++) {
      const img = updatedGallery[i];
      if (!img.wp_id && img.local_path) {
        try {
          // Si cette image a déjà été téléversée (même chemin), réutiliser les résultats
          if (processedPaths.has(img.local_path)) {
            const existingUpload = processedPaths.get(img.local_path);
            updatedGallery[i] = {
              ...img,
              wp_id: existingUpload.wp_id,
              url: existingUpload.url,
              status: 'active',
            };
          } else {
            // Sinon, téléverser l'image
            const wpData = await wpSync.uploadToWordPress(img.local_path);
            updatedGallery[i] = {
              ...img,
              wp_id: wpData.id,
              url: wpData.url,
              status: 'active',
            };
            // Enregistrer ce résultat pour réutilisation
            processedPaths.set(img.local_path, {
              wp_id: wpData.id,
              url: wpData.url,
            });
          }
        } catch (error) {
          console.error(`Erreur upload WP pour image ${i}:`, error);
        }
      }
    }

    // Mettre à jour l'image principale si nécessaire
    let mainImage = product.image;
    if (mainImage && !mainImage.wp_id && mainImage.local_path) {
      try {
        // Vérifier si cette image a déjà été téléversée
        if (processedPaths.has(mainImage.local_path)) {
          const existingUpload = processedPaths.get(mainImage.local_path);
          mainImage = {
            ...mainImage,
            wp_id: existingUpload.wp_id,
            url: existingUpload.url,
            status: 'active',
          };
        } else {
          // Sinon téléverser l'image
          const wpData = await wpSync.uploadToWordPress(mainImage.local_path);
          mainImage = {
            ...mainImage,
            wp_id: wpData.id,
            url: wpData.url,
            status: 'active',
          };
        }
      } catch (error) {
        console.error(`Erreur upload WP pour image principale:`, error);
      }
    }

    // Sauvegarder les modifications
    await Product.update(product._id, {
      gallery_images: updatedGallery,
      image: mainImage,
    });

    // Recharger le produit avec les images mises à jour
    return await Product.findById(product._id);
  }

  async _updateLocal(productId, wcData) {
    const product = await Product.findById(productId);
    const mainImage = wcData.images?.[0];

    // Préserver les propriétés locales de l'image principale
    const image = mainImage
      ? {
          _id: product.image?._id || uuidv4(),
          wp_id: mainImage.id,
          url: mainImage.src,
          status: 'active',
          // Préserver les chemins locaux
          src: product.image?.src || mainImage.src,
          local_path: product.image?.local_path || null,
          type: product.image?.type || null,
          metadata: product.image?.metadata || null,
        }
      : null;

    // Préserver les chemins locaux de la galerie SANS CRÉER DE DOUBLONS
    const gallery = [];
    const addedWpIds = new Set();

    // Ajouter chaque image de WooCommerce sans duplication
    for (const wcImage of wcData.images || []) {
      // Éviter les doublons en vérifiant si l'ID a déjà été traité
      if (addedWpIds.has(wcImage.id)) continue;

      // Marquer cet ID comme traité
      addedWpIds.add(wcImage.id);

      // Chercher l'image correspondante dans la galerie actuelle
      const existingImg = product.gallery_images?.find((g) => g.wp_id === wcImage.id);

      gallery.push({
        _id: existingImg?._id || uuidv4(),
        wp_id: wcImage.id,
        url: wcImage.src,
        src: existingImg?.src || wcImage.src,
        local_path: existingImg?.local_path || null,
        status: 'active',
        type: existingImg?.type || null,
        metadata: existingImg?.metadata || null,
      });
    }

    await Product.update(productId, {
      woo_id: wcData.id,
      website_url: wcData.permalink || null,
      last_sync: new Date(),
      image,
      gallery_images: gallery,
      pending_sync: false,
    });
  }

  async handleFullSync(client, results = { created: 0, updated: 0, deleted: 0, errors: [] }) {
    const [local, wc] = await Promise.all([
      Product.findAll(),
      client.get(this.endpoint, { per_page: 100 }),
    ]);

    await this._deleteNonExistent(wc.data, local, client, results);

    for (const product of local) {
      await this.syncToWooCommerce(product, client, results);
    }

    return results;
  }

  async _deleteNonExistent(wcItems, localItems, client, results) {
    for (const item of wcItems) {
      if (!localItems.some((p) => p.woo_id === item.id)) {
        try {
          if (item.images?.length) {
            for (const img of item.images) await client.deleteMedia(img.id);
          }
          await client.delete(`${this.endpoint}/${item.id}`, { force: true });
          results.deleted++;
        } catch (e) {
          results.errors.push({ product_id: item.id, error: `Erreur suppression: ${e.message}` });
        }
      }
    }
  }
}

module.exports = ProductSyncStrategy;
