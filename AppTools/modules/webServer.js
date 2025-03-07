// modules/webServer.js
const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const bonjour = require('bonjour')();

let frontendService = null;
// Stocker les URLs d'accès globalement
let cachedAccessUrls = [];

// Récupérer les adresses IP locales
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const ifaceName in interfaces) {
    for (const iface of interfaces[ifaceName]) {
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
    mainWindow.webContents.send('web-server-urls', cachedAccessUrls);
  }
}

// Initialiser le serveur web Express
function initWebServer(app, environment, mainWindow) {
  const webPort = process.env.WEB_PORT || 8080;
  const apiPort = process.env.PORT || 3000;
  const expressApp = express();

  expressApp.use(cors({ origin: true, credentials: true }));
  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: false }));

  const apiIp = getLocalIpAddresses()[0] || 'localhost';
  const apiUrl = `http://${apiIp}:${apiPort}`;

  expressApp.use('/api', createProxyMiddleware({ target: apiUrl, changeOrigin: true }));

  const distPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'dist')
    : path.join(process.cwd(), 'dist');

  expressApp.use(express.static(distPath));
  expressApp.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

  const server = http.createServer(expressApp);
  server.listen(webPort, () => {
    const ipAddresses = getLocalIpAddresses();
    cachedAccessUrls = ipAddresses.map((ip) => `http://${ip}:${webPort}`);

    // ✅ Publier le frontend via mDNS
    frontendService = bonjour.publish({
      name: 'AppPOS-Frontend',
      type: 'http',
      port: webPort,
      txt: { version: app.getVersion(), type: 'frontend' },
    });

    console.log(
      `✅ Frontend publié via mDNS : AppPOS-Frontend.local (http) sur le port ${webPort}`
    );

    sendUrlsToWindow(mainWindow);
  });

  server.on('error', (error) => {
    console.error('Erreur du serveur web:', error);
  });

  return server;
}

// Méthode pour récupérer les URLs actuelles
function getAccessUrls() {
  return cachedAccessUrls;
}

// ✅ Nettoyer proprement à la fermeture de l'application
function stopWebServer() {
  if (frontendService) {
    frontendService.stop();
    frontendService = null;
  }
  bonjour.destroy();
}

module.exports = {
  initWebServer,
  getLocalIpAddresses,
  sendUrlsToWindow,
  getAccessUrls,
  stopWebServer,
};
