// AppServe\models\Brand.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');
const Supplier = require('./Supplier');
const { buildSupplierPathFlat } = require('../utils/supplierHelpers');

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

  async findByIdWithSupplierInfo(id) {
    try {
      const brand = await this.findById(id);
      if (!brand) return null;

      const supplierIds = brand.suppliers || [];
      if (supplierIds.length === 0) {
        return {
          ...brand,
          supplier_info: {
            refs: [],
            primary: null,
          },
        };
      }

      const allSuppliers = await Supplier.find({ _id: { $in: supplierIds } });

      const refs = allSuppliers.map((supplier) => {
        const pathInfo = buildSupplierPathFlat(supplier, brand);
        return {
          id: supplier._id,
          name: supplier.name,
          ...pathInfo,
        };
      });

      return {
        ...brand,
        supplier_info: {
          refs,
          primary: refs[0] || null,
        },
      };
    } catch (error) {
      console.error('Erreur récupération marque avec fournisseurs:', error);
      throw error;
    }
  }
}

module.exports = new Brand();
