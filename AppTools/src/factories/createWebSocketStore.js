// src/factories/createWebSocketStore.js
import { create } from 'zustand';
import websocketService from '../services/websocketService';

/**
 * Crée un store Zustand pour gérer les écouteurs WebSocket de manière centralisée
 *
 * @param {Object} options - Options de configuration
 * @param {string} options.entityName - Nom de l'entité (ex: 'product', 'supplier')
 * @param {string} options.apiEndpoint - Endpoint API pour charger les données
 * @param {string} [options.dataPropertyName] - Nom personnalisé pour la propriété de données (ex: 'hierarchicalCategories')
 * @param {string} [options.fetchMethodName] - Nom personnalisé pour la méthode de chargement (ex: 'fetchHierarchicalCategories')
 * @param {Array<string>} [options.additionalChannels] - Canaux WebSocket additionnels à écouter
 * @param {Array<Object>} [options.additionalEvents] - Événements additionnels à écouter
 * @param {Object} options.apiService - Service API pour charger les données
 * @returns {Function} - Hook Zustand pour le store WebSocket
 */
export function createWebSocketStore(options) {
  const {
    entityName,
    apiEndpoint,
    dataPropertyName,
    fetchMethodName,
    additionalChannels = [],
    additionalEvents = [],
    apiService,
  } = options;

  const entityNameLower = entityName.toLowerCase();
  const entityNamePlural = entityNameLower + 's'; // Simplification de la pluralisation
  const entityNameUpper = entityNameLower.toUpperCase();

  // Utiliser les noms personnalisés s'ils existent, sinon les noms standards
  const statePropertyName = dataPropertyName || entityNamePlural;
  const methodName =
    fetchMethodName ||
    `fetch${entityNamePlural.charAt(0).toUpperCase() + entityNamePlural.slice(1)}`;

  return create((set, get) => {
    // Fonction pour gérer les abonnements WebSocket
    const setupWebSocketListeners = () => {
      // Éviter les abonnements multiples
      if (get().listenersInitialized) return;

      console.log(`[${entityNameUpper}] Initialisation des écouteurs WebSocket`);

      // S'abonner au canal principal
      websocketService.subscribe(entityNamePlural);

      // S'abonner aux canaux additionnels
      additionalChannels.forEach((channel) => {
        websocketService.subscribe(channel);
      });

      // Gestionnaire pour l'événement de création
      const handleCreated = (data) => {
        console.log(`[${entityNameUpper}] Événement ${entityNamePlural}.created reçu`, data);
        get()[methodName]();
      };

      // Gestionnaire pour l'événement de mise à jour
      const handleUpdated = (data) => {
        console.log(`[${entityNameUpper}] Événement ${entityNamePlural}.updated reçu`, data);
        get()[methodName]();
      };

      // Gestionnaire amélioré pour l'événement de suppression
      const handleDeleted = (data) => {
        console.log(`[${entityNameUpper}] Événement ${entityNamePlural}.deleted reçu ✨`, data);

        // Vérifier le format des données pour s'adapter
        let deletedId;
        if (data && data.entityId) {
          deletedId = data.entityId;
        } else if (data && data.id) {
          deletedId = data.id;
        } else if (typeof data === 'string') {
          deletedId = data;
        }

        console.log(`[${entityNameUpper}] ${entityName} supprimé avec ID: ${deletedId}`);
        get()[methodName]();
      };

      // Gestionnaire global pour entity.deleted
      const handleEntityDeleted = (data) => {
        if (data && data.entityType === entityNamePlural) {
          console.log(
            `[${entityNameUpper}] Événement entity.deleted pour ${entityNamePlural} reçu ✨`,
            data
          );
          get()[methodName]();
        }
      };

      // Créer les gestionnaires pour les événements additionnels
      const additionalHandlers = {};
      additionalEvents.forEach((eventConfig) => {
        const { event, handler } = eventConfig;
        additionalHandlers[event] = handler(get);
        websocketService.on(event, additionalHandlers[event]);
      });

      // S'abonner aux événements standards
      websocketService.on(`${entityNamePlural}.created`, handleCreated);
      websocketService.on(`${entityNamePlural}.updated`, handleUpdated);
      websocketService.on(`${entityNamePlural}.deleted`, handleDeleted);
      websocketService.on('entity.deleted', handleEntityDeleted);

      // Stocker les références aux gestionnaires pour le nettoyage
      set({
        listenersInitialized: true,
        eventHandlers: {
          created: handleCreated,
          updated: handleUpdated,
          deleted: handleDeleted,
          entityDeleted: handleEntityDeleted,
          ...additionalHandlers,
        },
      });
    };

    // Préparer le fetchMethod dynamiquement
    const fetchMethod = async (params = {}) => {
      set({ loading: true, error: null });
      try {
        console.log(`[${entityNameUpper}] Chargement des ${entityNamePlural}`);
        const response = await apiService.get(apiEndpoint, { params });
        const responseData = response.data.data;

        // Construire un objet pour stocker les données de manière dynamique
        const stateUpdate = {
          [statePropertyName]: responseData,
          loading: false,
          lastUpdate: Date.now(),
        };

        set(stateUpdate);
        console.log(`[${entityNameUpper}] ${entityNamePlural} chargés:`, responseData.length);
        return responseData;
      } catch (error) {
        console.error(
          `[${entityNameUpper}] Erreur lors du chargement des ${entityNamePlural}:`,
          error
        );
        set({ error: error.message, loading: false });
        throw error;
      }
    };

    // Préparer l'objet de retour dynamiquement avec les noms personnalisés
    const returnObject = {
      // État dynamique avec nom personnalisé
      [statePropertyName]: [],
      loading: false,
      error: null,
      lastUpdate: null,
      listenersInitialized: false,
      eventHandlers: {},

      // Action de chargement dynamique avec nom personnalisé
      [methodName]: fetchMethod,

      // Initialiser les écouteurs WebSocket
      initWebSocket: () => {
        setupWebSocketListeners();
      },

      // Nettoyage
      cleanup: () => {
        if (!get().listenersInitialized) return;

        console.log(`[${entityNameUpper}] Nettoyage des écouteurs WebSocket`);
        const { eventHandlers } = get();

        websocketService.off(`${entityNamePlural}.created`, eventHandlers.created);
        websocketService.off(`${entityNamePlural}.updated`, eventHandlers.updated);
        websocketService.off(`${entityNamePlural}.deleted`, eventHandlers.deleted);
        websocketService.off('entity.deleted', eventHandlers.entityDeleted);

        // Nettoyer les événements additionnels
        additionalEvents.forEach((eventConfig) => {
          const { event } = eventConfig;
          if (eventHandlers[event]) {
            websocketService.off(event, eventHandlers[event]);
          }
        });

        set({
          listenersInitialized: false,
          eventHandlers: {},
        });
      },

      // Fonction de débogage
      debugListeners: () => {
        const events = [
          `${entityNamePlural}.created`,
          `${entityNamePlural}.updated`,
          `${entityNamePlural}.deleted`,
          'entity.deleted',
          ...additionalEvents.map((e) => e.event),
        ];

        events.forEach((event) => {
          const count = websocketService.eventHandlers[event]?.length || 0;
          console.log(`[${entityNameUpper}-DEBUG] Écouteurs pour '${event}': ${count}`);
        });
      },
    };

    return returnObject;
  });
}
