// config/database.js - Version modifiée avec collections drawer
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
    // ✅ AJOUTER les nouvelles entités pour fond de caisse
    this.entities = [
      'categories',
      'products',
      'brands',
      'suppliers',
      'sales',
      'drawer_sessions', // ✅ NOUVEAU
      'drawer_movements', // ✅ NOUVEAU
    ];
    this.stores = {};
    this.initializeStores();
    this.createIndexes();
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

  createIndexes() {
    // Index existants pour les produits
    this.stores.products.ensureIndex({ fieldName: 'sku', unique: false });
    this.stores.products.ensureIndex({ fieldName: 'name', unique: false });
    this.stores.products.ensureIndex({ fieldName: 'status', unique: false });

    // Index existants pour les catégories
    this.stores.categories.ensureIndex({ fieldName: 'name', unique: false });
    this.stores.categories.ensureIndex({ fieldName: 'parent_id', unique: false });

    // Index existants pour les marques et fournisseurs
    this.stores.brands.ensureIndex({ fieldName: 'name', unique: false });
    this.stores.suppliers.ensureIndex({ fieldName: 'name', unique: false });

    // Index existants pour les ventes
    this.stores.sales.ensureIndex({ fieldName: 'transaction_id', unique: true });
    this.stores.sales.ensureIndex({ fieldName: 'cashier_id', unique: false });
    this.stores.sales.ensureIndex({ fieldName: 'created_at', unique: false });
    this.stores.sales.ensureIndex({ fieldName: 'status', unique: false });

    // ✅ NOUVEAUX INDEX pour sessions de caisse
    this.stores.drawer_sessions.ensureIndex({ fieldName: 'cashier_id', unique: false });
    this.stores.drawer_sessions.ensureIndex({ fieldName: 'opened_at', unique: false });
    this.stores.drawer_sessions.ensureIndex({ fieldName: 'status', unique: false });
    this.stores.drawer_sessions.ensureIndex({ fieldName: 'cashier_id,status', unique: false });

    // ✅ NOUVEAUX INDEX pour mouvements de caisse
    this.stores.drawer_movements.ensureIndex({ fieldName: 'drawer_session_id', unique: false });
    this.stores.drawer_movements.ensureIndex({ fieldName: 'cashier_id', unique: false });
    this.stores.drawer_movements.ensureIndex({ fieldName: 'created_at', unique: false });
    this.stores.drawer_movements.ensureIndex({ fieldName: 'type', unique: false });
  }

  getStore(entity) {
    return this.stores[entity];
  }
}

module.exports = new Database().stores;
