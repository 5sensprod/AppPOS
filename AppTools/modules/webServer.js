// modules/webServer.js - VERSION AMÉLIORÉE
const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const bonjour = require('bonjour')();

let frontendService = null;
let cachedAccessUrls = [];

// ✅ FONCTION AMÉLIORÉE - Récupère les adresses IP locales en évitant VPN/VM
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const validAddresses = [];

  // ✅ Patterns d'interfaces à éviter (VPN, VM, etc.)
  const blacklistedPatterns = [
    /^100\./, // Plages CGNAT/VPN comme 100.127.x.x
    /^172\.16\./,
    /^172\.17\./,
    /^172\.18\./,
    /^172\.19\./, // Docker
    /^10\.0\.53\./, // Hyper-V
    /^192\.168\.56\./, // VirtualBox
    /^169\.254\./, // Link-local (APIPA)
  ];

  // ✅ Noms d'interfaces à éviter
  const blacklistedNames = [
    'VMware',
    'VirtualBox',
    'Hyper-V',
    'TAP-Windows',
    'OpenVPN',
    'Hamachi',
    'ZeroTier',
    'Tailscale',
    'WireGuard',
    'vEthernet',
    'docker',
    'br-',
    'vboxnet',
    'vmnet',
  ];

  for (const ifaceName in interfaces) {
    // ✅ Ignorer les interfaces suspectes par nom
    const isSuspiciousName = blacklistedNames.some((name) =>
      ifaceName.toLowerCase().includes(name.toLowerCase())
    );

    if (isSuspiciousName) {
      console.log(`🚫 [WEB] Interface ignorée: ${ifaceName}`);
      continue;
    }

    for (const iface of interfaces[ifaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // ✅ Vérifier si l'IP correspond à un pattern suspect
        const isSuspiciousIp = blacklistedPatterns.some((pattern) => pattern.test(iface.address));

        if (isSuspiciousIp) {
          console.log(`🚫 [WEB] IP VPN/VM ignorée: ${iface.address}`);
          continue;
        }

        console.log(`✅ [WEB] IP valide: ${iface.address} (${ifaceName})`);
        validAddresses.push({
          address: iface.address,
          interface: ifaceName,
          priority: getInterfacePriority(ifaceName),
        });
      }
    }
  }

  if (validAddresses.length === 0) {
    console.warn('⚠️ [WEB] Aucune IP valide trouvée, fallback vers localhost');
    return ['localhost'];
  }

  // ✅ Trier par priorité (ethernet > wifi > autres)
  validAddresses.sort((a, b) => b.priority - a.priority);

  const addresses = validAddresses.map((addr) => addr.address);
  console.log(`🌐 [WEB] ${addresses.length} IPs valides trouvées:`);
  addresses.forEach((addr, i) => {
    const info = validAddresses[i];
    console.log(`   ${i + 1}. ${addr} (${info.interface}) ${i === 0 ? '⭐' : ''}`);
  });

  return addresses;
}

// ✅ NOUVELLE - Fonction pour prioriser les interfaces
function getInterfacePriority(interfaceName) {
  const name = interfaceName.toLowerCase();

  // Ethernet = priorité maximale
  if (name.includes('ethernet') || name.includes('eth') || name.startsWith('en')) {
    return 100;
  }

  // WiFi = priorité haute
  if (name.includes('wi-fi') || name.includes('wifi') || name.includes('wlan')) {
    return 80;
  }

  // Autres interfaces physiques
  if (name.includes('local area connection')) {
    return 60;
  }

  // Par défaut = priorité basse
  return 10;
}

// ✅ NOUVELLE - Découvrir l'IP du serveur API via mDNS
async function discoverApiServer() {
  return new Promise((resolve) => {
    console.log('🔍 [WEB] Recherche du serveur API via mDNS...');
    const browser = bonjour.find({ type: 'http' });

    const timeout = setTimeout(() => {
      browser.stop();
      console.log('⚠️ [WEB] Timeout mDNS - utilisation IP locale par défaut');
      const localIps = getLocalIpAddresses();
      resolve(localIps[0] || 'localhost');
    }, 3000);

    browser.on('up', (service) => {
      if (service.name === 'AppPOS-API') {
        clearTimeout(timeout);
        browser.stop();

        // ✅ Prendre la première adresse IPv4 valide (éviter VPN)
        const apiIp =
          service.addresses.find(
            (addr) =>
              addr !== '127.0.0.1' &&
              addr !== 'localhost' &&
              addr.includes('.') &&
              !addr.startsWith('100.') // ✅ Éviter les IPs VPN
          ) || service.addresses[0];

        console.log(`✅ [WEB] API découverte via mDNS: ${apiIp}:${service.port}`);
        resolve(apiIp);
      }
    });
  });
}

