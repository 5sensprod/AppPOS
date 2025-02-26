// utils/network.js
const os = require('os');
const net = require('net');

/**
 * Récupère l'adresse IP locale (IPv4) de la machine
 * @returns {string} Adresse IP locale ou message d'erreur
 */
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();

  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];

    for (const network of networkInterface) {
      // Ignorer les adresses IPv6 et les interfaces loopback
      if (network.family === 'IPv4' && !network.internal) {
        return network.address;
      }
    }
  }

  return 'Adresse IP non trouvée';
}

/**
 * Vérifie si un port est disponible
 * @param {number} port Le port à vérifier
 * @returns {Promise<boolean>} True si le port est disponible, false sinon
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false); // Le port n'est pas disponible
    });

    server.once('listening', () => {
      server.close();
      resolve(true); // Le port est disponible
    });

    server.listen(port);
  });
}

/**
 * Trouve un port disponible en partant d'un port de départ
 * @param {number} startPort Port de départ pour la recherche
 * @param {number} maxPort Port maximum pour la recherche (défaut: startPort + 50)
 * @returns {Promise<number>} Un port disponible
 * @throws {Error} Si aucun port n'est disponible dans la plage spécifiée
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

module.exports = {
  getLocalIpAddress,
  isPortAvailable,
  findAvailablePort,
};
