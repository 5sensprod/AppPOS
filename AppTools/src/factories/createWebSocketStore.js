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
  const statePropertyName = dataPropertyName || entityNamePlural;
  const methodName =
    fetchMethodName ||
    `fetch${entityNamePlural.charAt(0).toUpperCase()}${entityNamePlural.slice(1)}`;

  return create((set, get) => {
    const createHandler = () => () => {
      get()[methodName]();
    };

    const extractDeletedId = (data) =>
      data?.entityId || data?.id || (typeof data === 'string' ? data : null);

    const setupWebSocketListeners = () => {
      if (get().listenersInitialized) return;

      additionalChannels
        .concat(entityNamePlural)
        .forEach((channel) => websocketService.subscribe(channel));

      const handlers = {
        created: createHandler(),
        updated: createHandler(),
        deleted: (data) => {
          const id = extractDeletedId(data);
          get()[methodName]();
        },
        entityDeleted: (data) => {
          if (data?.entityType === entityNamePlural) {
            get()[methodName]();
          }
        },
        ...Object.fromEntries(additionalEvents.map(({ event, handler }) => [event, handler(get)])),
      };

      Object.entries(handlers).forEach(([eventKey, handler]) => {
        const eventName = eventKey.startsWith(entityNamePlural)
          ? eventKey
          : ['created', 'updated', 'deleted'].includes(eventKey)
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
        const res = await apiService.get(apiEndpoint, { params });
        const data = res.data.data;
        set({
          [statePropertyName]: data,
          loading: false,
          lastUpdate: Date.now(),
        });
        return data;
      } catch (err) {
        set({ error: err.message, loading: false });
        throw err;
      }
    };

    const cleanup = () => {
      if (!get().listenersInitialized) return;

      const { eventHandlers } = get();
      Object.entries(eventHandlers).forEach(([eventKey, handler]) => {
        const eventName = eventKey.startsWith(entityNamePlural)
          ? eventKey
          : ['created', 'updated', 'deleted'].includes(eventKey)
            ? `${entityNamePlural}.${eventKey}`
            : eventKey;
        websocketService.off(eventName, handler);
      });

      set({ listenersInitialized: false, eventHandlers: {} });
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
      ...initialState,
      ...customMethods(set, get),
    };
  });
}
