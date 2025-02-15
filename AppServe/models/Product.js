const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class Product extends BaseModel {
  constructor() {
    super(db.products, 'products');
  }
}

module.exports = new Product();
