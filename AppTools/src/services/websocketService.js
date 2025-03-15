// src/services/websocketService.js

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isReconnecting = false; // 🔹 Empêche les boucles infinies
    this.eventHandlers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
  }

  init(baseUrl) {
    if (this.socket) this.disconnect();

    this.isReconnecting = false; // 🔹 Réinitialisation après une tentative de connexion réussie
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = baseUrl
      ? baseUrl.replace(/^http(s)?:/, wsProtocol)
      : `${wsProtocol}//${window.location.host}`;

    console.log(`Nouvelle connexion WebSocket à ${wsUrl}/ws`);

    this.socket = new WebSocket(`${wsUrl}/ws`);
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.addEventListener('open', () => {
      console.log('WebSocket connecté');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.isReconnecting = false; // 🔹 Connexion réussie, stoppe la reconnexion
      this.triggerEvent('connect');
    });

    this.socket.addEventListener('message', ({ data }) => {
      try {
        const { type, payload } = JSON.parse(data);
        console.log('Message reçu:', { type, payload });

        const actions = {
          entity_updated: () => this.handleEntityUpdate(payload),
          entity_created: () => this.handleEntityCreate(payload),
          entity_deleted: () => this.handleEntityDelete(payload),
        };

        actions[type]?.();
        this.triggerEvent(type, payload);
      } catch (error) {
        console.error('Erreur de traitement WebSocket:', error);
      }
    });

    this.socket.addEventListener('close', ({ code, reason }) => {
      console.log(`WebSocket fermé: ${code} ${reason}`);
      this.isConnected = false;
      this.attemptReconnect();
      this.triggerEvent('disconnect');
    });

    this.socket.addEventListener('error', (error) => {
      console.error('Erreur WebSocket:', error);
      this.triggerEvent('error', error);
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isReconnecting) {
      console.error(`Reconnexion annulée après ${this.maxReconnectAttempts} tentatives`);
      return;
    }

    this.reconnectAttempts++;
    this.isReconnecting = true; // 🔹 Empêche plusieurs reconnexions en parallèle
    console.log(`Reconnexion dans ${this.reconnectDelay}ms (Tentative ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.init(); // 🔹 Vérification avant d'initier une nouvelle connexion
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
      console.warn('Envoi WebSocket impossible: connexion fermée');
      return false;
    }
    this.socket.send(JSON.stringify({ type, payload }));
    return true;
  }

  subscribe(entityType) {
    return this.send('subscribe', { entityType });
  }

  on(eventName, callback) {
    this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
    this.eventHandlers[eventName].push(callback);
  }

  off(eventName, callback) {
    if (!this.eventHandlers[eventName]) return;
    this.eventHandlers[eventName] = callback
      ? this.eventHandlers[eventName].filter((handler) => handler !== callback)
      : [];
  }

  triggerEvent(eventName, data) {
    this.eventHandlers[eventName]?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Erreur dans le gestionnaire d'événement ${eventName}:`, error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.isReconnecting = false; // 🔹 Stoppe la reconnexion en cas de fermeture manuelle
    }
  }
}

const websocketService = new WebSocketService();
export default websocketService;
