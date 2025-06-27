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
    // ✅ HANDLERS OPTIMISÉS avec validation ID

    const handleCreated = (data) => {
      console.log(`🆕 [WS] ${entityNamePlural}.created:`, data?._id);

      // ✅ Validation de l'ID
      if (!data?._id) {
        console.warn(`⚠️ [WS] Données de création invalides (pas d'_id):`, data);
        return;
      }

      const current = get()[statePropertyName] || [];
      const exists = current.some((item) => item._id === data._id);

      if (!exists) {
        set({
          [statePropertyName]: [...current, data],
          lastUpdate: Date.now(),
        });
      } else {
        console.log(`ℹ️ [WS] Item ${data._id} existe déjà, pas d'ajout`);
      }
    };

    const handleUpdated = (data) => {
      console.log(`📝 [WS] ${entityNamePlural}.updated:`, data?._id);

      // ✅ Validation de l'ID
      if (!data?._id) {
        console.warn(`⚠️ [WS] Données de mise à jour invalides (pas d'_id):`, data);
        return;
      }

      const current = get()[statePropertyName] || [];
      const index = current.findIndex((item) => item._id === data._id);

      if (index >= 0) {
        // Merger les données sans refetch
        const updated = [...current];
        updated[index] = { ...updated[index], ...data };

        set({
          [statePropertyName]: updated,
          lastUpdate: Date.now(),
        });
      } else {
        // L'item n'existe pas localement, on le fetch individuellement
        console.log(`⚠️ [WS] Item ${data._id} non trouvé localement, fetch individuel`);
        fetchSingleItem(data._id);
      }
    };

    const handleDeleted = (data) => {
      const id = extractDeletedId(data);
      console.log(`🗑️ [WS] ${entityNamePlural}.deleted:`, id);

      if (id) {
        const current = get()[statePropertyName] || [];
        const filtered = current.filter((item) => item._id !== id);

        set({
          [statePropertyName]: filtered,
          lastUpdate: Date.now(),
        });
      } else {
        console.warn(`⚠️ [WS] ID non trouvé dans les données de suppression:`, data);
      }
    };

    const handleEntityDeleted = (data) => {
      if (data?.entityType === entityNamePlural) {
        console.log(`🗑️ [WS] entityDeleted pour ${entityNamePlural}`);
        handleDeleted(data);
      }
    };

    // ✅ Fetch d'un item individuel avec validation ID
    const fetchSingleItem = async (id) => {
      // ✅ Validation de l'ID avant la requête
      if (!id || id === 'undefined' || id === 'null') {
        console.error(`❌ [WS] fetchSingleItem: ID invalide "${id}"`);
        return null;
      }

      try {
        const res = await apiService.get(`${apiEndpoint}/${id}`);
        const item = res.data.data;

        // ✅ Validation de la réponse
        if (!item?._id) {
          console.warn(`⚠️ [WS] fetchSingleItem: Réponse invalide pour ID ${id}:`, item);
          return null;
        }

        const current = get()[statePropertyName] || [];
        const exists = current.some((i) => i._id === item._id);

        if (exists) {
          // Mettre à jour l'item existant
          const updated = current.map((i) => (i._id === item._id ? item : i));
          set({ [statePropertyName]: updated });
        } else {
          // Ajouter le nouvel item
          set({ [statePropertyName]: [...current, item] });
        }

        return item;
      } catch (err) {
        console.error(`❌ [WS] Erreur fetch individuel ${id}:`, err);
        throw err;
      }
    };

    // ✅ Extraction d'ID plus robuste
    const extractDeletedId = (data) => {
      const id = data?.entityId || data?.id || (typeof data === 'string' ? data : null);

      // Validation supplémentaire
      if (!id || id === 'undefined' || id === 'null') {
        console.warn(`⚠️ [WS] extractDeletedId: ID invalide extraite:`, data);
        return null;
      }

      return id;
    };

    const setupWebSocketListeners = () => {
      if (get().listenersInitialized) return;

      additionalChannels
        .concat(entityNamePlural)
        .forEach((channel) => websocketService.subscribe(channel));

      // ✅ HANDLERS OPTIMISÉS avec validation
      const handlers = {
        created: handleCreated,
        updated: handleUpdated,
        deleted: handleDeleted,
        entityDeleted: handleEntityDeleted,
        ...Object.fromEntries(additionalEvents.map(({ event, handler }) => [event, handler(get)])),
      };

      Object.entries(handlers).forEach(([eventKey, handler]) => {
        const eventName = eventKey.startsWith(entityNamePlural)
          ? eventKey
          : ['created', 'updated', 'deleted'].includes(eventKey)
            ? `${entityNamePlural}.${eventKey}`
            : eventKey;

        websocketService.on(eventName, handler);
        console.log(`✅ [WS] Listener configuré: ${eventName}`);
      });

      set({
        listenersInitialized: true,
        eventHandlers: handlers,
      });

      console.log(`🚀 [WS] ${entityNamePlural} listeners initialisés (mode optimisé)`);
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
        console.log(`✅ [${entityNamePlural}] Fetch complet: ${data?.length || 0} items`);
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
      console.log(`🧹 [WS] ${entityNamePlural} listeners nettoyés`);
    };

    // ✅ Méthode pour forcer un refetch si nécessaire
    const forceRefresh = () => {
      console.log(`🔄 [${entityNamePlural}] Force refresh demandé`);
      return fetchMethod();
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

      // ✅ Nouvelles méthodes utiles
      fetchSingleItem,
      forceRefresh,

      ...initialState,
      ...customMethods(set, get),
    };
  });
}
