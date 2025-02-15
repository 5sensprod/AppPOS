const BaseWooCommerceService = require('./base/BaseWooCommerceService');
const Product = require('../models/Product');

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
      } else {
        await this._syncProductToWC(input, results);
      }
    } catch (error) {
      results.errors.push({ error: error.message });
    }
    return results;
  }

  async _syncProductToWC(product, results) {
    try {
      const wcData = this._mapLocalToWooCommerce(product);

      if (product.woo_id) {
        await this.wcApi.put(`${this.endpoint}/${product.woo_id}`, wcData);
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

  _mapLocalToWooCommerce(product) {
    const wcData = {
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      regular_price: product.regular_price?.toString() || product.price.toString(),
      price: product.price.toString(),
      sale_price: product.sale_price?.toString() || '',
      status: product.status === 'published' ? 'publish' : 'draft',
      manage_stock: product.manage_stock,
      stock_quantity: product.stock,
      meta_data: product.meta_data || [],
    };

    let images = [];
    if (product.image?.wp_id) {
      images.push({
        id: parseInt(product.image.wp_id),
        src: product.image.url,
        position: 0,
        alt: product.name,
      });
    }

    if (product.gallery_images?.length > 0) {
      const galleryImages = product.gallery_images
        .filter((img) => img.wp_id)
        .map((img, index) => ({
          id: parseInt(img.wp_id),
          src: img.url,
          position: index + 1,
          alt: `${product.name} - ${index + 1}`,
        }));
      images = [...images, ...galleryImages];
    }

    wcData.images = images;
    return wcData;
  }
}

module.exports = new ProductWooCommerceService();
