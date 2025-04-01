// Modification de Brand.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class Brand extends BaseModel {
  constructor() {
    super(db.brands, 'brands');
  }

  // Méthodes spécifiques aux marques
  async findBySupplier(supplierId) {
    return new Promise((resolve, reject) => {
      this.collection.find({ supplier_id: supplierId }, (err, docs) => {
        if (err) reject(err);
        resolve(docs);
      });
    });
  }

  async create(data) {
    return new Promise((resolve, reject) => {
      this.collection.insert(
        {
          ...data,
          woo_id: null,
          last_sync: null,
          products_count: 0, // Initialiser le compteur à 0
        },
        (err, newDoc) => {
          if (err) reject(err);
          resolve(newDoc);
        }
      );
    });
  }

  // Nouvelle méthode pour mettre à jour le compteur
  async updateProductCount(brandId) {
    return new Promise((resolve, reject) => {
      // 1. Compter les produits associés à cette marque
      db.products.count({ brand_id: brandId }, (err, count) => {
        if (err) {
          reject(err);
          return;
        }

        // 2. Mettre à jour le document de la marque
        this.collection.update(
          { _id: brandId },
          { $set: { products_count: count } },
          {},
          (updateErr) => {
            if (updateErr) {
              reject(updateErr);
              return;
            }
            resolve(count);
          }
        );
      });
    });
  }

  // Méthode pour calculer les compteurs pour toutes les marques
  async recalculateAllProductCounts() {
    return new Promise(async (resolve, reject) => {
      try {
        // Récupérer toutes les marques
        const brands = await this.findAll();

        // Pour chaque marque, calculer et mettre à jour le compteur
        const updatePromises = brands.map((brand) => this.updateProductCount(brand._id));

        // Attendre que toutes les mises à jour soient terminées
        await Promise.all(updatePromises);

        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new Brand();
