// config/database.js - Version modifiée avec PathManager conditionnel
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');
const pathManager = require('../utils/PathManager');

class Database {
  constructor() {
    // ✅ Entities existantes + nouvelles pour fond de caisse
    this.entities = [
      'categories',
      'products',
      'brands',
      'suppliers',
      'sales',
      'drawer_sessions',
      'drawer_movements',
      'session_reports',
    ];
    this.stores = {};
    this.initialized = false;

    // Initialiser de manière asynchrone
    this.initializeAsync();
  }

  /**
   * ✅ NOUVEAU : Initialisation asynchrone avec PathManager
   */
  async initializeAsync() {
    try {
      console.log('🗃️ [DATABASE] Initialisation...');

      // Initialiser PathManager si pas encore fait
      if (!pathManager.initialized) {
        await pathManager.initialize();
      }

      // ✅ MODIFIÉ : Utiliser PathManager au lieu du chemin hardcodé
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

  /**
   * ✅ NOUVEAU : Assure que le répertoire de données existe
   */
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log(`📁 [DATABASE] Répertoire créé: ${this.dataDir}`);
    }
  }

  /**
   * ✅ MODIFIÉ : Configuration des DB avec chemin dynamique
   */
  getDbConfig(filename) {
    // Attendre l'initialisation si pas encore fait
    if (!this.initialized && !this.dataDir) {
      console.warn('⚠️ [DATABASE] Utilisation du chemin par défaut (initialisation en cours)');
      // Fallback temporaire
      const fallbackDir = pathManager.getDataPath
        ? pathManager.getDataPath()
        : path.join(__dirname, '../data');
      return {
        filename: process.env.NODE_ENV === 'test' ? null : path.join(fallbackDir, filename),
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

      console.log('✅ [DATABASE] Index créés avec succès');
    } catch (error) {
      console.error('❌ [DATABASE] Erreur création index:', error);
    }
  }

  /**
   * ✅ INCHANGÉ : Méthode getStore existante
   */
  getStore(entity) {
    if (!this.stores[entity]) {
      console.warn(`⚠️ [DATABASE] Store ${entity} non trouvé`);
      return null;
    }
    return this.stores[entity];
  }

  /**
   * ✅ NOUVEAU : Méthode pour attendre l'initialisation complète
   */
  async waitForInitialization() {
    while (!this.initialized) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return true;
  }

  /**
   * ✅ NOUVEAU : Diagnostic des bases de données
   */
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

  /**
   * ✅ NOUVEAU : Méthode pour obtenir les chemins des fichiers DB
   */
  getDatabasePaths() {
    const paths = {};
    this.entities.forEach((entity) => {
      paths[entity] = path.join(this.dataDir, `${entity}.db`);
    });
    return paths;
  }
}

// ✅ MODIFIÉ : Export avec gestion d'initialisation
const database = new Database();

// Export des stores (compatible avec l'existant)
module.exports = database.stores;

// ✅ NOUVEAU : Export additionnel pour accès à l'instance
module.exports.database = database;
module.exports.waitForInitialization = () => database.waitForInitialization();
module.exports.diagnose = () => database.diagnose();
module.exports.getDatabasePaths = () => database.getDatabasePaths();
