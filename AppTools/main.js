// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configuration des logs détaillés
log.transports.file.level = 'debug';
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'debug';
console.log('Fichier de log autoUpdater:', log.transports.file.getFile().path);

// Configuration de l'auto-updater
autoUpdater.setFeedURL({
  provider: 'github',
  repo: 'AppPOS',
  owner: '5sensprod',
  private: false,
});

// Options supplémentaires
autoUpdater.allowPrerelease = false;
autoUpdater.autoDownload = false;

// Vérifier l'environnement au démarrage
function checkEnvironment() {
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

// Appeler cette fonction au début
checkEnvironment();

// Charger les variables d'environnement en production
if (process.env.NODE_ENV !== 'development') {
  try {
    const dotenv = require('dotenv');
    let dotenvPath;

    // Détermine le chemin en fonction de l'environnement (développement ou production)
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

// Gardez une référence globale de l'objet window
let mainWindow;
let apiProcess = null;
console.log("Démarrage d'Electron...");
console.log('Répertoire actuel:', __dirname);

// Vérifie si nous sommes en mode développement
const isDev = process.env.NODE_ENV === 'development';
const isDevMode = isDev || process.env.ELECTRON_IS_DEV === '1';
const isApiExternallyManaged = process.env.API_EXTERNALLY_MANAGED === '1';

// En production, définir le chemin de base pour AppServe selon la plateforme
function getAppServePath() {
  if (app.isPackaged) {
    // En production, le chemin est relatif au dossier resources
    return path.join(process.resourcesPath, 'AppServe');
  } else {
    // En développement
    return path.join(__dirname, '..', 'AppServe');
  }
}

// Créez un fichier de log pour capturer les erreurs
const logPath = path.join(app.getPath('userData'), 'app.log');
console.log(`Les logs seront écrits dans: ${logPath}`);

// Rediriger la console vers un fichier
const logStream = fs.createWriteStream(logPath, { flags: 'a' });
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function (...args) {
  const message = args
    .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
    .join(' ');
  logStream.write(`[LOG ${new Date().toISOString()}] ${message}\n`);
  originalConsoleLog.apply(console, args);
};

console.error = function (...args) {
  const message = args
    .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
    .join(' ');
  logStream.write(`[ERROR ${new Date().toISOString()}] ${message}\n`);
  originalConsoleError.apply(console, args);
};

// Au début de la fonction startAPIServer
function startAPIServer() {
  console.log(`Chemin d'application: ${app.getAppPath()}`);
  console.log(`Chemin des resources: ${process.resourcesPath}`);
  console.log(`Environnement NODE_ENV: ${process.env.NODE_ENV}`);
  // Ne pas démarrer l'API si elle est gérée en externe
  if (isDevMode && isApiExternallyManaged) {
    console.log('Mode développement: le serveur API est géré en externe');
    return null;
  }

  console.log('Démarrage du serveur API...');
  // Obtenir le chemin vers AppServe selon l'environnement
  const appServePath = getAppServePath();
  console.log('Vérification des modules dans:', appServePath);

  // Vérifiez si les modules essentiels existent
  const criticalModules = ['express', 'dotenv', 'cors']; // ajoutez vos modules critiques
  for (const module of criticalModules) {
    const modulePath = path.join(appServePath, 'node_modules', module);
    console.log(`Module ${module} existe: ${fs.existsSync(modulePath)}`);
  }

  const serverPath = path.join(appServePath, 'server.js');

  console.log('Chemin du serveur API:', serverPath);
  // Vérifier si le fichier existe
  if (!fs.existsSync(serverPath)) {
    console.error(`Erreur: Le fichier ${serverPath} n'existe pas!`);
    return null;
  }

  // Définir les variables d'environnement pour le serveur
  const serverEnv = {
    ...process.env,
    NODE_ENV: isDevMode ? 'development' : 'production',
    PORT: process.env.PORT || '3000',
    WC_URL: process.env.WC_URL,
    WC_CONSUMER_KEY: process.env.WC_CONSUMER_KEY,
    WC_CONSUMER_SECRET: process.env.WC_CONSUMER_SECRET,
  };

  console.log("Démarrage du serveur API avec les variables d'environnement:", {
    NODE_ENV: serverEnv.NODE_ENV,
    PORT: serverEnv.PORT,
  });

  // Lancer le processus du serveur API
  const apiProc = spawn('node', [serverPath], {
    stdio: 'pipe',
    env: serverEnv,
    cwd: appServePath, // Important: définir le répertoire de travail pour que les chemins relatifs fonctionnent
  });

  // Gérer les logs standard
  apiProc.stdout.on('data', (data) => {
    console.log(`API: ${data.toString().trim()}`);
  });

  // Gérer les logs d'erreur
  apiProc.stderr.on('data', (data) => {
    console.error(`API Error: ${data.toString().trim()}`);
  });

  // Gérer la fermeture du processus
  apiProc.on('close', (code) => {
    console.log(`Processus API fermé avec code: ${code}`);
    apiProcess = null;
  });

  return apiProc;
}

function createWindow() {
  console.log('Création de la fenêtre principale...');
  // Créer la fenêtre du navigateur
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Changez à false pour la sécurité
      contextIsolation: true, // Changez à true pour utiliser contextBridge
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
    },
  });

  // Définir l'URL à charger en fonction de l'environnement
  let url;
  if (isDevMode) {
    url = 'http://localhost:5173';
    console.log('Mode développement, chargement depuis:', url);
  } else {
    const distPath = path.join(__dirname, 'dist', 'index.html');
    console.log('Mode production, vérification du chemin:', distPath);
    console.log('Ce fichier existe-t-il?', fs.existsSync(distPath));
    url = `file://${distPath}`;
  }

  console.log(`Chargement de l'URL: ${url}`);
  mainWindow.loadURL(url);

  // Ouvrir les DevTools pour le débogage
  if (isDevMode) {
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

// Configuration des événements de mise à jour
autoUpdater.on('checking-for-update', () => {
  console.log('Vérification des mises à jour...');
  if (mainWindow) {
    mainWindow.webContents.send('update-message', { message: 'Vérification des mises à jour...' });
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('Mise à jour disponible:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-message', {
      message: 'Mise à jour disponible',
      info: info,
    });

    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Mise à jour disponible',
        message: `Une nouvelle version (${info.version}) est disponible. Voulez-vous la télécharger maintenant ?`,
        buttons: ['Oui', 'Non'],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Aucune mise à jour disponible:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-message', {
      message: 'Aucune mise à jour disponible',
      info: info,
    });
  }
});

