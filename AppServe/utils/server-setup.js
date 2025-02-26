// utils/server-setup.js
const { getLocalIpAddress, findAvailablePort } = require('./network');

/**
 * Configure et démarre le serveur Express sur un port disponible
 * @param {object} app L'application Express
 * @param {number} defaultPort Port par défaut
 * @returns {Promise<void>}
 */
async function setupServer(app, defaultPort) {
  try {
    // Trouver un port disponible
    const port = await findAvailablePort(defaultPort);

    // Démarrer le serveur
    return new Promise((resolve) => {
      const server = app.listen(port, '0.0.0.0', () => {
        const ipAddress = getLocalIpAddress();
        console.log(`Serveur démarré sur http://localhost:${port}`);
        console.log(`Serveur accessible sur le réseau à http://${ipAddress}:${port}`);
        resolve(server);
      });
    });
  } catch (error) {
    console.error('Erreur au démarrage du serveur:', error.message);
    throw error;
  }
}

module.exports = {
  setupServer,
};
