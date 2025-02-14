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
}

module.exports = new Brand();
