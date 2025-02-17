// services/sync/ProductSync.js
const SyncStrategy = require('../base/SyncStrategy');
const Product = require('../../models/Product');
const Category = require('../../models/Category');

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
      meta_data: product.meta_data || [],
    };

    // Gestion explicite des catégories
    wcData.categories = await this._prepareCategoryData(product);

    // Gestion des images
    wcData.images = this._prepareImageData(product);

    console.log('WC Data prepared:', wcData);
    return wcData;
  }

  async _prepareCategoryData(product) {
    // Si categories est vide ET category_id est null, utiliser "non classée"
    if (
      (!product.categories || product.categories.length === 0) &&
      (!product.category_id || product.category_id === null)
    ) {
      console.log('Aucune catégorie définie, utilisation de "non classée"');
      return [{ id: 1 }]; // Catégorie "non classée" de WooCommerce
    }

    // Utiliser categories s'il existe, sinon utiliser category_id
    const categoryIds =
      product.categories?.length > 0
        ? product.categories
        : product.category_id
          ? [product.category_id]
          : [];

    const categories = await Category.findAll();
    const mappedCategories = categories
      .filter((cat) => categoryIds.includes(cat._id) && cat.woo_id)
      .map((cat) => ({ id: parseInt(cat.woo_id) }));

    // Si aucune catégorie valide trouvée, utiliser "non classée"
    if (mappedCategories.length === 0) {
      console.log('Aucune catégorie valide trouvée, utilisation de "non classée"');
      return [{ id: 1 }];
    }

    return mappedCategories;
  }

  _prepareImageData(product) {
    const images = [];

    // Image principale
    if (product.image?.wp_id) {
      images.push({
        id: parseInt(product.image.wp_id),
        src: product.image.url,
        position: 0,
        alt: product.name,
      });
    }

    // Galerie d'images
    if (product.gallery_images?.length) {
      const galleryImages = product.gallery_images
        .filter((img) => img.wp_id)
        .map((img, index) => ({
          id: parseInt(img.wp_id),
          src: img.url,
          position: index + 1,
          alt: `${product.name} - ${index + 1}`,
        }));
      images.push(...galleryImages);
    }

    return images;
  }

  async _mapWooCommerceToLocal(wcProduct) {
    return {
      name: wcProduct.name,
      sku: wcProduct.sku,
      description: wcProduct.description,
      price: parseFloat(wcProduct.price),
      regular_price: parseFloat(wcProduct.regular_price),
      sale_price: wcProduct.sale_price ? parseFloat(wcProduct.sale_price) : null,
      status: wcProduct.status === 'publish' ? 'published' : 'draft',
      manage_stock: wcProduct.manage_stock,
      stock: wcProduct.stock_quantity,
      woo_id: wcProduct.id,
      categories: wcProduct.categories?.map((cat) => cat.id) || [],
      meta_data: wcProduct.meta_data || [],
    };
  }

  async syncToWooCommerce(product, client, results = { created: 0, updated: 0, errors: [] }) {
    try {
      const wcData = await this._mapLocalToWooCommerce(product);

      let response;
      if (product.woo_id) {
        response = await client.put(`${this.endpoint}/${product.woo_id}`, wcData);
        await this._updateLocalProduct(product._id, response.data);
        results.updated++;
      } else {
        response = await client.post(this.endpoint, wcData);
        await this._updateLocalProduct(product._id, response.data);
        results.created++;
      }

      return { success: true, product: await Product.findById(product._id), results };
    } catch (error) {
      results.errors.push({
        product_id: product._id,
        error: error.message,
      });
      return { success: false, error, results };
    }
  }

  async _updateLocalProduct(productId, wcData) {
    const updateData = {
      woo_id: wcData.id,
      last_sync: new Date(),
    };

    // Met à jour les images si nécessaire
    if (wcData.images?.length > 0) {
      const [mainImage, ...galleryImages] = wcData.images;
      if (mainImage) {
        updateData.image = {
          wp_id: mainImage.id,
          url: mainImage.src,
        };
      }
      if (galleryImages.length > 0) {
        updateData.gallery_images = galleryImages.map((img) => ({
          wp_id: img.id,
          url: img.src,
        }));
      }
    }

    await Product.update(productId, updateData);
  }

  async handleFullSync(client, results = { created: 0, updated: 0, deleted: 0, errors: [] }) {
    try {
      const [localProducts, wcResponse] = await Promise.all([
        Product.findAll(),
        client.get(this.endpoint, { per_page: 100 }),
      ]);

      // Suppression des produits qui n'existent plus en local
      await this._deleteNonExistentProducts(wcResponse.data, localProducts, client, results);

      // Synchronisation des produits locaux
      for (const product of localProducts) {
        await this.syncToWooCommerce(product, client, results);
      }

      return results;
    } catch (error) {
      results.errors.push({
        error: error.message,
      });
      return results;
    }
  }

  async _deleteNonExistentProducts(wcProducts, localProducts, client, results) {
    for (const wcProduct of wcProducts) {
      if (!localProducts.some((product) => product.woo_id === wcProduct.id)) {
        try {
          // Supprimer les images
          if (wcProduct.images?.length) {
            for (const image of wcProduct.images) {
              await client.deleteMedia(image.id);
            }
          }
          // Supprimer le produit
          await client.delete(`${this.endpoint}/${wcProduct.id}`, { force: true });
          results.deleted++;
        } catch (error) {
          results.errors.push({
            product_id: wcProduct.id,
            error: `Erreur suppression WC: ${error.message}`,
          });
        }
      }
    }
  }
}

module.exports = ProductSyncStrategy;
