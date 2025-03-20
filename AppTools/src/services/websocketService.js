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
    this.subscriptions = []; // Garder une trace des abonnements actifs
  }

  init(baseUrl) {
    if (this.socket) this.disconnect();

    this.isReconnecting = false; // 🔹 Réinitialisation après une tentative de connexion réussie
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = baseUrl
      ? baseUrl.replace(/^http(s)?:/, wsProtocol)
      : `${wsProtocol}//${window.location.host}`;

    console.log(`[WS-CLIENT] Nouvelle connexion WebSocket à ${wsUrl}/ws`);

    this.socket = new WebSocket(`${wsUrl}/ws`);
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.addEventListener('open', () => {
      console.log('[WS-CLIENT] WebSocket connecté');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.isReconnecting = false; // 🔹 Connexion réussie, stoppe la reconnexion

      // Réabonner aux entités précédemment suivies
      console.log(
        `[WS-CLIENT] Réabonnement aux ${this.subscriptions.length} souscriptions précédentes`
      );
      this.subscriptions.forEach((entityType) => {
        this.subscribe(entityType);
      });

      this.triggerEvent('connect');
    });

    this.socket.addEventListener('message', ({ data }) => {
      try {
        const { type, payload } = JSON.parse(data);
        console.log('[WS-CLIENT] Message reçu:', { type, payload });

        // Nouveau mapping standardisé
        const standardizedEvents = {
          entity_created: () => {
            const { entityType, data } = payload;
            console.log(`[WS-CLIENT] Entité créée: ${entityType}`, data);
            this.triggerEvent(`${entityType}.created`, data);
          },
          entity_updated: () => {
            const { entityType, entityId, data } = payload;
            console.log(`[WS-CLIENT] Entité mise à jour: ${entityType} (ID: ${entityId})`);
            this.triggerEvent(`${entityType}.updated`, { entityId, data });
          },
          entity_deleted: () => {
            const { entityType, entityId } = payload;
            console.log(`[WS-CLIENT] Entité supprimée: ${entityType} (ID: ${entityId})`);
            this.triggerEvent(`${entityType}.deleted`, { entityId });
          },
          category_tree_changed: () => {
            console.log("[WS-CLIENT] Changement d'arborescence de catégories détecté");
            this.triggerEvent('categories.tree.changed', payload);
          },
        };

        // Appliquer la standardisation si possible
        if (standardizedEvents[type]) {
          standardizedEvents[type]();
        }

        // Conserver aussi le format original pour compatibilité
        this.triggerEvent(type, payload);
      } catch (error) {
        console.error('[WS-CLIENT] Erreur de traitement WebSocket:', error);
      }
    });

    this.socket.addEventListener('close', ({ code, reason }) => {
      console.log(`[WS-CLIENT] WebSocket fermé: ${code} ${reason}`);
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
    this.isReconnecting = true; // 🔹 Empêche plusieurs reconnexions en parallèle
    console.log(
      `[WS-CLIENT] Reconnexion dans ${this.reconnectDelay}ms (Tentative ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      if (!this.isConnected) {
        this.init(); // 🔹 Vérification avant d'initier une nouvelle connexion
      }
    }, this.reconnectDelay);
  }

  handleEntityUpdate({ entityType, entityId, data }) {
    console.log(`[WS-CLIENT] Mise à jour d'entité: ${entityType} (ID: ${entityId})`);
    this.triggerEvent(`${entityType}_updated`, { entityId, data });
  }

  handleEntityCreate({ entityType, data }) {
    console.log(`[WS-CLIENT] Création d'entité: ${entityType}`);
    this.triggerEvent(`${entityType}_created`, { data });
  }

  handleEntityDelete({ entityType, entityId }) {
    console.log(`[WS-CLIENT] Suppression d'entité: ${entityType} (ID: ${entityId})`);
    this.triggerEvent(`${entityType}_deleted`, { entityId });
  }

  send(type, payload) {
    if (!this.isConnected) {
      console.warn('[WS-CLIENT] Envoi WebSocket impossible: connexion fermée');
      return false;
    }
    console.log(`[WS-CLIENT] Envoi du message: ${type}`, payload);
    this.socket.send(JSON.stringify({ type, payload }));
    return true;
  }

  subscribe(entityType) {
    console.log(`[WS-CLIENT] Abonnement à: ${entityType}`);

    // Stocker l'abonnement pour réabonnement lors des reconnexions
    if (!this.subscriptions.includes(entityType)) {
      this.subscriptions.push(entityType);
      console.log(`[WS-CLIENT] Liste des abonnements: ${this.subscriptions.join(', ')}`);
    }

    return this.send('subscribe', { entityType });
  }

  on(eventName, callback) {
    this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
    this.eventHandlers[eventName].push(callback);
    console.log(
      `[WS-CLIENT] Nouvel écouteur pour '${eventName}'. Total: ${this.eventHandlers[eventName].length}`
    );
  }

  off(eventName, callback) {
    if (!this.eventHandlers[eventName]) {
      console.log(
        `[WS-CLIENT] Tentative de suppression d'un écouteur pour '${eventName}', mais aucun n'existe`
      );
      return;
    }

    const initialCount = this.eventHandlers[eventName].length;

    if (callback) {
      this.eventHandlers[eventName] = this.eventHandlers[eventName].filter(
        (handler) => handler !== callback
      );
      console.log(
        `[WS-CLIENT] Écouteur supprimé pour '${eventName}'. Avant: ${initialCount}, Après: ${this.eventHandlers[eventName].length}`
      );
    } else {
      this.eventHandlers[eventName] = [];
      console.log(`[WS-CLIENT] Tous les écouteurs (${initialCount}) supprimés pour '${eventName}'`);
    }
  }

  triggerEvent(eventName, data) {
    if (!this.eventHandlers[eventName] || this.eventHandlers[eventName].length === 0) {
      console.log(`[WS-CLIENT] Aucun écouteur trouvé pour l'événement '${eventName}'`);
      return;
    }

    console.log(
      `[WS-CLIENT] Déclenchement de l'événement '${eventName}' pour ${this.eventHandlers[eventName].length} écouteur(s)`
    );

    this.eventHandlers[eventName].forEach((callback, index) => {
      try {
        console.log(`[WS-CLIENT] Exécution de l'écouteur #${index + 1} pour '${eventName}'`);
        callback(data);
        console.log(`[WS-CLIENT] Écouteur #${index + 1} pour '${eventName}' exécuté avec succès`);
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
      console.log('[WS-CLIENT] Déconnexion manuelle du WebSocket');
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.isReconnecting = false; // 🔹 Stoppe la reconnexion en cas de fermeture manuelle
    }
  }
}

const websocketService = new WebSocketService();
export default websocketService;
