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
    this.subscriptions = []; // Garder une trace des abonnements actifs

    // Ajouter une méthode de débogage
    this.debug = true; // Activer le débogage
  }

  log(...args) {
    if (this.debug) {
      console.log('[WS-CLIENT]', ...args);
    }
  }

  init(baseUrl) {
    if (this.socket) this.disconnect();

    this.isReconnecting = false;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = baseUrl
      ? baseUrl.replace(/^http(s)?:/, wsProtocol)
      : `${wsProtocol}//${window.location.host}`;

    this.log(`Nouvelle connexion WebSocket à ${wsUrl}/ws`);

    this.socket = new WebSocket(`${wsUrl}/ws`);
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.addEventListener('open', () => {
      this.log('WebSocket connecté');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.isReconnecting = false;

      // Réabonner aux entités précédemment suivies
      this.log(`Réabonnement aux ${this.subscriptions.length} souscriptions précédentes`);
      this.subscriptions.forEach((entityType) => {
        this.subscribe(entityType);
      });

      this.triggerEvent('connect');
    });

    this.socket.addEventListener('message', ({ data }) => {
      try {
        const { type, payload } = JSON.parse(data);
        this.log(`Message reçu: ${type}`, payload);

        // Déclenchement direct de l'événement
        this.triggerEvent(type, payload);
      } catch (error) {
        console.error('[WS-CLIENT] Erreur de traitement WebSocket:', error);
      }
    });

    this.socket.addEventListener('close', ({ code, reason }) => {
      this.log(`WebSocket fermé: ${code} ${reason}`);
      this.isConnected = false;
      this.attemptReconnect();
      this.triggerEvent('disconnect');
    });

    this.socket.addEventListener('error', (error) => {
      console.error('[WS-CLIENT] Erreur WebSocket:', error);
      this.triggerEvent('error', error);
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isReconnecting) {
      console.error(
        `[WS-CLIENT] Reconnexion annulée après ${this.maxReconnectAttempts} tentatives`
      );
      return;
    }

    this.reconnectAttempts++;
    this.isReconnecting = true;
    this.log(`Reconnexion dans ${this.reconnectDelay}ms (Tentative ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.init();
      }
    }, this.reconnectDelay);
  }

  send(type, payload) {
    if (!this.isConnected) {
      console.warn('[WS-CLIENT] Envoi WebSocket impossible: connexion fermée');
      return false;
    }
    this.log(`Envoi du message: ${type}`, payload);
    this.socket.send(JSON.stringify({ type, payload }));
    return true;
  }

  subscribe(entityType) {
    // Normaliser le nom d'entité (toujours au pluriel)
    const normalizedEntityType = entityType.endsWith('s') ? entityType : `${entityType}s`;

    this.log(`Abonnement à: ${normalizedEntityType}`);

    // Stocker l'abonnement pour réabonnement lors des reconnexions
    if (!this.subscriptions.includes(normalizedEntityType)) {
      this.subscriptions.push(normalizedEntityType);
      this.log(`Liste des abonnements: ${this.subscriptions.join(', ')}`);
    }

    return this.send('subscribe', { entityType: normalizedEntityType });
  }

  on(eventName, callback) {
    if (!this.eventHandlers[eventName]) {
      this.eventHandlers[eventName] = [];
    }

    // Vérifier que la fonction de callback n'est pas déjà enregistrée
    const callbackExists = this.eventHandlers[eventName].some(
      (handler) => handler.toString() === callback.toString()
    );

    if (!callbackExists) {
      this.eventHandlers[eventName].push(callback);
      this.log(
        `Nouvel écouteur pour '${eventName}'. Total: ${this.eventHandlers[eventName].length}`
      );
    } else {
      this.log(`Écouteur déjà enregistré pour '${eventName}'`);
    }
  }

  off(eventName, callback) {
    if (!this.eventHandlers[eventName]) {
      this.log(`Tentative de suppression d'un écouteur pour '${eventName}', mais aucun n'existe`);
      return;
    }

    const initialCount = this.eventHandlers[eventName].length;

    if (callback) {
      this.eventHandlers[eventName] = this.eventHandlers[eventName].filter(
        (handler) => handler !== callback
      );
      this.log(
        `Écouteur supprimé pour '${eventName}'. Avant: ${initialCount}, Après: ${this.eventHandlers[eventName].length}`
      );
    } else {
      this.eventHandlers[eventName] = [];
      this.log(`Tous les écouteurs (${initialCount}) supprimés pour '${eventName}'`);
    }
  }

  triggerEvent(eventName, data) {
    if (!this.eventHandlers[eventName] || this.eventHandlers[eventName].length === 0) {
      // Log plus discret pour les événements sans écouteurs
      this.log(`Aucun écouteur pour l'événement '${eventName}'`);
      return;
    }

    this.log(
      `Déclenchement de '${eventName}' pour ${this.eventHandlers[eventName].length} écouteur(s)`
    );

    this.eventHandlers[eventName].forEach((callback, index) => {
      try {
        callback(data);
      } catch (error) {
        console.error(
          `[WS-CLIENT] Erreur dans l'écouteur #${index + 1} pour '${eventName}':`,
          error
        );
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.log('Déconnexion manuelle du WebSocket');
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.isReconnecting = false;
    }
  }

  // Méthode pour lister tous les écouteurs actifs (débogage)
  listAllListeners() {
    console.log('[WS-CLIENT] Liste de tous les écouteurs enregistrés:');

    if (Object.keys(this.eventHandlers).length === 0) {
      console.log('- Aucun écouteur enregistré');
      return;
    }

    Object.entries(this.eventHandlers).forEach(([event, handlers]) => {
      console.log(`- ${event}: ${handlers.length} écouteur(s)`);
    });

    console.log(`Abonnements actifs: ${this.subscriptions.join(', ')}`);
  }
}

const websocketService = new WebSocketService();
export default websocketService;
