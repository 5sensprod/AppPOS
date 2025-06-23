// main.js - AVEC DÉMARRAGE OPTIMISÉ ET AUTHENTIFICATION (CORRIGÉ)
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const bonjour = require('bonjour')();

// ✅ NOUVEAU : Forcer les variables d'environnement en production
const isPackaged = app.isPackaged;
if (isPackaged) {
  process.env.NODE_ENV = 'production';
  process.env.ELECTRON_ENV = 'true';
  console.log('🔧 [MAIN] Variables forcées pour production packagée');
}

console.log(`📦 [MAIN] isPackaged: ${isPackaged}`);
console.log(`🔧 [MAIN] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔧 [MAIN] ELECTRON_ENV: ${process.env.ELECTRON_ENV}`);

// Importation des modules refactorisés
const logger = require(path.join(__dirname, 'modules/logger'));
const environment = require(path.join(__dirname, 'modules/environment'));
const apiServer = require(path.join(__dirname, 'modules/apiServer'));
const updater = require(path.join(__dirname, 'modules/updater'));
const webServer = require(path.join(__dirname, 'modules/webServer'));
const { setupWebCaptureListener } = require(path.join(__dirname, 'modules', 'webCaptureHandler'));

// Variables globales
let mainWindow;
let apiProcess = null;
let webServerInstance = null;

// ✅ NOUVEAU : Variables pour gérer l'authentification
let isUserAuthenticated = false;
let updateCheckTimer = null;

// Initialisation des logs
logger.setupFileLogging(app);
logger.setupLogs(log, autoUpdater);

// Initialisation de l'autoUpdater
updater.initUpdater(autoUpdater);

// Vérification de l'environnement au démarrage
environment.checkEnvironment(app);

// Charger les variables d'environnement
environment.loadEnvVariables(app);

// ✅ NOUVEAU : Fonction pour démarrer/arrêter la vérification automatique des mises à jour
function scheduleUpdateCheck() {
  if (!app.isPackaged || !isUserAuthenticated) {
    console.log(
      '🔒 [UPDATER] Vérification des mises à jour différée - utilisateur non authentifié'
    );
    return;
  }

  console.log('⏰ [UPDATER] Programmation de la vérification des mises à jour...');

  // Vérifier immédiatement
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('Erreur lors de la vérification des mises à jour:', err);
    });
  }, 3000);

  // Programmer des vérifications périodiques (toutes les 2 heures)
  updateCheckTimer = setInterval(
    () => {
      if (isUserAuthenticated) {
        console.log('🔄 [UPDATER] Vérification périodique des mises à jour...');
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
          console.error('Erreur lors de la vérification périodique des mises à jour:', err);
        });
      }
    },
    2 * 60 * 60 * 1000
  ); // 2 heures
}

function stopUpdateCheck() {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
    console.log('⏹️ [UPDATER] Vérification automatique des mises à jour arrêtée');
  }
}

// ✅ NOUVEAU : Fonction pour vérifier si le serveur API est prêt
async function waitForApiServer(maxWaitTime = 10000) {
  const startTime = Date.now();
  const checkInterval = 500; // Vérifier toutes les 500ms

  console.log('🔍 [MAIN] Vérification de la disponibilité du serveur API...');

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const axios = require('axios');
      await axios.get('http://localhost:3000/test', { timeout: 1000 });
      const elapsed = Date.now() - startTime;
      console.log(`✅ [MAIN] Serveur API prêt en ${elapsed}ms`);
      return true;
    } catch (error) {
      // Serveur pas encore prêt, attendre
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }
  }

  console.warn('⚠️ [MAIN] Timeout - Serveur API non disponible après 10s');
  return false;
}

// ✅ NOUVEAU : Démarrage avec splash screen
function createSplashWindow() {
  console.log('🚀 [MAIN] Création de la fenêtre splash...');

  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Créer un splash HTML simple
  const splashHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            text-align: center;
          }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
          .spinner { 
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top: 3px solid white;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .status { font-size: 14px; opacity: 0.8; }
        </style>
      </head>
      <body>
        <div class="logo">AppPOS by 5SENSPROD</div>
        <div class="spinner"></div>
        <div class="status">Démarrage du serveur...</div>
      </body>
    </html>
  `;

  splash.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));
  return splash;
}

// ✅ NOUVEAU : Gestionnaires IPC pour l'authentification
ipcMain.handle('user-authenticated', (event, userData) => {
  console.log('🔓 [AUTH] Utilisateur authentifié:', userData?.username || 'utilisateur');
  isUserAuthenticated = true;

  // Démarrer la vérification des mises à jour maintenant que l'utilisateur est connecté
  scheduleUpdateCheck();

  return { success: true };
});

ipcMain.handle('user-logout', () => {
  console.log('🔒 [AUTH] Utilisateur déconnecté');
  isUserAuthenticated = false;

  // Arrêter la vérification automatique des mises à jour
  stopUpdateCheck();

  return { success: true };
});

// ✅ NOUVEAU : Vérifier le statut d'authentification depuis le renderer
ipcMain.handle('get-auth-status', () => {
  return { isAuthenticated: isUserAuthenticated };
});

ipcMain.handle('discover-api-server', () => {
  return new Promise((resolve, reject) => {
    const browser = bonjour.find({ type: 'http' });

    const timeout = setTimeout(() => {
      browser.stop();
      reject(new Error('Service AppPOS-API non trouvé via mDNS'));
    }, 5000);

    browser.on('up', (service) => {
      if (service.name === 'AppPOS-API') {
        const host = service.addresses.find((addr) => addr.includes('.')) || 'localhost';
        const port = service.port;
        clearTimeout(timeout);
        browser.stop();
        resolve({ ip: host, port, url: `http://${host}:${port}` });
      }
    });
  });
});

