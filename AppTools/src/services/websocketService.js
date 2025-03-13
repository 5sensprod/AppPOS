// src/services/websocketService.js
import dataCache from '../utils/dataCache';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.baseUrl = null;
  }

  init(baseUrl) {
    if (this.socket) this.disconnect();
    this.baseUrl = baseUrl || this.baseUrl;

    if (!this.baseUrl) {
      console.error('Aucune URL de WebSocket fournie');
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = this.baseUrl.replace(/^http(s)?:/, wsProtocol);
    const endpoint = `${wsUrl}/ws`;

    console.log(`Connexion WebSocket: ${endpoint}`);
    this.socket = new WebSocket(endpoint);
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.addEventListener('open', () => {
      console.log('✅ WebSocket connecté');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.triggerEvent('connect');
    });

    this.socket.addEventListener('message', (event) => this.handleMessage(event));
    this.socket.addEventListener('close', (event) => this.handleClose(event));
    this.socket.addEventListener('error', (error) => this.triggerEvent('error', error));
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('📩 Message WebSocket reçu:', data);

      if (data.type && data.payload) {
        this.updateCache(data.type, data.payload);
        this.triggerEvent(data.type, data.payload);
      }
    } catch (error) {
      console.error('❌ Erreur de parsing WebSocket:', error);
    }
  }

  handleClose(event) {
    console.warn(`🚫 WebSocket fermé: ${event.code} ${event.reason}`);
    this.isConnected = false;
    this.triggerEvent('disconnect');
    this.attemptReconnect();
  }

  updateCache(type, payload) {
    const { entityType, entityId, data: entityData } = payload;

    if (!entityType) return;
    const entities = dataCache.get(entityType) || [];

    switch (type) {
      case 'entity_updated':
        dataCache.set(
          entityType,
          entities.map((item) => (item._id === entityId ? { ...item, ...entityData } : item))
        );
        break;
      case 'entity_created':
        dataCache.set(entityType, [...entities, entityData]);
        break;
      case 'entity_deleted':
        dataCache.set(
          entityType,
          entities.filter((item) => item._id !== entityId)
        );
        break;
    }

    this.triggerEvent(`${entityType}_${type.split('_')[1]}`, payload);
  }

  send(type, payload) {
    if (!this.isConnected) {
      console.warn('⚠️ WebSocket non connecté');
      return false;
    }

    this.socket.send(JSON.stringify({ type, payload }));
    return true;
  }

  subscribe(entityType) {
    return this.send('subscribe', { entityType });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Reconnexion échouée après plusieurs tentatives');
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `🔄 Reconnexion dans ${this.reconnectDelay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => this.init(), this.reconnectDelay);
  }

  on(eventName, callback) {
    if (!this.eventHandlers[eventName]) this.eventHandlers[eventName] = [];
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
        console.error(`⚠️ Erreur dans le gestionnaire ${eventName}:`, error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export default new WebSocketService();
