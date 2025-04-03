// src/services/websocketService.js

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isReconnecting = false;
    this.eventHandlers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.subscriptions = [];
    this.debug = true;
  }

  log(...args) {
    if (this.debug) console.log('[WS-CLIENT]', ...args);
  }

  init(baseUrl) {
    if (this.socket) this.disconnect();

    this.isReconnecting = false;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = baseUrl
      ? baseUrl.replace(/^http(s)?:/, wsProtocol)
      : `${wsProtocol}//${window.location.host}`;

    this.log(`Connexion WebSocket à ${wsUrl}/ws`);
    this.socket = new WebSocket(`${wsUrl}/ws`);
    this._setupListeners();
  }

  _setupListeners() {
    this._onSocket('open', this._handleOpen.bind(this));
    this._onSocket('message', this._handleMessage.bind(this));
    this._onSocket('close', this._handleClose.bind(this));
    this._onSocket('error', this._handleError.bind(this));
  }

  _onSocket(event, handler) {
    this.socket.addEventListener(event, handler);
  }

  _handleOpen() {
    this.log('WebSocket connecté');
    this.isConnected = true;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;

    this.log(`Réabonnement à ${this.subscriptions.length} entité(s)`);
    this.subscriptions.forEach((type) => this._subscribeType(type));

    this._trigger('connect');
  }

  _handleMessage({ data }) {
    try {
      const { type, payload } = JSON.parse(data);
      this.log(`Message reçu: ${type}`, payload);
      this._trigger(type, payload);
    } catch (err) {
      console.error('[WS-CLIENT] Erreur de parsing message:', err);
    }
  }

  _handleClose({ code, reason }) {
    this.log(`WebSocket fermé: ${code} ${reason}`);
    this.isConnected = false;
    this._trigger('disconnect');
    this._attemptReconnect();
  }

  _handleError(error) {
    console.error('[WS-CLIENT] Erreur WebSocket:', error);
    this._trigger('error', error);
  }

  _attemptReconnect() {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[WS-CLIENT] Reconnexion annulée après ${this.maxReconnectAttempts} tentatives`
      );
      return;
    }

    this.reconnectAttempts++;
    this.isReconnecting = true;

    this.log(`Reconnexion dans ${this.reconnectDelay}ms (Tentative ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (!this.isConnected) this.init();
    }, this.reconnectDelay);
  }

  send(type, payload) {
    if (!this.isConnected) {
      console.warn("[WS-CLIENT] Impossible d'envoyer: WebSocket non connecté");
      return false;
    }
    this.log(`Envoi: ${type}`, payload);
    this.socket.send(JSON.stringify({ type, payload }));
    return true;
  }

  subscribe(entityType) {
    const normalized = this._normalizeType(entityType);

    if (!this.subscriptions.includes(normalized)) {
      this.subscriptions.push(normalized);
      this.log(`Ajout de l'abonnement: ${normalized}`);
    } else {
      this.log(`Déjà abonné à: ${normalized}`);
    }

    return this._subscribeType(normalized);
  }

  _normalizeType(type) {
    return type.endsWith('s') ? type : `${type}s`;
  }

  _subscribeType(normalizedType) {
    return this.send('subscribe', { entityType: normalizedType });
  }

  on(event, callback) {
    if (!this.eventHandlers[event]) this.eventHandlers[event] = [];

    const exists = this.eventHandlers[event].some((fn) => fn.toString() === callback.toString());

    if (!exists) {
      this.eventHandlers[event].push(callback);
      this.log(`Ajout écouteur '${event}' (${this.eventHandlers[event].length})`);
    } else {
      this.log(`Écouteur déjà existant pour '${event}'`);
    }
  }

  off(event, callback) {
    const handlers = this.eventHandlers[event];
    if (!handlers) {
      this.log(`Aucun écouteur à retirer pour '${event}'`);
      return;
    }

    if (callback) {
      const initialLength = handlers.length;
      this.eventHandlers[event] = handlers.filter((fn) => fn !== callback);
      this.log(
        `Suppression écouteur '${event}': ${initialLength} → ${this.eventHandlers[event].length}`
      );
    } else {
      this.eventHandlers[event] = [];
      this.log(`Tous les écouteurs supprimés pour '${event}'`);
    }
  }

  _trigger(event, data) {
    const handlers = this.eventHandlers[event];
    if (!handlers || handlers.length === 0) {
      this.log(`Aucun écouteur pour '${event}'`);
      return;
    }

    this.log(`Déclenche '${event}' (${handlers.length} écouteur(s))`);

    handlers.forEach((fn, i) => {
      try {
        fn(data);
      } catch (err) {
        console.error(`[WS-CLIENT] Erreur dans l'écouteur #${i + 1} de '${event}':`, err);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.log('Déconnexion WebSocket');
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.isReconnecting = false;
    }
  }

  listAllListeners() {
    console.log('[WS-CLIENT] Écouteurs enregistrés:');

    const entries = Object.entries(this.eventHandlers);
    if (entries.length === 0) {
      console.log('- Aucun écouteur');
      return;
    }

    entries.forEach(([event, fns]) => {
      console.log(`- ${event}: ${fns.length} écouteur(s)`);
    });

    console.log(`Abonnements actifs: ${this.subscriptions.join(', ')}`);
  }
}

const websocketService = new WebSocketService();
export default websocketService;
