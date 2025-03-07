// utils/network.js
const os = require('os');
const net = require('net');

// Import de la bibliothèque bonjour standard
let bonjour = null;
let publishedServices = [];

try {
  bonjour = require('bonjour')();
  console.log('Bonjour initialisé avec succès');
} catch (err) {
  console.error("Erreur lors de l'initialisation de Bonjour:", err);
}

/**
 * Récupère l'adresse IP locale (IPv4) de la machine
 */
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];
    for (const network of networkInterface) {
      if (network.family === 'IPv4' && !network.internal) {
        return network.address;
      }
    }
  }
  return 'Adresse IP non trouvée';
}

/**
 * Vérifie si un port est disponible
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

/**
 * Trouve un port disponible
 */
async function findAvailablePort(startPort, maxPort = startPort + 50) {
  let currentPort = startPort;
  while (currentPort <= maxPort) {
    if (await isPortAvailable(currentPort)) {
      return currentPort;
    }
    currentPort++;
  }
  throw new Error(`Aucun port disponible trouvé entre ${startPort} et ${maxPort}`);
}

/**
 * Publie un service mDNS
 */
function publishService(name, type, port, metadata = {}) {
  if (!bonjour) {
    console.warn('Publication mDNS impossible: service Bonjour non disponible');
    return null;
  }

  try {
    const service = bonjour.publish({
      name: name,
      type: type,
      port: port,
      txt: metadata,
    });

    publishedServices.push(service);
    console.log(`Service mDNS publié: ${name}.local (${type}) sur le port ${port}`);
    return service;
  } catch (err) {
    console.error(`Erreur lors de la publication du service mDNS:`, err);
    return null;
  }
}

/**
 * Nettoie les services mDNS
 */
function cleanupMdnsServices() {
  if (publishedServices.length > 0) {
    publishedServices.forEach((service) => {
      try {
        if (service && service.stop) {
          service.stop();
        }
      } catch (err) {
        console.error(`Erreur lors de l'arrêt du service:`, err);
      }
    });
    publishedServices = [];
  }

  if (bonjour) {
    try {
      bonjour.destroy();
    } catch (err) {
      console.error(`Erreur lors de la destruction de Bonjour:`, err);
    }
    bonjour = null;
  }
}

module.exports = {
  getLocalIpAddress,
  isPortAvailable,
  findAvailablePort,
  publishService,
  cleanupMdnsServices,
};
