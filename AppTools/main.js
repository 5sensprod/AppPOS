// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Importation des modules refactorisés
const logger = require('./modules/logger');
const environment = require('./modules/environment');
const apiServer = require('./modules/apiServer');
const updater = require('./modules/updater');

// Configuration des logs
logger.setupLogs(log, autoUpdater);

// Variables globales
let mainWindow;
let apiProcess = null;

// Vérification de l'environnement au démarrage
environment.checkEnvironment(app);

// Charger les variables d'environnement
environment.loadEnvVariables(app);

// Fonction pour créer la fenêtre principale
function createWindow() {
  console.log('Création de la fenêtre principale...');
  const appVersion = app.getVersion();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
    },
  });

  // Empêcher la page HTML de remplacer le titre
  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  // Définir le titre avec la version
  mainWindow.setTitle(`AppPOS - Système de Point de Vente - v${appVersion}`);

  // Déterminer l'URL à charger
  const url = environment.getAppUrl(__dirname);
  console.log(`Chargement de l'URL: ${url}`);
  mainWindow.loadURL(url);

  // Ouvrir les DevTools en mode développement
  if (environment.isDevMode) {
    mainWindow.webContents.openDevTools();
  }

  // Événement de fermeture
  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  console.log('Fenêtre principale créée avec succès!');

  // Vérifier les mises à jour si en production
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
}

// Configurer les événements de mise à jour
updater.setupUpdateEvents(autoUpdater, mainWindow, dialog);

// Configurer les écouteurs IPC
ipcMain.on('check-for-updates', () => {
  console.log('Vérification des mises à jour...');
  autoUpdater.checkForUpdates();
});

// Créer la fenêtre quand l'app est prête
app.whenReady().then(() => {
  console.log('Electron est prêt!');

  // Démarrer le serveur API si nécessaire
  apiProcess = apiServer.startAPIServer(app, environment);

  // Si l'API est gérée en externe ou n'a pas besoin d'être démarrée, créer la fenêtre immédiatement
  if (!apiProcess) {
    createWindow();
  } else {
    // Attendre pour que l'API démarre
    setTimeout(createWindow, 5000);
  }

  app.on('activate', function () {
    // Sur macOS, recréer la fenêtre quand l'icône du dock est cliquée
    if (mainWindow === null) createWindow();
  });
});

// Quitter quand toutes les fenêtres sont fermées, sauf sur macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Lors de la fermeture de l'application, terminer le processus API
app.on('before-quit', () => {
  console.log('Arrêt du serveur API...');
  if (apiProcess) {
    apiProcess.kill();
  }
});

console.log("Initialisation d'Electron terminée.");
