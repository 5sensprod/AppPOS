// config/database.js
const Datastore = require('nedb');
const path = require('path');

const db = {
  categories: new Datastore({
    filename: path.join(__dirname, '../data/categories.db'),
    autoload: true,
  }),
  products: new Datastore({
    filename: path.join(__dirname, '../data/products.db'),
    autoload: true,
  }),
  brands: new Datastore({ filename: path.join(__dirname, '../data/brands.db'), autoload: true }),
  suppliers: new Datastore({
    filename: path.join(__dirname, '../data/suppliers.db'),
    autoload: true,
  }),
};

module.exports = db;
