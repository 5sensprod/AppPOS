// src/factories/createWebSocketRedirection.js
/**
 * Crée une fonction de redirection pour les anciens écouteurs WebSocket
 * vers les nouveaux stores WebSocket centralisés
 *
 * @param {string} entityName - Nom de l'entité ('product', 'supplier', etc.)
 * @param {Function} dataStoreHook - Le hook Zustand du store WebSocket centralisé
 * @param {Object} [options] - Options supplémentaires
 * @param {boolean} [options.debug=false] - Activer les logs de debug
 * @param {Function} [options.onInit] - Callback à appeler après initialisation
 * @returns {Function} - Fonction de redirection qui initialise et nettoie les écouteurs WebSocket
 */
export function createWebSocketRedirection(entityName, dataStoreHook, options = {}) {
  const { debug = false, onInit = null } = options;
  return () => {
    const dataStore = dataStoreHook.getState();
    dataStore.initWebSocket();
    if (onInit && typeof onInit === 'function') {
      onInit(dataStore);
    }
    // Retourner la fonction de nettoyage
    return () => {
      dataStore.cleanup();
    };
  };
}

/**
 * Version améliorée qui charge automatiquement les données au moment de l'initialisation
 *
 * @param {string} entityName - Nom de l'entité ('product', 'supplier', etc.)
 * @param {Function} dataStoreHook - Le hook Zustand du store WebSocket centralisé
 * @param {string} [fetchMethod] - Nom de la méthode à appeler pour charger les données
 * @returns {Function} - Fonction de redirection avec chargement automatique des données
 */
export function createWebSocketRedirectionWithFetch(entityName, dataStoreHook, fetchMethod) {
  const methodName = fetchMethod || 'fetchData';
  return () => {
    const dataStore = dataStoreHook.getState();
    dataStore.initWebSocket();
    // Charger les données si la méthode existe
    if (dataStore[methodName] && typeof dataStore[methodName] === 'function') {
      dataStore[methodName]().catch(() => {
        // Erreur silencieuse
      });
    }
    return dataStore.cleanup;
  };
}
