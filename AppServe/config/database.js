// config/database.js
const Datastore = require('nedb');
const path = require('path');

const getDbConfig = (filename) => ({
  filename:
    process.env.NODE_ENV === 'test'
      ? null // En mémoire pour les tests
      : path.join(__dirname, '../data', filename),
  autoload: true,
});

const db = {
  categories: new Datastore(getDbConfig('categories.db')),
  products: new Datastore(getDbConfig('products.db')),
  brands: new Datastore(getDbConfig('brands.db')),
  suppliers: new Datastore(getDbConfig('suppliers.db')),
};

module.exports = db;
