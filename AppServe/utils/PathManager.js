// utils/PathManager.js - Version conditionnelle complète
const path = require('path');
const os = require('os');
const fs = require('fs');

class PathManager {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isElectronApp = !!process.env.ELECTRON_ENV || !!process.versions.electron;
    // Utiliser AppData SEULEMENT en production ET dans l'app Electron packagée
    this.useAppData = this.isProduction && this.isElectronApp;
    this.initialized = false;
    this.setupPaths();
  }

  setupPaths() {
    if (this.useAppData) {
      // Production : Chemins AppData
      this.basePath = path.join(os.homedir(), 'AppData', 'Roaming', 'AppPOS');
    } else {
      // Développement : Chemins actuels
      this.basePath = process.cwd();
    }

    this.paths = {
      data: this.useAppData ? path.join(this.basePath, 'data') : path.join(this.basePath, 'data'),
      public: this.useAppData
        ? path.join(this.basePath, 'public')
        : path.join(this.basePath, 'public'),
      config: this.useAppData
        ? path.join(this.basePath, 'config')
        : path.join(this.basePath, 'config'),
    };
  }

  async initialize() {
    if (this.initialized) return;

    console.log(`🔧 [PATH] Mode: ${this.useAppData ? 'AppData' : 'Local'}`);
    console.log(`📁 [PATH] Base: ${this.basePath}`);

    if (this.useAppData) {
      this.ensureDirectories();
    }

    this.initialized = true;
  }

  ensureDirectories() {
    Object.values(this.paths).forEach((dirPath) => {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 [PATH] Créé: ${dirPath}`);
      }
    });
  }

  getDataPath(subPath = '') {
    return subPath ? path.join(this.paths.data, subPath) : this.paths.data;
  }

  getPublicPath(subPath = '') {
    return subPath ? path.join(this.paths.public, subPath) : this.paths.public;
  }

  getConfigPath(subPath = '') {
    return subPath ? path.join(this.paths.config, subPath) : this.paths.config;
  }

  getDatabasePath(dbName) {
    return this.getDataPath(dbName);
  }
}

const pathManager = new PathManager();
module.exports = pathManager;
