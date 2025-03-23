// src/factories/createWebSocketRedirection.js

/**
 * Crée une fonction de redirection pour les anciens écouteurs WebSocket
 * vers les nouveaux stores WebSocket centralisés
 *
 * @param {string} entityName - Nom de l'entité ('product', 'supplier', etc.)
 * @param {Function} dataStoreHook - Le hook Zustand du store WebSocket centralisé
 * @returns {Function} - Fonction de redirection qui initialise et nettoie les écouteurs WebSocket
 */
export function createWebSocketRedirection(entityName, dataStoreHook) {
  const entityUpperCase = entityName.toUpperCase();
  const storeName = dataStoreHook.name || 'dataStore';

  return () => {
    console.log(`[${entityUpperCase}] Redirection vers ${storeName}.initWebSocket()`);
    const dataStore = dataStoreHook.getState();
    dataStore.initWebSocket();
    return dataStore.cleanup;
  };
}