// Envoyer les URLs à la fenêtre principale
function sendUrlsToWindow(mainWindow) {
  if (mainWindow && cachedAccessUrls.length > 0) {
    const apiPort = process.env.PORT || 3000;

    // ✅ Utiliser la première IP valide pour l'API
    const localIps = getLocalIpAddresses();
    const apiIp = localIps[0] || 'localhost';

    const urlData = {
      webUrls: cachedAccessUrls,
      apiUrl: `http://${apiIp}:${apiPort}`,
      apiIp: apiIp,
      apiPort: apiPort,
    };

    console.log('📡 [WEB] Envoi des URLs au frontend:', urlData);
    mainWindow.webContents.send('web-server-urls', urlData);
  }
}

// Initialiser le serveur web Express
async function initWebServer(app, environment, mainWindow) {
  const webPort = process.env.WEB_PORT || 8080;
  const apiPort = process.env.PORT || 3000;

  // ✅ Découvrir l'IP de l'API d'abord
  const apiIp = await discoverApiServer();
  const apiUrl = `http://${apiIp}:${apiPort}`;

  console.log(`🔗 [WEB] Configuration proxy vers API: ${apiUrl}`);

  const expressApp = express();

  // ✅ CORS plus permissif pour le réseau local
  expressApp.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: false }));

  // 🔧 PROXY MODIFIÉ AVEC GESTION D'ERREUR AUTH
  const apiProxy = createProxyMiddleware({
    target: apiUrl,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.log(`🔧 [PROXY] Erreur connexion API pour ${req.url}:`, err.code);

      if (req.url.includes('/auth/') && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND')) {
        console.log('🚪 [PROXY] Serveur API inaccessible pour route auth → 401');
        res.status(401).json({
          success: false,
          message: 'Serveur redémarré - reconnexion requise',
          code: 'SERVER_RESTARTED',
        });
        return;
      }

      res.status(503).json({
        success: false,
        message: 'Service temporairement indisponible',
        code: 'SERVICE_UNAVAILABLE',
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      if (req.url.includes('/auth/') && proxyRes.statusCode >= 500) {
        console.log(`🔧 [PROXY] Erreur ${proxyRes.statusCode} sur route auth → 401`);
        res.status(401);
      }
    },
    timeout: 5000,
  });

  expressApp.use('/api', apiProxy);

  // ✅ Route pour exposer les informations de configuration
  expressApp.get('/config', (req, res) => {
    res.json({
      apiUrl: apiUrl,
      apiIp: apiIp,
      apiPort: apiPort,
      webPort: webPort,
    });
  });

  const distPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'dist')
    : path.join(process.cwd(), 'dist');

  expressApp.use(express.static(distPath));
  expressApp.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

  const server = http.createServer(expressApp);

  return new Promise((resolve) => {
    server.listen(webPort, () => {
      const ipAddresses = getLocalIpAddresses();
      cachedAccessUrls = ipAddresses.map((ip) => `http://${ip}:${webPort}`);

      // ✅ Publier le frontend via mDNS
      frontendService = bonjour.publish({
        name: 'AppPOS-Frontend',
        type: 'http',
        port: webPort,
        txt: {
          version: app.getVersion(),
          type: 'frontend',
          apiUrl: apiUrl,
        },
      });

      console.log(`✅ Frontend publié via mDNS : AppPOS-Frontend.local sur port ${webPort}`);
      console.log(`🔗 Proxy configuré vers API: ${apiUrl}`);

      sendUrlsToWindow(mainWindow);
      resolve(server);
    });

    server.on('error', (error) => {
      console.error('Erreur du serveur web:', error);
    });
  });
}

// ✅ Fonction pour forcer la redécouverte de l'API
async function rediscoverApi(mainWindow) {
  console.log("🔄 [WEB] Redécouverte de l'API...");
  const apiIp = await discoverApiServer();
  sendUrlsToWindow(mainWindow);
  return apiIp;
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
  getLocalIpAddresses, // ✅ MÊME NOM - Fonction améliorée
  sendUrlsToWindow,
  getAccessUrls,
  stopWebServer,
  rediscoverApi, // ✅ NOUVELLE
  discoverApiServer, // ✅ NOUVELLE
};
