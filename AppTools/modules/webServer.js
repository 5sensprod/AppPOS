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

  // Middleware de base avec configuration CORS permissive
  expressApp.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: false }));

  // Obtenir l'adresse IP locale à utiliser pour l'API
  const localIps = getLocalIpAddresses();
  const apiIp = localIps.length > 0 ? localIps[0] : 'localhost';
  const apiUrl = `http://${apiIp}:${apiPort}`;

  console.log(`Configurant le proxy API vers: ${apiUrl}`);

  // Configuration du proxy API avec la vraie IP au lieu de localhost
  expressApp.use(
    '/api',
    createProxyMiddleware({
      target: apiUrl,
      changeOrigin: true,
      pathRewrite: { '^/api': '/api' },
      logLevel: 'debug',
      // Ces options sont importantes pour le CORS
      onProxyRes: (proxyRes, req, res) => {
        // Assurez-vous que les headers CORS sont correctement transmis
        // En répondant à l'origine exacte qui a fait la requête
        const origin = req.headers.origin || '*';
        proxyRes.headers['Access-Control-Allow-Origin'] = origin;
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';

        // Log pour debug
        console.log(
          `Proxy: ${req.method} ${req.url} -> ${apiUrl}${req.url.replace(/^\/api/, '/api')}`
        );
      },
    })
  );

  // Ajouter un gestionnaire explicite pour les requêtes OPTIONS pre-flight
  expressApp.options('/api/*', (req, res) => {
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(204).end();
  });

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
    console.log(`Proxy API configuré vers ${apiUrl}`);
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
