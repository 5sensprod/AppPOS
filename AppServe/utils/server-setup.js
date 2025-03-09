// utils/server-setup.js
const {
  getLocalIpAddress,
  findAvailablePort,
  publishService,
  cleanupMdnsServices,
} = require('./network');

// Service mDNS pour le serveur
let serverService = null;

/**
 * Configure et démarre le serveur Express sur un port disponible
 * @param {object} app L'application Express
 * @param {number} defaultPort Port par défaut
 * @param {boolean} enableMdns Active ou désactive la publication mDNS (défaut: true)
 * @returns {Promise<object>} L'instance du serveur
 */
async function setupServer(app, defaultPort, enableMdns = true) {
  try {
    // Trouver un port disponible
    const port = await findAvailablePort(defaultPort);

    // Démarrer le serveur
    return new Promise((resolve) => {
      const server = app.listen(port, '0.0.0.0', () => {
        const ipAddress = getLocalIpAddress();
        console.log(`Serveur démarré sur http://localhost:${port}`);
        console.log(`Serveur accessible sur le réseau à http://${ipAddress}:${port}`);

        // Publication du service mDNS si activé
        if (enableMdns) {
          try {
            const appVersion = process.env.npm_package_version || '1.0.0';

            // Publier le service API avec des métadonnées utiles
            serverService = publishService('AppPOS-API', 'http', port, {
              version: appVersion,
              path: '/api',
              type: 'api',
            });

            console.log(`Service API accessible via mDNS: AppPOS-API.local`);
          } catch (mdnsError) {
            console.warn(
              `Avertissement: Impossible de publier le service mDNS: ${mdnsError.message}`
            );
          }
        }

        // Ajouter une méthode pour arrêter proprement le serveur
        const originalClose = server.close;
        server.close = function (callback) {
          // Arrêter le service mDNS si existant
          try {
            if (serverService) {
              serverService.stop();
              serverService = null;
            }
          } catch (err) {
            console.warn(`Erreur lors de l'arrêt du service mDNS: ${err.message}`);
          }

          // Appeler la méthode close originale
          return originalClose.call(this, callback);
        };

        resolve(server);
      });
    });
  } catch (error) {
    console.error('Erreur au démarrage du serveur:', error.message);
    throw error;
  }
}

/**
 * Configure et démarre un serveur HTTP avec Express sur un port disponible
 * @param {object} server Instance du serveur HTTP
 * @param {object} app L'application Express
 * @param {number} defaultPort Port par défaut
 * @param {boolean} enableMdns Active ou désactive la publication mDNS (défaut: true)
 * @returns {Promise<object>} L'instance du serveur
 */
async function setupServerWithHttp(server, app, defaultPort, enableMdns = true) {
  try {
    // Trouver un port disponible
    const port = await findAvailablePort(defaultPort);

    // Démarrer le serveur HTTP
    return new Promise((resolve) => {
      server.listen(port, '0.0.0.0', () => {
        const ipAddress = getLocalIpAddress();
        console.log(`Serveur démarré sur http://localhost:${port}`);
        console.log(`Serveur accessible sur le réseau à http://${ipAddress}:${port}`);
        console.log(`WebSocket accessible sur ws://${ipAddress}:${port}/ws`);

        // Publication du service mDNS si activé
        if (enableMdns) {
          try {
            const appVersion = process.env.npm_package_version || '1.0.0';

            // Publier le service API avec des métadonnées utiles incluant l'endpoint WebSocket
            serverService = publishService('AppPOS-API', 'http', port, {
              version: appVersion,
              path: '/api',
              type: 'api',
              websocket: 'ws',
            });

            console.log(`Service API accessible via mDNS: AppPOS-API.local`);
          } catch (mdnsError) {
            console.warn(
              `Avertissement: Impossible de publier le service mDNS: ${mdnsError.message}`
            );
          }
        }

        // Ajouter une méthode pour arrêter proprement le serveur
        const originalClose = server.close;
        server.close = function (callback) {
          // Arrêter le service mDNS si existant
          try {
            if (serverService) {
              serverService.stop();
              serverService = null;
            }
          } catch (err) {
            console.warn(`Erreur lors de l'arrêt du service mDNS: ${err.message}`);
          }

          // Appeler la méthode close originale
          return originalClose.call(this, callback);
        };

        resolve(server);
      });
    });
  } catch (error) {
    console.error('Erreur au démarrage du serveur:', error.message);
    throw error;
  }
}

/**
 * Arrête proprement les services mDNS
 */
function shutdownServer() {
  cleanupMdnsServices();
}

module.exports = {
  setupServer,
  setupServerWithHttp,
  shutdownServer,
};
