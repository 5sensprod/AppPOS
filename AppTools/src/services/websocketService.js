// src/services/websocketService.js

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isReconnecting = false; // Empêche les boucles infinies
    this.eventHandlers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.subscriptions = []; // Garder une trace des abonnements actifs
  }

  init(baseUrl) {
    if (this.socket) this.disconnect();

    this.isReconnecting = false; // Réinitialisation après une tentative de connexion réussie
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = baseUrl
      ? baseUrl.replace(/^http(s)?:/, wsProtocol)
      : `${wsProtocol}//${window.location.host}`;

    this.socket = new WebSocket(`${wsUrl}/ws`);
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.addEventListener('open', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.isReconnecting = false; // Connexion réussie, stoppe la reconnexion

      // Réabonner aux entités précédemment suivies
      this.subscriptions.forEach((entityType) => {
        this.subscribe(entityType);
      });

      this.triggerEvent('connect');
    });

    this.socket.addEventListener('message', ({ data }) => {
      try {
        const { type, payload } = JSON.parse(data);
        // Déclenchement direct de l'événement
        this.triggerEvent(type, payload);
      } catch (error) {
        // Erreur silencieuse
      }
    });

    this.socket.addEventListener('close', ({ code, reason }) => {
      this.isConnected = false;
      this.attemptReconnect();
      this.triggerEvent('disconnect');
    });

    this.socket.addEventListener('error', (error) => {
      this.triggerEvent('error', error);
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isReconnecting) {
      return;
    }

    this.reconnectAttempts++;
    this.isReconnecting = true; // Empêche plusieurs reconnexions en parallèle

    setTimeout(() => {
      if (!this.isConnected) {
        this.init(); // Vérification avant d'initier une nouvelle connexion
      }
    }, this.reconnectDelay);
  }

  handleEntityUpdate({ entityType, entityId, data }) {
    this.triggerEvent(`${entityType}_updated`, { entityId, data });
  }

  handleEntityCreate({ entityType, data }) {
    this.triggerEvent(`${entityType}_created`, { data });
  }

  handleEntityDelete({ entityType, entityId }) {
    this.triggerEvent(`${entityType}_deleted`, { entityId });
  }

  send(type, payload) {
    if (!this.isConnected) {
      return false;
    }
    this.socket.send(JSON.stringify({ type, payload }));
    return true;
  }

  subscribe(entityType) {
    // Stocker l'abonnement pour réabonnement lors des reconnexions
    if (!this.subscriptions.includes(entityType)) {
      this.subscriptions.push(entityType);
    }

    return this.send('subscribe', { entityType });
  }

  on(eventName, callback) {
    this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
    this.eventHandlers[eventName].push(callback);
  }

  off(eventName, callback) {
    if (!this.eventHandlers[eventName]) {
      return;
    }

    if (callback) {
      this.eventHandlers[eventName] = this.eventHandlers[eventName].filter(
        (handler) => handler !== callback
      );
    } else {
      this.eventHandlers[eventName] = [];
    }
  }

  triggerEvent(eventName, data) {
    if (!this.eventHandlers[eventName] || this.eventHandlers[eventName].length === 0) {
      return;
    }

    this.eventHandlers[eventName].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        // Erreur silencieuse
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.isReconnecting = false; // Stoppe la reconnexion en cas de fermeture manuelle
    }
  }
}

const websocketService = new WebSocketService();
export default websocketService;
