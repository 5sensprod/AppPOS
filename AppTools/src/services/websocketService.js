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
  }

  init(baseUrl) {
    if (this.socket) {
      this.disconnect();
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = baseUrl
      ? `${baseUrl.replace(/^http(s)?:/, wsProtocol)}`
      : `${wsProtocol}//${window.location.host}`;

    const endpoint = `${wsUrl}/ws`;
    console.log(`Initialisation de la connexion WebSocket sur ${endpoint}`);

    this.socket = new WebSocket(endpoint);
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.addEventListener('open', () => {
      console.log('Connexion WebSocket établie');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.triggerEvent('connect');
    });

    this.socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Message WebSocket reçu:', data);

        if (data.type && data.payload) {
          // Évènements de notification de changement de données
          if (data.type === 'entity_updated') {
            const { entityType, entityId, data: entityData } = data.payload;
            this.handleEntityUpdate(entityType, entityId, entityData);
          } else if (data.type === 'entity_created') {
            const { entityType, data: entityData } = data.payload;
            this.handleEntityCreate(entityType, entityData);
          } else if (data.type === 'entity_deleted') {
            const { entityType, entityId } = data.payload;
            this.handleEntityDelete(entityType, entityId);
          }

          // Déclencher l'événement pour les gestionnaires personnalisés
          this.triggerEvent(data.type, data.payload);
        }
      } catch (error) {
        console.error('Erreur de traitement du message WebSocket:', error);
      }
    });

    this.socket.addEventListener('close', (event) => {
      console.log(`Connexion WebSocket fermée: ${event.code} ${event.reason}`);
      this.isConnected = false;
      this.attemptReconnect();
      this.triggerEvent('disconnect');
    });

    this.socket.addEventListener('error', (error) => {
      console.error('Erreur WebSocket:', error);
      this.triggerEvent('error', error);
    });
  }

  // Gestion des mises à jour d'entités
  handleEntityUpdate(entityType, entityId, entityData) {
    // Mettre à jour le cache
    const entities = dataCache.get(entityType);
    const updatedEntities = entities.map((item) =>
      item._id === entityId ? { ...item, ...entityData } : item
    );

    dataCache.set(entityType, updatedEntities);

    // Déclencher un événement spécifique à l'entité
    this.triggerEvent(`${entityType}_updated`, { entityId, data: entityData });
  }

  handleEntityCreate(entityType, entityData) {
    const entities = dataCache.get(entityType);
    const updatedEntities = [...entities, entityData];

    dataCache.set(entityType, updatedEntities);

    this.triggerEvent(`${entityType}_created`, { data: entityData });
  }

  handleEntityDelete(entityType, entityId) {
    const entities = dataCache.get(entityType);
    const updatedEntities = entities.filter((item) => item._id !== entityId);

    dataCache.set(entityType, updatedEntities);

    this.triggerEvent(`${entityType}_deleted`, { entityId });
  }

  // Envoyer un message au serveur
  send(type, payload) {
    if (!this.isConnected) {
      console.warn("Tentative d'envoi de message WebSocket sans connexion établie");
      return false;
    }

    this.socket.send(JSON.stringify({ type, payload }));
    return true;
  }

  // Abonnement à un type d'entité
  subscribe(entityType) {
    return this.send('subscribe', { entityType });
  }

  // Tenter de se reconnecter en cas de déconnexion
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `Nombre maximum de tentatives de reconnexion atteint (${this.maxReconnectAttempts})`
      );
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `Tentative de reconnexion WebSocket ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${this.reconnectDelay}ms`
    );

    setTimeout(() => {
      if (!this.isConnected) {
        this.init();
      }
    }, this.reconnectDelay);
  }

  // Gérer les événements personnalisés
  on(eventName, callback) {
    if (!this.eventHandlers[eventName]) {
      this.eventHandlers[eventName] = [];
    }
    this.eventHandlers[eventName].push(callback);
  }

  off(eventName, callback) {
    if (!this.eventHandlers[eventName]) return;

    if (callback) {
      this.eventHandlers[eventName] = this.eventHandlers[eventName].filter(
        (handler) => handler !== callback
      );
    } else {
      delete this.eventHandlers[eventName];
    }
  }

  triggerEvent(eventName, data) {
    if (!this.eventHandlers[eventName]) return;

    this.eventHandlers[eventName].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Erreur dans le gestionnaire d'événement ${eventName}:`, error);
      }
    });
  }

  // Fermer la connexion WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

const websocketService = new WebSocketService();
export default websocketService;
