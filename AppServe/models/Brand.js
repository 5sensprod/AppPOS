// AppServe\models\Brand.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class Brand extends BaseModel {
  constructor() {
    super(db.brands, 'brands');
  }

  // 🎁 Valeurs par défaut injectées dans BaseModel.create()
  getDefaultValues() {
    return {
      woo_id: null,
      last_sync: null,
      products_count: 0,
    };
  }

  async findBySupplier(supplierId) {
    return this.promisifyCall(this.collection.find, { supplier_id: supplierId });
  }

  // 🧮 Met à jour le compteur de produits pour une marque
  async updateProductCount(brandId) {
    return new Promise((resolve, reject) => {
      db.products.count({ brand_id: brandId }, (err, count) => {
        if (err) return reject(err);

        this.collection.update(
          { _id: brandId },
          { $set: { products_count: count } },
          {},
          (updateErr) => {
            if (updateErr) return reject(updateErr);
            resolve(count);
          }
        );
      });
    });
  }

  async recalculateAllProductCounts() {
    try {
      const brands = await this.findAll();
      const updatePromises = brands.map((brand) => this.updateProductCount(brand._id));
      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new Brand();
