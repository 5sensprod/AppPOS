// repositories/ProductRepository.js
const BaseRepository = require('./BaseRepository');
const Product = require('../models/Product');

class ProductRepository extends BaseRepository {
  constructor() {
    super(Product);
  }

  // Méthodes spécifiques aux produits
  async findByCategory(categoryId) {
    const allProducts = await this.findAll();
    return allProducts.filter(
      (product) =>
        (product.categories && product.categories.includes(categoryId)) ||
        product.category_id === categoryId
    );
  }

  async findByBrand(brandId) {
    const allProducts = await this.findAll();
    return allProducts.filter((product) => product.brand_id === brandId);
  }
}

module.exports = new ProductRepository();
