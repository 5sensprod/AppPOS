// server/websocket/websocketManager.js
const WebSocket = require('ws');
const logger = require('../utils/logger');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Stocke les clients et leurs abonnements
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      logger.info(`Nouvelle connexion WebSocket depuis ${clientIp}`);

      // Stocker le client avec ses abonnements initiaux
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

      // Envoyer un message de bienvenue
      this.sendToClient(ws, 'welcome', { message: 'Connecté au serveur WebSocket' });
    });

    logger.info('Serveur WebSocket initialisé');
  }

  handleMessage(client, message) {
    try {
      const parsedMessage = JSON.parse(message);
      const { type, payload } = parsedMessage;

      if (type === 'subscribe') {
        let { entityType } = payload;

        // Assurer que l'entité est toujours en pluriel
        entityType = entityType.endsWith('s') ? entityType : `${entityType}s`;

        if (entityType) {
          const clientData = this.clients.get(client);
          clientData.subscriptions.add(entityType);
          this.clients.set(client, clientData);
          logger.info(`Client ${clientData.ip} abonné à ${entityType}`);
          this.sendToClient(client, 'subscribed', { entityType });
        }
      }
      // Autres types de messages...
    } catch (error) {
      logger.error(`Erreur de traitement du message WebSocket: ${error.message}`);
    }
  }

  // Notifier les clients après des opérations CRUD
  notifyEntityCreated(entityType, entityData) {
    const entityPlural = entityType.endsWith('s') ? entityType : `${entityType}s`;
    this.broadcast('entity_created', { entityType: entityPlural, data: entityData }, [
      entityPlural,
    ]);
  }

  notifyEntityUpdated(entityType, entityId, entityData) {
    const entityPlural = entityType.endsWith('s') ? entityType : `${entityType}s`;
    this.broadcast('entity_updated', { entityType: entityPlural, entityId, data: entityData }, [
      entityPlural,
    ]);
  }

  notifyEntityDeleted(entityType, entityId) {
    const entityPlural = entityType.endsWith('s') ? entityType : `${entityType}s`;
    this.broadcast('entity_deleted', { entityType: entityPlural, entityId }, [entityPlural]);
  }

  notifyCategoryTreeChange() {
    this.broadcast('category_tree_changed', { timestamp: Date.now() }, ['categories']);
    console.log("[WS-DEBUG] Notification de changement dans l'arborescence des catégories envoyée");
  }

  // Envoyer à un client spécifique
  sendToClient(client, type, payload) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, payload }));
    }
  }

  // Diffuser un message aux clients abonnés
  broadcast(type, payload, requiredSubscriptions = []) {
    this.clients.forEach((clientData, client) => {
      // Vérifier si le client est abonné à tous les sujets requis
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