ipcMain.handle('get-mdns-services', () => {
  return new Promise((resolve) => {
    const browser = bonjour.find({ type: 'http' });
    const servicesFound = [];

    browser.on('up', (service) => {
      servicesFound.push({
        name: service.name,
        host: service.host,
        port: service.port,
        addresses: service.addresses,
        url: `http://${service.host}:${service.port}`,
      });
    });

    setTimeout(() => {
      browser.stop();
      resolve(servicesFound);
    }, 3000);
  });
});

// Fonction pour créer la fenêtre principale
function createWindow() {
  console.log('Création de la fenêtre principale...');
  const appVersion = app.getVersion();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // ✅ NOUVEAU : Ne pas afficher immédiatement
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
    },
  });

  // Maximiser la fenêtre au démarrage
  mainWindow.maximize();

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

  // ✅ NOUVEAU : Afficher la fenêtre seulement quand elle est prête
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ [MAIN] Fenêtre principale affichée');
  });

  // Ouvrir les DevTools en mode développement
  if (environment.isDevMode) {
    mainWindow.webContents.openDevTools();
  }

  // Événement de fermeture
  mainWindow.on('closed', function () {
    mainWindow = null;
    // Arrêter la vérification des mises à jour si la fenêtre se ferme
    stopUpdateCheck();
  });

  console.log('Fenêtre principale créée avec succès!');

  // Une fois la fenêtre créée, configurer les événements de mise à jour
  updater.setupUpdateEvents(autoUpdater, mainWindow, dialog);

  // ✅ MODIFIÉ : Ne pas vérifier les mises à jour automatiquement au démarrage
  // La vérification se fera seulement après authentification
  console.log("🔒 [UPDATER] Vérification des mises à jour en attente d'authentification");

  // Démarrer le serveur web si mainWindow est prêt
  mainWindow.webContents.on('did-finish-load', () => {
    if (!webServerInstance) {
      webServerInstance = webServer.initWebServer(app, environment, mainWindow);
    } else {
      webServer.sendUrlsToWindow(mainWindow);
    }
  });
}

// Configurer les écouteurs IPC
ipcMain.on('check-for-updates', () => {
  console.log('Demande de vérification manuelle des mises à jour');

  // ✅ NOUVEAU : Vérifier l'authentification avant de permettre la vérification manuelle
  if (!isUserAuthenticated) {
    console.log('🔒 [UPDATER] Vérification refusée - utilisateur non authentifié');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-message', {
        message: 'Authentification requise pour vérifier les mises à jour',
        error: 'NON_AUTHENTIFIE',
      });
    }
    return;
  }

  if (mainWindow) {
    updater.checkForUpdates(autoUpdater);
  } else {
    console.error('Impossible de vérifier les mises à jour: fenêtre principale non disponible');
  }
});

ipcMain.on('request-network-urls', () => {
  console.log('Demande des URLs réseau reçue');
  if (mainWindow && webServerInstance) {
    webServer.sendUrlsToWindow(mainWindow);
  }
});

setupWebCaptureListener(ipcMain);

// ✅ NOUVEAU : Démarrage optimisé avec splash
app.whenReady().then(async () => {
  console.log('🚀 [MAIN] Electron est prêt!');

  let splash = null;

  // Démarrer le serveur API si nécessaire
  apiProcess = apiServer.startAPIServer(app, environment);

  if (!apiProcess) {
    // API externe ou pas besoin → Fenêtre immédiate
    console.log('📱 [MAIN] API externe - fenêtre immédiate');
    createWindow();
  } else {
    // API interne → Splash + attente intelligente
    console.log('⏳ [MAIN] API interne - démarrage avec splash');

    splash = createSplashWindow();

    // Attendre que le serveur soit prêt (max 10s)
    const apiReady = await waitForApiServer(10000);

    if (apiReady) {
      console.log('✅ [MAIN] API prête - création fenêtre principale');
    } else {
      console.log('⚠️ [MAIN] API non prête - création fenêtre quand même');
    }

    // Créer la fenêtre principale
    createWindow();

    // Fermer le splash après un petit délai
    setTimeout(() => {
      if (splash && !splash.isDestroyed()) {
        splash.close();
      }
    }, 1000);
  }

  app.on('activate', function () {
    if (mainWindow === null) createWindow();
  });
});

// Quitter quand toutes les fenêtres sont fermées, sauf sur macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Lors de la fermeture de l'application, terminer les processus
app.on('before-quit', () => {
  console.log("🚪 [ELECTRON] Fermeture de l'application...");

  // Arrêter la vérification des mises à jour
  stopUpdateCheck();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-closing');
  }

  if (webServerInstance && webServer.stopWebServer) {
    webServer.stopWebServer();
  }

  if (apiProcess) {
    apiProcess.kill();
  }
});

console.log("Initialisation d'Electron terminée.");
