// server/websocket/websocketEventBridge.js
const apiEventEmitter = require('../services/apiEventEmitter');
const websocketManager = require('./websocketManager');

function initializeWebSocketEventBridge() {
  // ✅ ÉVÉNEMENTS GÉNÉRIQUES EXISTANTS
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

  // ✅ ÉVÉNEMENTS SPÉCIFIQUES EXISTANTS
  apiEventEmitter.on('categories.tree.changed', () => {
    console.log(`[EVENT-WS] Événement categories.tree.changed relayé vers WebSocket`);
    websocketManager.notifyCategoryTreeChange();
  });

  apiEventEmitter.on('suppliers.tree.changed', () => {
    console.log(`[EVENT-WS] Événement suppliers.tree.changed relayé vers WebSocket`);
    websocketManager.notifySupplierTreeChange();
  });

  apiEventEmitter.on('brands.count.updated', ({ id, count }) => {
    console.log(`[EVENT-WS] Événement brands.count.updated pour ${id} relayé vers WebSocket`);
    websocketManager.notifyEntityCountUpdated('brands', id, count);
  });

  apiEventEmitter.on('suppliers.count.updated', ({ id, count }) => {
    console.log(`[EVENT-WS] Événement suppliers.count.updated pour ${id} relayé vers WebSocket`);
    websocketManager.notifyEntityCountUpdated('suppliers', id, count);
  });

  // ✅ NOUVEAUX ÉVÉNEMENTS SESSION CAISSE
  apiEventEmitter.on('cashier_session.status.changed', (payload) => {
    console.log(
      `[EVENT-WS] Session ${payload.session.status} pour ${payload.username} (${payload.cashier_id}) relayé vers WebSocket`
    );
    websocketManager.notifyCashierSessionStatusChanged(payload);
  });

  apiEventEmitter.on('cashier_session.stats.updated', (payload) => {
    console.log(
      `[EVENT-WS] Stats session mises à jour pour ${payload.username} (${payload.cashier_id}): ${payload.stats.sales_count} ventes, ${payload.stats.total_sales}€`
    );
    websocketManager.notifyCashierSessionStatsUpdated(payload);
  });

  // ✅ NOUVEAUX ÉVÉNEMENTS LCD
  apiEventEmitter.on('lcd.ownership.changed', (payload) => {
    const action = payload.owned ? 'attribué' : 'libéré';
    const owner = payload.owned
      ? payload.owner.username
      : payload.previous_owner?.username || 'inconnu';
    console.log(
      `[EVENT-WS] LCD ${action} ${payload.owned ? 'à' : 'de'} ${owner} relayé vers WebSocket`
    );
    websocketManager.notifyLCDOwnershipChanged(payload);
  });

  // ✅ NOUVEAU : Événement mouvement de caisse
  apiEventEmitter.on('cashier_drawer.movement.added', (payload) => {
    const action = payload.movement.type === 'in' ? 'Entrée' : 'Sortie';
    console.log(
      `[EVENT-WS] ${action} caisse ${payload.movement.amount}€ pour cashier ${payload.cashier_id} relayé vers WebSocket`
    );
    websocketManager.notifyCashierDrawerMovement(payload);
  });

  // ✅ NOUVEAU : Événement statut fond de caisse
  apiEventEmitter.on('cashier_drawer.status.changed', (payload) => {
    console.log(
      `[EVENT-WS] Statut fond de caisse changé pour cashier ${payload.cashier_id} relayé vers WebSocket`
    );
    websocketManager.notifyCashierDrawerStatus(payload);
  });

  apiEventEmitter.on('lcd.connection.lost', (payload) => {
    console.log(`[EVENT-WS] LCD déconnecté sur ${payload.port} relayé vers WebSocket`);
    websocketManager.notifyLCDConnectionLost(payload);
  });

  apiEventEmitter.on('lcd.connection.restored', (payload) => {
    console.log(`[EVENT-WS] LCD reconnecté sur ${payload.port} relayé vers WebSocket`);
    websocketManager.notifyLCDConnectionRestored(payload);
  });

  apiEventEmitter.on('lcd.connection.failed', (payload) => {
    console.log(`[EVENT-WS] LCD échec reconnexion sur ${payload.port} relayé vers WebSocket`);
    websocketManager.notifyLCDConnectionFailed(payload);
  });

  apiEventEmitter.on('stock.statistics.changed', (payload) => {
    console.log(`[EVENT-WS] Statistiques de stock mises à jour relayées vers WebSocket`);
    websocketManager.notifyStockStatisticsChanged(payload);
  });

  console.log('[EVENT-WS] Bridge initialisé entre Event Emitter et WebSocket Manager');
  console.log('[EVENT-WS] ✅ Événements sessions caisse et LCD ajoutés');
}

module.exports = { initializeWebSocketEventBridge };
