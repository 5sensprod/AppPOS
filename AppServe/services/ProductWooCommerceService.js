const BaseWooCommerceService = require('./base/BaseWooCommerceService');
const Product = require('../models/Product');

class ProductWooCommerceService extends BaseWooCommerceService {
  constructor() {
    super('products');
  }

  async syncToWooCommerce(input) {
    const results = { created: 0, updated: 0, errors: [], pending: [] };

    try {
      if (Array.isArray(input)) {
        for (const product of input) {
          await this._syncProductToWC(product, results);
        }
      } else {
        const product = await Product.findById(input);
        if (!product) throw new Error('Produit non trouvé');
        await this._syncProductToWC(product, results);
      }
    } catch (error) {
      results.errors.push({
        error: error.message,
      });
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

    if (product.image?.wp_id) {
      wcData.images = [
        {
          id: parseInt(product.image.wp_id),
          src: product.image.url,
        },
      ];
    }

    return wcData;
  }

  _mapWooCommerceToLocal(wcProduct) {
    return {
      name: wcProduct.name,
      sku: wcProduct.sku,
      description: wcProduct.description,
      price: parseFloat(wcProduct.price),
      regular_price: parseFloat(wcProduct.regular_price) || parseFloat(wcProduct.price),
      sale_price: wcProduct.sale_price ? parseFloat(wcProduct.sale_price) : null,
      status: wcProduct.status === 'publish' ? 'published' : 'draft',
      stock: wcProduct.stock_quantity,
      manage_stock: wcProduct.manage_stock,
      woo_id: wcProduct.id,
      meta_data: wcProduct.meta_data || [],
    };
  }
}

module.exports = new ProductWooCommerceService();
