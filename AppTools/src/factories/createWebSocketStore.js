//AppTools\src\factories\createWebSocketStore.js
import { create } from 'zustand';
import websocketService from '../services/websocketService';

export function createWebSocketStore(options) {
  const {
    entityName,
    apiEndpoint,
    dataPropertyName,
    fetchMethodName,
    additionalChannels = [],
    additionalEvents = [],
    apiService,
    initialState = {},
    customMethods = () => ({}),
  } = options;

  const entityNameLower = entityName.toLowerCase();
  const entityNamePlural = `${entityNameLower}s`;
  const entityNameUpper = entityNameLower.toUpperCase();

  const statePropertyName = dataPropertyName || entityNamePlural;
  const methodName =
    fetchMethodName ||
    `fetch${entityNamePlural.charAt(0).toUpperCase()}${entityNamePlural.slice(1)}`;

  return create((set, get) => {
    const log = (...args) => console.log(`[${entityNameUpper}]`, ...args);

    const createHandler = (eventType) => (data) => {
      log(`Événement ${eventType} reçu`, data);
      get()[methodName]();
    };

    const extractDeletedId = (data) =>
      data?.entityId || data?.id || (typeof data === 'string' ? data : null);

    const setupWebSocketListeners = () => {
      if (get().listenersInitialized) return;
      log('Initialisation des écouteurs WebSocket');

      [entityNamePlural, ...additionalChannels].forEach((channel) =>
        websocketService.subscribe(channel)
      );

      const handlers = {
        created: createHandler(`${entityNamePlural}.created`),
        updated: createHandler(`${entityNamePlural}.updated`),
        deleted: (data) => {
          const id = extractDeletedId(data);
          log(`Événement ${entityNamePlural}.deleted reçu ✨ → ID supprimé :`, id);
          get()[methodName]();
        },
        entityDeleted: (data) => {
          if (data?.entityType === entityNamePlural) {
            log(`Événement entity.deleted pour ${entityNamePlural} reçu ✨`, data);
            get()[methodName]();
          }
        },
        ...Object.fromEntries(additionalEvents.map(({ event, handler }) => [event, handler(get)])),
      };

      Object.entries(handlers).forEach(([eventKey, handler]) => {
        const eventName = eventKey.startsWith(entityNamePlural)
          ? eventKey
          : eventKey === 'created' || eventKey === 'updated' || eventKey === 'deleted'
            ? `${entityNamePlural}.${eventKey}`
            : eventKey;

        websocketService.on(eventName, handler);
      });

      set({
        listenersInitialized: true,
        eventHandlers: handlers,
      });
    };

    const fetchMethod = async (params = {}) => {
      set({ loading: true, error: null });
      try {
        log(`Chargement des ${entityNamePlural}...`);
        const res = await apiService.get(apiEndpoint, { params });
        const data = res.data.data;
        set({
          [statePropertyName]: data,
          loading: false,
          lastUpdate: Date.now(),
        });
        log(`${entityNamePlural} chargés:`, data.length);
        return data;
      } catch (err) {
        log(`Erreur de chargement des ${entityNamePlural}:`, err);
        set({ error: err.message, loading: false });
        throw err;
      }
    };

    const cleanup = () => {
      if (!get().listenersInitialized) return;

      log('Nettoyage des écouteurs WebSocket');
      const { eventHandlers } = get();

      Object.entries(eventHandlers).forEach(([eventKey, handler]) => {
        const eventName = eventKey.startsWith(entityNamePlural)
          ? eventKey
          : eventKey === 'created' || eventKey === 'updated' || eventKey === 'deleted'
            ? `${entityNamePlural}.${eventKey}`
            : eventKey;

        websocketService.off(eventName, handler);
      });

      set({ listenersInitialized: false, eventHandlers: {} });
    };

    const debugListeners = () => {
      const events = [
        'created',
        'updated',
        'deleted',
        'entity.deleted',
        ...additionalEvents.map((e) => e.event),
      ].map((e) =>
        ['created', 'updated', 'deleted'].includes(e) ? `${entityNamePlural}.${e}` : e
      );

      events.forEach((event) => {
        const count = websocketService.eventHandlers[event]?.length || 0;
        console.log(`[${entityNameUpper}-DEBUG] Écouteurs pour '${event}': ${count}`);
      });
    };

    return {
      [statePropertyName]: [],
      [methodName]: fetchMethod,
      loading: false,
      error: null,
      lastUpdate: null,
      listenersInitialized: false,
      eventHandlers: {},
      initWebSocket: setupWebSocketListeners,
      cleanup,
      debugListeners,
      ...initialState,
      ...customMethods(set, get),
    };
  });
}
