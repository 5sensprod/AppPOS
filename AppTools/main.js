// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
// Gardez une référence globale de l'objet window
let mainWindow;
let apiProcess = null;
console.log("Démarrage d'Electron...");
console.log('Répertoire actuel:', __dirname);

// Vérifie si nous sommes en mode développement
const isDev = process.env.NODE_ENV === 'development';
const isDevMode = isDev || process.env.ELECTRON_IS_DEV === '1';
const isApiExternallyManaged = process.env.API_EXTERNALLY_MANAGED === '1';

// Fonction pour démarrer le serveur API
function startAPIServer() {
  // Ne pas démarrer l'API si elle est gérée en externe
  if (isDevMode && isApiExternallyManaged) {
    console.log('Mode développement: le serveur API est géré en externe');
    return null;
  }

  console.log('Démarrage du serveur API...');
  // Chemin vers le fichier server.js d'AppServe
  const serverPath = path.join(__dirname, '..', 'AppServe', 'server.js');
  console.log('Chemin du serveur API:', serverPath);
  // Vérifier si le fichier existe
  if (!fs.existsSync(serverPath)) {
    console.error(`Erreur: Le fichier ${serverPath} n'existe pas!`);
    return null;
  }

  // Définir les variables d'environnement spécifiques pour WooCommerce
  const serverEnv = {
    ...process.env,
    WC_URL: 'https://axemusique.shop', // Remplacez par l'URL réelle
    WC_CONSUMER_KEY: 'ck_f0757e22e7bb7365f6ea3e1ef5108af1b2634b64', // Remplacez par la clé réelle
    WC_CONSUMER_SECRET: 'cs_df7031b1d320ee93fd8677405bcd6190e8e06979', // Remplacez par le secret réel
  };

  // Lancer le processus du serveur API
  const apiProc = spawn('node', [serverPath], {
    stdio: 'pipe',
    env: serverEnv,
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
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
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

  // Ouvrir les DevTools en développement
  if (isDevMode) {
    mainWindow.webContents.openDevTools();
  }

  // Événement de fermeture
  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  console.log('Fenêtre principale créée avec succès!');
}

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
    setTimeout(() => {
      createWindow();
    }, 1000);
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
