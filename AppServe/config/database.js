// config/database.js
const Datastore = require('nedb');
const path = require('path');

class Database {
  constructor() {
    this.entities = ['categories', 'products', 'brands', 'suppliers'];
    this.stores = {};
    this.initializeStores();
  }

  getDbConfig(filename) {
    return {
      filename: process.env.NODE_ENV === 'test' ? null : path.join(__dirname, '../data', filename),
      autoload: true,
    };
  }

  initializeStores() {
    this.entities.forEach((entity) => {
      this.stores[entity] = new Datastore(this.getDbConfig(`${entity}.db`));
    });
  }

  getStore(entity) {
    return this.stores[entity];
  }
}

module.exports = new Database().stores;
