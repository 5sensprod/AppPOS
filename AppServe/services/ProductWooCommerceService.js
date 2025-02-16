const BaseWooCommerceService = require('./base/BaseWooCommerceService');
const Product = require('../models/Product');
const Category = require('../models/Category');

class ProductWooCommerceService extends BaseWooCommerceService {
  constructor() {
    super('products');
  }

  async syncToWooCommerce(input) {
    const results = { created: 0, updated: 0, errors: [] };
    try {
      if (Array.isArray(input)) {
        for (const product of input) {
          await this._syncProductToWC(product, results);
        }
      } else if (input) {
        await this._syncProductToWC(input, results);
      }
    } catch (error) {
      results.errors.push({ error: error.message });
    }
    return results;
  }

  async _syncProductToWC(product, results) {
    try {
      const wcData = await this._prepareWooCommerceData(product);

      if (product.woo_id) {
        await this.wcApi.put(`${this.endpoint}/${product.woo_id}`, wcData);
        await Product.update(product._id, { last_sync: new Date() });
        results.updated++;
      } else {
        const response = await this.wcApi.post(this.endpoint, wcData);
        await Product.update(product._id, {
          woo_id: response.data.id,
          last_sync: new Date(),
        });
        results.created++;
      }
    } catch (error) {
      console.error('Erreur WC:', error.response?.data || error.message);
      results.errors.push({
        product_id: product._id,
        error: error.message,
      });
    }
  }

  async _prepareWooCommerceData(product) {
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

    // Gestion des catégories
    if (product.categories?.length || product.category_id) {
      const categoryIds = product.categories || [product.category_id];
      const categories = await Category.findAll();

      wcData.categories = categories
        .filter((cat) => categoryIds.includes(cat._id) && cat.woo_id)
        .map((cat) => ({ id: parseInt(cat.woo_id) }));
    }

    // Gestion des images
    const images = [];

    if (product.image?.wp_id) {
      images.push({
        id: parseInt(product.image.wp_id),
        src: product.image.url,
        position: 0,
        alt: product.name,
      });
    }

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

    wcData.images = images;
    return wcData;
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
}

module.exports = new ProductWooCommerceService();
