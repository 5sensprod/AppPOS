// services/ProductService.js
const BaseEntityService = require('./BaseEntityService');
const productRepository = require('../repositories/ProductRepository');
const Category = require('../models/Category');
const eventBus = require('../events/eventBus');
const EVENTS = require('../events/eventTypes');

class ProductService extends BaseEntityService {
  constructor() {
    super(productRepository, 'PRODUCT');
  }

  async validateCategories(categoryIds) {
    if (!categoryIds || (Array.isArray(categoryIds) && categoryIds.length === 0)) return true;

    if (!Array.isArray(categoryIds)) {
      categoryIds = [categoryIds];
    }

    const categories = await Category.findAll();
    const validCategories = categories.filter((cat) => categoryIds.includes(cat._id));

    if (validCategories.length === 0 || validCategories.length !== categoryIds.length) {
      throw new Error("Certaines catégories spécifiées n'existent pas");
    }

    return validCategories;
  }

  async create(data) {
    const categories = data.categories || (data.category_id ? [data.category_id] : []);

    if (categories.length > 0) {
      await this.validateCategories(categories);
    }

    data.categories = categories;
    data.category_id = categories.length > 0 ? categories[0] : null;

    const result = await super.create(data);

    if (categories.length > 0) {
      eventBus.emit(EVENTS.CATEGORY_TREE_CHANGED);
    }

    return result;
  }

  async update(id, data) {
    let categoryChanged = false;
    const existingProduct = await this.repository.findById(id);

    if (!existingProduct) {
      throw { status: 404, message: 'Produit non trouvé' };
    }

    if ('category_id' in data || 'categories' in data) {
      const categories = data.categories || (data.category_id ? [data.category_id] : []);

      if (categories.length > 0) {
        await this.validateCategories(categories);
      }

      const oldCategories = existingProduct.categories || [];
      if (JSON.stringify(oldCategories.sort()) !== JSON.stringify(categories.sort())) {
        categoryChanged = true;
      }

      data.categories = categories;
      data.category_id = categories.length > 0 ? categories[0] : null;
    }

    const result = await super.update(id, data);

    if (categoryChanged) {
      eventBus.emit(EVENTS.CATEGORY_TREE_CHANGED);
    }

    return result;
  }

  async syncToWooCommerce(product) {
    const productWooService = require('./ProductWooCommerceService');
    return await productWooService.syncToWooCommerce(product);
  }
}

module.exports = new ProductService();
