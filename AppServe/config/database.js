// config/database.js - Version corrigée sans fallback problématique
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');
const pathManager = require('../utils/PathManager');

class Database {
  constructor() {
    this.entities = [
      'categories',
      'products',
      'brands',
      'suppliers',
      'sales',
      'drawer_sessions',
      'drawer_movements',
      'session_reports',
      'label_presets',
      'user_presets',
    ];
    this.stores = {};
    this.initialized = false;

    // Initialiser de manière asynchrone
    this.initializeAsync();
  }

  async initializeAsync() {
    try {
      console.log('🗃️ [DATABASE] Initialisation...');

      // 🔧 ATTENDRE que PathManager soit initialisé
      if (!pathManager.initialized) {
        await pathManager.initialize();
      }

      // ✅ TOUJOURS utiliser PathManager (plus de fallback)
      this.dataDir = pathManager.getDataPath();

      console.log(`📁 [DATABASE] Mode: ${pathManager.useAppData ? 'AppData' : 'Local'}`);
      console.log(`📂 [DATABASE] Répertoire données: ${this.dataDir}`);

      // Créer le dossier data s'il n'existe pas
      this.ensureDataDirectory();

      // Initialiser les stores
      this.initializeStores();

      // Créer les index
      this.createIndexes();

      this.initialized = true;
      console.log('✅ [DATABASE] Initialisation terminée');
    } catch (error) {
      console.error('❌ [DATABASE] Erreur initialisation:', error);
      throw error;
    }
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log(`📁 [DATABASE] Répertoire créé: ${this.dataDir}`);
    }
  }

  /**
   * 🔧 CORRIGÉ : Configuration des DB sans fallback problématique
   */
  getDbConfig(filename) {
    // 🚨 ATTENDRE l'initialisation si nécessaire
    if (!this.initialized || !this.dataDir) {
      console.error('❌ [DATABASE] Base de données pas encore initialisée !');
      // 🔧 NOUVEAU : Utiliser pathManager même si pas encore initialisé
      const tempDataDir = pathManager.getDataPath();
      return {
        filename: process.env.NODE_ENV === 'test' ? null : path.join(tempDataDir, filename),
        autoload: true,
      };
    }

    return {
      filename: process.env.NODE_ENV === 'test' ? null : path.join(this.dataDir, filename),
      autoload: true,
    };
  }

  initializeStores() {
    console.log('🔧 [DATABASE] Initialisation des stores...');

    this.entities.forEach((entity) => {
      try {
        this.stores[entity] = new Datastore(this.getDbConfig(`${entity}.db`));
        console.log(`  ✅ Store ${entity} initialisé`);
      } catch (error) {
        console.error(`  ❌ Erreur initialisation store ${entity}:`, error);
      }
    });
  }

  createIndexes() {
    console.log('📇 [DATABASE] Création des index...');

    try {
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

      // ✅ INDEX pour sessions de caisse
      this.stores.drawer_sessions.ensureIndex({ fieldName: 'cashier_id', unique: false });
      this.stores.drawer_sessions.ensureIndex({ fieldName: 'opened_at', unique: false });
      this.stores.drawer_sessions.ensureIndex({ fieldName: 'status', unique: false });
      this.stores.drawer_sessions.ensureIndex({ fieldName: 'cashier_id,status', unique: false });

      // ✅ INDEX pour mouvements de caisse
      this.stores.drawer_movements.ensureIndex({ fieldName: 'drawer_session_id', unique: false });
      this.stores.drawer_movements.ensureIndex({ fieldName: 'cashier_id', unique: false });
      this.stores.drawer_movements.ensureIndex({ fieldName: 'created_at', unique: false });
      this.stores.drawer_movements.ensureIndex({ fieldName: 'type', unique: false });

      // ✅ NOUVEAU : Index pour label_presets
      this.stores.label_presets.ensureIndex({ fieldName: 'name', unique: false });
      this.stores.label_presets.ensureIndex({ fieldName: 'user_id', unique: false });
      this.stores.label_presets.ensureIndex({ fieldName: 'is_public', unique: false });
      this.stores.label_presets.ensureIndex({ fieldName: 'created_at', unique: false });

      this.stores.user_presets.ensureIndex({ fieldName: 'category', unique: false });
      this.stores.user_presets.ensureIndex({ fieldName: 'name', unique: false });
      this.stores.user_presets.ensureIndex({ fieldName: 'user_id', unique: false });
      this.stores.user_presets.ensureIndex({ fieldName: 'is_public', unique: false });
      this.stores.user_presets.ensureIndex({ fieldName: 'created_at', unique: false });
      this.stores.user_presets.ensureIndex({ fieldName: 'category,user_id', unique: false });

      console.log('✅ [DATABASE] Index créés avec succès');
    } catch (error) {
      console.error('❌ [DATABASE] Erreur création index:', error);
    }
  }

  getStore(entity) {
    if (!this.stores[entity]) {
      console.warn(`⚠️ [DATABASE] Store ${entity} non trouvé`);
      return null;
    }
    return this.stores[entity];
  }

  async waitForInitialization() {
    while (!this.initialized) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return true;
  }

  async diagnose() {
    console.log('🔍 [DATABASE] DIAGNOSTIC');
    console.log(`   - Initialisé: ${this.initialized}`);
    console.log(`   - Répertoire: ${this.dataDir}`);
    console.log(`   - Mode: ${pathManager.useAppData ? 'AppData' : 'Local'}`);

    console.log('\n📊 STORES:');
    for (const entity of this.entities) {
      const store = this.stores[entity];
      if (store) {
        try {
          const count = await new Promise((resolve, reject) => {
            store.count({}, (err, count) => {
              if (err) reject(err);
              else resolve(count);
            });
          });
          console.log(`   ✅ ${entity}: ${count} enregistrements`);
        } catch (error) {
          console.log(`   ❌ ${entity}: Erreur - ${error.message}`);
        }
      } else {
        console.log(`   ⚠️ ${entity}: Store non initialisé`);
      }
    }

    console.log('\n📁 FICHIERS:');
    for (const entity of this.entities) {
      const filePath = path.join(this.dataDir, `${entity}.db`);
      const exists = fs.existsSync(filePath);
      const size = exists ? (fs.statSync(filePath).size / 1024).toFixed(2) + 'KB' : 'N/A';
      console.log(`   ${exists ? '✅' : '❌'} ${entity}.db: ${size}`);
    }
  }

  getDatabasePaths() {
    const paths = {};
    this.entities.forEach((entity) => {
      paths[entity] = path.join(this.dataDir, `${entity}.db`);
    });
    return paths;
  }
}

// ✅ Export avec gestion d'initialisation
const database = new Database();

// Export des stores (compatible avec l'existant)
module.exports = database.stores;

// ✅ Export additionnel pour accès à l'instance
module.exports.database = database;
module.exports.waitForInitialization = () => database.waitForInitialization();
module.exports.diagnose = () => database.diagnose();
module.exports.getDatabasePaths = () => database.getDatabasePaths();
