//AppServe\models\Supplier.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class Supplier extends BaseModel {
  constructor() {
    super(db.suppliers, 'suppliers');
  }

  getDefaultValues() {
    return {
      products_count: 0,
    };
  }

  async updateProductCount(supplierId) {
    return new Promise((resolve, reject) => {
      db.products.find({}, (err, allProducts) => {
        if (err) return reject(err);

        this.findById(supplierId)
          .then((supplier) => {
            if (!supplier) return reject(new Error(`Fournisseur avec ID ${supplierId} non trouvé`));

            const brandIds = Array.isArray(supplier.brands) ? supplier.brands : [];
            const count = allProducts.reduce((acc, product) => {
              const matchesSupplier = product.supplier_id === supplierId;
              const matchesBrand = brandIds.includes(product.brand_id);
              return acc + (matchesSupplier || matchesBrand ? 1 : 0);
            }, 0);

            this.collection.update(
              { _id: supplierId },
              { $set: { products_count: count } },
              {},
              (updateErr) => {
                if (updateErr) return reject(updateErr);

                console.log(`Compteur mis à jour pour fournisseur ${supplierId}: ${count}`);
                resolve(count);
              }
            );
          })
          .catch(reject);
      });
    });
  }

  async recalculateAllProductCounts() {
    try {
      const suppliers = await this.findAll();
      const updatePromises = suppliers.map((supplier) => this.updateProductCount(supplier._id));
      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new Supplier();