autoUpdater.on('error', (err) => {
  console.error('Erreur lors de la mise à jour:', err);
  if (mainWindow) {
    mainWindow.webContents.send('update-message', {
      message: 'Erreur lors de la mise à jour',
      error: err.toString(),
    });
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`Téléchargement: ${progressObj.percent}%`);
  if (mainWindow) {
    mainWindow.webContents.send('update-message', {
      message: 'Téléchargement en cours',
      progress: progressObj,
    });
    mainWindow.setProgressBar(progressObj.percent / 100);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Mise à jour téléchargée:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-message', {
      message: 'Mise à jour téléchargée',
      info: info,
    });
    mainWindow.setProgressBar(-1);

    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Mise à jour prête',
        message: "La mise à jour a été téléchargée. L'application redémarrera pour l'installer.",
        buttons: ['Redémarrer maintenant', 'Plus tard'],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  }
});

// IPC pour les mises à jour manuelles
ipcMain.on('check-for-updates', () => {
  console.log('Vérification des mises à jour...');
  autoUpdater.checkForUpdates();
});

// Créer la fenêtre quand l'app est prête
app.whenReady().then(() => {
  console.log('Electron est prêt!');

  // Démarrer le serveur API si nécessaire
  apiProcess = startAPIServer();

  // Si l'API est gérée en externe ou n'a pas besoin d'être démarrée, créer la fenêtre immédiatement
  // Sinon, attendre un peu pour laisser l'API démarrer
  if (!apiProcess) {
    createWindow();
  } else {
    // Attendre plus longtemps pour que l'API démarre
    setTimeout(() => {
      createWindow();
    }, 5000); // 5 secondes pour être sûr
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
