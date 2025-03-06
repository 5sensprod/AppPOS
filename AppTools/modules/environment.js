// modules/environment.js
const path = require('path');
const fs = require('fs');

// Variables d'environnement
const isDev = process.env.NODE_ENV === 'development';
const isDevMode = isDev || process.env.ELECTRON_IS_DEV === '1';
const isApiExternallyManaged = process.env.API_EXTERNALLY_MANAGED === '1';

// Vérifier l'environnement de l'application
function checkEnvironment(app) {
  console.log("=== Informations de l'environnement ===");
  console.log(`Electron version: ${process.versions.electron}`);
  console.log(`Node.js version: ${process.versions.node}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Plateforme: ${process.platform}`);
  console.log(`Répertoire app: ${app.getAppPath()}`);
  console.log(`Répertoire userData: ${app.getPath('userData')}`);
  console.log(`Répertoire home: ${app.getPath('home')}`);
  console.log(`Application packagée: ${app.isPackaged}`);
  console.log(`Répertoire resources: ${process.resourcesPath}`);

  // Vérifier les dossiers critiques
  if (app.isPackaged) {
    const appServePath = path.join(process.resourcesPath, 'AppServe');
    console.log(`AppServe path existe: ${fs.existsSync(appServePath)}`);

    const nodeModulesPath = path.join(appServePath, 'node_modules');
    console.log(`node_modules path existe: ${fs.existsSync(nodeModulesPath)}`);

    const serverJsPath = path.join(appServePath, 'server.js');
    console.log(`server.js path existe: ${fs.existsSync(serverJsPath)}`);

    const envPath = path.join(appServePath, '.env');
    console.log(`Fichier .env existe: ${fs.existsSync(envPath)}`);
  }

  console.log('===============================');
}

// Obtenir le chemin de base pour AppServe
function getAppServePath(app) {
  if (app.isPackaged) {
    // En production, le chemin est relatif au dossier resources
    return path.join(process.resourcesPath, 'AppServe');
  } else {
    // En développement
    return path.join(__dirname, '..', 'AppServe');
  }
}

// Charger les variables d'environnement
function loadEnvVariables(app) {
  if (process.env.NODE_ENV !== 'development') {
    try {
      const dotenv = require('dotenv');
      let dotenvPath;

      // Détermine le chemin en fonction de l'environnement
      if (app.isPackaged) {
        // En production, dans un package Electron
        dotenvPath = path.join(process.resourcesPath, 'AppServe', '.env');
      } else {
        // En développement
        dotenvPath = path.join(__dirname, '..', 'AppServe', '.env');
      }

      console.log("Tentative de chargement des variables d'environnement depuis:", dotenvPath);
      if (fs.existsSync(dotenvPath)) {
        dotenv.config({ path: dotenvPath });
        console.log("Variables d'environnement chargées avec succès");
      } else {
        console.error(`Fichier .env non trouvé à ${dotenvPath}`);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des variables d'environnement:", error);
    }
  }
}

// Déterminer l'URL de l'application
function getAppUrl(dirname) {
  let url;
  if (isDevMode) {
    url = 'http://localhost:5173';
    console.log('Mode développement, chargement depuis:', url);
  } else {
    const distPath = path.join(dirname, 'dist', 'index.html');
    console.log('Mode production, vérification du chemin:', distPath);
    console.log('Ce fichier existe-t-il?', fs.existsSync(distPath));
    url = `file://${distPath}`;
  }
  return url;
}

module.exports = {
  isDev,
  isDevMode,
  isApiExternallyManaged,
  checkEnvironment,
  getAppServePath,
  loadEnvVariables,
  getAppUrl,
};
