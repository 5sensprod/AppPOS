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

  // ✅ MÉTHODES EXISTANTES POUR ENTITÉS
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

  // ✅ NOUVELLES MÉTHODES POUR SESSIONS CAISSE
  notifyCashierSessionStatusChanged(payload) {
    const { cashier_id, username, session } = payload;
    const eventData = {
      cashier_id,
      username,
      session: {
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime || null,
        duration: session.duration || null,
        sales_count: session.sales_count,
        total_sales: session.total_sales,
        lcd_connected: session.lcd_connected || false,
        lcd_port: session.lcd_port || null,
      },
      timestamp: Date.now(),
    };

    this.broadcast('cashier_session.status.changed', eventData);
    console.log(`[WS-CASHIER] Session ${session.status} diffusée pour ${username} (${cashier_id})`);
  }

  notifyCashierSessionStatsUpdated(payload) {
    const { cashier_id, username, stats } = payload;
    const eventData = {
      cashier_id,
      username,
      stats: {
        sales_count: stats.sales_count,
        total_sales: stats.total_sales,
        last_sale_at: stats.last_sale_at,
      },
      timestamp: Date.now(),
    };

    this.broadcast('cashier_session.stats.updated', eventData);
    console.log(
      `[WS-CASHIER] Stats mises à jour diffusées pour ${username}: ${stats.sales_count} ventes, ${stats.total_sales}€`
    );
  }

  // ✅ NOUVELLES MÉTHODES POUR LCD
  notifyLCDOwnershipChanged(payload) {
    const { owned, owner, previous_owner } = payload;
    const eventData = {
      owned,
      owner: owner
        ? {
            cashier_id: owner.cashier_id,
            username: owner.username,
            port: owner.port,
            startTime: owner.startTime,
          }
        : null,
      previous_owner: previous_owner
        ? {
            cashier_id: previous_owner.cashier_id,
            username: previous_owner.username,
          }
        : null,
      timestamp: Date.now(),
    };

    this.broadcast('lcd.ownership.changed', eventData);

    if (owned && owner) {
      console.log(
        `[WS-LCD] Propriété LCD attribuée à ${owner.username} (${owner.cashier_id}) sur ${owner.port}`
      );
    } else if (previous_owner) {
      console.log(
        `[WS-LCD] Propriété LCD libérée de ${previous_owner.username} (${previous_owner.cashier_id})`
      );
    } else {
      console.log(`[WS-LCD] Propriété LCD libérée`);
    }
  }

  // ✅ NOUVEAU : Notification mouvement de caisse
  notifyCashierDrawerMovement(payload) {
    const { cashier_id, movement, new_balance } = payload;
    const eventData = {
      cashier_id,
      movement: {
        id: movement.id,
        type: movement.type,
        amount: movement.amount,
        reason: movement.reason,
        notes: movement.notes,
        created_at: movement.created_at,
        created_by: movement.created_by,
      },
      new_balance,
      timestamp: Date.now(),
    };

    this.broadcast('cashier_drawer.movement.added', eventData);

    const action = movement.type === 'in' ? 'Entrée' : 'Sortie';
    console.log(
      `[WS-DRAWER] ${action} ${movement.amount}€ diffusée pour cashier ${cashier_id} (${movement.reason})`
    );
  }

  // ✅ NOUVEAU : Notification statut fond de caisse
  notifyCashierDrawerStatus(payload) {
    const eventData = {
      cashier_id: payload.cashier_id,
      drawer_status: payload.drawer_status,
      current_amount: payload.current_amount,
      expected_amount: payload.expected_amount,
      variance: payload.variance,
      timestamp: Date.now(),
    };

    this.broadcast('cashier_drawer.status.changed', eventData);
    console.log(`[WS-DRAWER] Statut fond diffusé pour cashier ${payload.cashier_id}`);
  }

  // ✅ MÉTHODES UTILITAIRES EXISTANTES
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
