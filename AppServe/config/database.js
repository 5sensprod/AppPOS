// config/database.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Créer le dossier data s'il n'existe pas
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class Database {
  constructor() {
    this.entities = ['categories', 'products', 'brands', 'suppliers'];
    this.stores = {};
    this.initializeStores();
  }

  getDbConfig(filename) {
    return {
      filename: process.env.NODE_ENV === 'test' ? null : path.join(dataDir, filename),
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
