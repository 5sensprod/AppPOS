// server/websocket/websocketEventBridge.js
const apiEventEmitter = require('../services/apiEventEmitter');
const websocketManager = require('./websocketManager');

function initializeWebSocketEventBridge() {
  // Mapper les événements génériques
  apiEventEmitter.on('entity.created', ({ entityType, data }) => {
    console.log(`[EVENT-WS] Événement entity.created pour ${entityType} relayé vers WebSocket`);
    websocketManager.notifyEntityCreated(entityType, data);
  });

  apiEventEmitter.on('entity.updated', ({ entityType, id, data }) => {
    console.log(
      `[EVENT-WS] Événement entity.updated pour ${entityType}:${id} relayé vers WebSocket`
    );
    websocketManager.notifyEntityUpdated(entityType, id, data);
  });

  apiEventEmitter.on('entity.deleted', ({ entityType, id }) => {
    console.log(
      `[EVENT-WS] Événement entity.deleted pour ${entityType}:${id} relayé vers WebSocket`
    );
    websocketManager.notifyEntityDeleted(entityType, id);
  });

  // Événements spécifiques
  apiEventEmitter.on('categories.tree.changed', () => {
    console.log(`[EVENT-WS] Événement categories.tree.changed relayé vers WebSocket`);
    websocketManager.notifyCategoryTreeChange();
  });

  apiEventEmitter.on('brands.count.updated', ({ id, count }) => {
    console.log(`[EVENT-WS] Événement brands.count.updated pour ${id} relayé vers WebSocket`);
    websocketManager.notifyEntityCountUpdated('brands', id, count);
  });

  apiEventEmitter.on('suppliers.count.updated', ({ id, count }) => {
    console.log(`[EVENT-WS] Événement suppliers.count.updated pour ${id} relayé vers WebSocket`);
    websocketManager.notifyEntityCountUpdated('suppliers', id, count);
  });

  console.log('[EVENT-WS] Bridge initialisé entre Event Emitter et WebSocket Manager');
}

module.exports = { initializeWebSocketEventBridge };
