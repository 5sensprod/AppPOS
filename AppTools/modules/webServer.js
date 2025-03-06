// modules/webServer.js
const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Stocker les URLs d'accès globalement
let cachedAccessUrls = [];

// Récupérer les adresses IP locales
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const ifaceName in interfaces) {
    for (const iface of interfaces[ifaceName]) {
      // Filtrer les adresses IPv4 internes
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  return addresses;
}

// Envoyer les URLs à la fenêtre principale
function sendUrlsToWindow(mainWindow) {
  if (mainWindow && cachedAccessUrls.length > 0) {
    console.log('Envoi des URLs au renderer:', cachedAccessUrls);
    try {
      mainWindow.webContents.send('web-server-urls', cachedAccessUrls);
    } catch (error) {
      console.error("Erreur lors de l'envoi des URLs:", error);
    }
  }
}

// Initialiser le serveur web Express
function initWebServer(app, environment, mainWindow) {
  const webPort = process.env.WEB_PORT || 8080;
  const apiPort = process.env.PORT || 3000;
  const expressApp = express();

  // Middleware de base
  expressApp.use(cors());
  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: false }));

  // Configuration du proxy API
  expressApp.use(
    '/api',
    createProxyMiddleware({
      target: `http://localhost:${apiPort}`,
      changeOrigin: true,
      pathRewrite: { '^/api': '/api' },
      logLevel: 'debug',
    })
  );

  // Servir les fichiers statiques
  const distPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'dist')
    : path.join(process.cwd(), 'dist');

  console.log(`Serving static files from: ${distPath}`);
  expressApp.use(express.static(distPath));

  // Route principale - servir l'application
  expressApp.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Démarrer le serveur
  const server = http.createServer(expressApp);

  server.listen(webPort, () => {
    const ipAddresses = getLocalIpAddresses();
    cachedAccessUrls = ipAddresses.map((ip) => `http://${ip}:${webPort}`);

    console.log(`Serveur web démarré sur le port ${webPort}`);
    console.log(`Proxy API configuré vers http://localhost:${apiPort}`);
    console.log('Application accessible aux URLs:', cachedAccessUrls);

    // Envoyer les URLs tout de suite
    sendUrlsToWindow(mainWindow);
  });

  // Gérer les erreurs du serveur
  server.on('error', (error) => {
    console.error('Erreur du serveur web:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Le port ${webPort} est déjà utilisé.`);
    }
  });

  return server;
}

// Méthode pour récupérer les URLs actuelles
function getAccessUrls() {
  return cachedAccessUrls;
}

module.exports = {
  initWebServer,
  getLocalIpAddresses,
  sendUrlsToWindow,
  getAccessUrls,
};
