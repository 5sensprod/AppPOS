// models/Supplier.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class Supplier extends BaseModel {
  constructor() {
    super(db.suppliers, 'suppliers');
  }
}

module.exports = new Supplier();
