const WebSocket = require('ws');
const logger = require('../utils/logger');
const { standardizeEntityType } = require('../utils/entityTypeUtils');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.timeInterval = null;
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      logger.info(`Nouvelle connexion WebSocket depuis ${clientIp}`);

      this.clients.set(ws, {
        ip: clientIp,
        subscriptions: new Set(),
      });

      ws.on('message', (message) => this.handleMessage(ws, message));
      ws.on('close', () => {
        logger.info(`Client WebSocket déconnecté: ${clientIp}`);
        this.clients.delete(ws);
      });
      ws.on('error', (error) => {
        logger.error(`Erreur WebSocket: ${error.message}`);
      });

      this.sendToClient(ws, 'welcome', { message: 'Connecté au serveur WebSocket' });
    });

    // ✅ BROADCAST TEMPS SERVEUR TOUTES LES MINUTES
    this.timeInterval = setInterval(() => {
      this.broadcastServerTime();
    }, 60000); // Toutes les minutes pile

    // ✅ BROADCAST INITIAL
    setTimeout(() => this.broadcastServerTime(), 1000);

    logger.info('Serveur WebSocket initialisé');
  }

  broadcastServerTime() {
    const serverTime = {
      timestamp: Date.now(),
      iso: new Date().toISOString(),
      minute_changed: true, // Signal pour recalculer les durées
    };

    this.broadcast('server.time.update', serverTime);
    console.log(`⏰ [WS] Temps serveur diffusé: ${new Date().toLocaleTimeString()}`);
  }

  // ✅ CLEANUP
  destroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
      this.timeInterval = null;
    }
  }

  handleMessage(client, message) {
    try {
      const { type, payload } = JSON.parse(message);

      if (type === 'subscribe') {
        const entityType = standardizeEntityType(payload.entityType);

        const clientData = this.clients.get(client);
        clientData.subscriptions.add(entityType);
        this.clients.set(client, clientData);

        logger.info(`Client ${clientData.ip} abonné à ${entityType}`);
        this.sendToClient(client, 'subscribed', { entityType });
      }
    } catch (error) {
      logger.error(`Erreur de traitement du message WebSocket: ${error.message}`);
    }
  }

  notifyEntityCreated(entityType, entityData) {
    const entityPlural = standardizeEntityType(entityType);
    this.broadcast(`${entityPlural}.created`, entityData, [entityPlural]);
  }

  notifyEntityUpdated(entityType, entityId, entityData) {
    const entityPlural = standardizeEntityType(entityType);
    this.broadcast(`${entityPlural}.updated`, { entityId, data: entityData }, [entityPlural]);
  }

  notifyEntityDeleted(entityType, entityId) {
    const entityPlural = standardizeEntityType(entityType);
    this.broadcast(`${entityPlural}.deleted`, { entityId }, [entityPlural]);
  }

  notifyCategoryTreeChange() {
    this.broadcast('categories.tree.changed', { timestamp: Date.now() }, ['categories']);
    console.log("[WS-DEBUG] Notification de changement dans l'arborescence des catégories envoyée");
  }

  notifySupplierTreeChange() {
    this.broadcast('suppliers.tree.changed', { timestamp: Date.now() }, ['suppliers']);
    console.log(
      "[WS-DEBUG] Notification de changement dans l'arborescence des fournisseurs envoyée"
    );
  }

  notifyEntityCountUpdated(entityType, entityId, count) {
    const entityPlural = standardizeEntityType(entityType);
    this.broadcast(`${entityPlural}.count.updated`, { entityId, count }, [entityPlural]);
  }

  sendToClient(client, type, payload) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, payload }));
    }
  }

  broadcast(type, payload, requiredSubscriptions = []) {
    this.clients.forEach((clientData, client) => {
      const isSubscribed =
        requiredSubscriptions.length === 0 ||
        requiredSubscriptions.every((sub) => clientData.subscriptions.has(sub));

      if (isSubscribed && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type, payload }));
      }
    });
  }
}

const websocketManager = new WebSocketManager();
module.exports = websocketManager;
