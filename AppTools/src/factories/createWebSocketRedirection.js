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
  const entityUpperCase = entityName.toUpperCase();
  const storeName = dataStoreHook.name || 'dataStore';

  return () => {
    if (debug) {
      console.log(`[${entityUpperCase}] Redirection vers ${storeName}.initWebSocket()`);
    }

    const dataStore = dataStoreHook.getState();
    dataStore.initWebSocket();

    if (onInit && typeof onInit === 'function') {
      onInit(dataStore);
    }

    // Retourner la fonction de nettoyage
    return () => {
      if (debug) {
        console.log(`[${entityUpperCase}] Nettoyage des écouteurs WebSocket`);
      }
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
  const entityUpperCase = entityName.toUpperCase();
  const methodName = fetchMethod || 'fetchData';

  return () => {
    console.log(`[${entityUpperCase}] Redirection avec chargement automatique`);

    const dataStore = dataStoreHook.getState();
    dataStore.initWebSocket();

    // Charger les données si la méthode existe
    if (dataStore[methodName] && typeof dataStore[methodName] === 'function') {
      console.log(`[${entityUpperCase}] Chargement initial des données via ${methodName}`);
      dataStore[methodName]().catch((err) => {
        console.error(`[${entityUpperCase}] Erreur lors du chargement initial:`, err);
      });
    }

    return dataStore.cleanup;
  };
}
