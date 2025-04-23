import apiService from './api';
import imageProxyService from './imageProxyService';
import websocketService from './websocketService';

import { useProductStore } from '../features/products/stores/productStore';
import { useCategoryStore } from '../features/categories/stores/categoryStore';
import { useCategoryHierarchyStore } from '../features/categories/stores/categoryHierarchyStore';
import { useBrandStore } from '../features/brands/stores/brandStore';
import { useSupplierStore, useSupplierDataStore } from '../features/suppliers/stores/supplierStore';

/**
 * Initialise tous les services nécessaires au démarrage de l'application
 */
export async function initializeServices() {
  try {
    await apiService.init();
    const { data } = await apiService.get('/api/server-info');
    if (!data?.url) throw new Error('API URL missing');

    imageProxyService.initialize(data.url);
    const wsUrl = data.websocket || data.url.replace(/^http/, 'ws');
    websocketService.init(wsUrl);

    await waitForWebSocket(5000);
    setupWebSocketHandlers();
    await preloadData();
    return true;
  } catch (err) {
    console.error('Init failed:', err.message);
    return false;
  }
}

function waitForWebSocket(timeoutMs) {
  return new Promise((resolve) => {
    if (websocketService.isConnected) return resolve();
    const onConnect = () => {
      websocketService.off('connect', onConnect);
      resolve();
    };
    websocketService.on('connect', onConnect);
    setTimeout(resolve, timeoutMs);
  });
}

function setupWebSocketHandlers() {
  const reloadSuppliers = () => {
    const store = useSupplierDataStore.getState();
    store.fetchHierarchicalSuppliers?.();
    store.fetchSuppliers?.();
  };

  const handlers = [
    ['system.notification', () => {}],
    ['disconnect', () => {}],
    ['connect', () => preloadCriticalData()],
    ['categories.tree.changed', () => {}],
    ['suppliers.tree.changed', reloadSuppliers],
    ['products.updated', reloadSuppliers],
    ['products.created', reloadSuppliers],
    ['products.deleted', reloadSuppliers],
  ];

  handlers.forEach(([event, handler]) => {
    websocketService.on(event, handler);
  });
}

async function preloadCriticalData() {
  try {
    const store = useCategoryHierarchyStore.getState();
    store.initWebSocketListeners?.();
  } catch {}
}

async function preloadData() {
  await preloadCategoryHierarchy();
  const tasks = ['product', 'category', 'brand', 'supplier'].map(preloadEntityData);
  await Promise.allSettled(tasks);
}

async function preloadCategoryHierarchy() {
  const store = useCategoryHierarchyStore.getState();
  store.initWebSocketListeners?.();
  websocketService.subscribe('categories');
  await store.fetchItems?.();
}

async function preloadEntityData(type) {
  try {
    let storeMap = {
      product: useProductStore,
      category: useCategoryStore,
      brand: useBrandStore,
      supplier: useSupplierDataStore,
    };
    const store = storeMap[type].getState();

    (store.initWebSocket || store.initWebSocketListeners)?.();
    websocketService.subscribe(type);
    if (type === 'supplier') websocketService.subscribe('products');

    await (store.fetchItems || store.fetchSuppliers)?.();
  } catch {}
}

/**
 * Nettoie tous les gestionnaires d'événements WebSocket et stores
 */
export function cleanupServices() {
  try {
    useCategoryHierarchyStore.getState().cleanup?.();
    [useCategoryStore, useProductStore, useBrandStore, useSupplierDataStore].forEach((zStore) =>
      zStore.getState().cleanup?.()
    );
  } catch {}

  const events = [
    'system.notification',
    'disconnect',
    'connect',
    'categories.tree.changed',
    'products.updated',
    'products.created',
    'products.deleted',
  ];
  events.forEach((event) => websocketService.off(event));
  websocketService.disconnect();
}

/**
 * Vérifie le statut des services et stores
 */
export function checkServicesStatus() {
  const baseUrl = apiService.getBaseUrl();
  const ws = websocketService;

  const countListeners = () => {
    const events = [
      'categories.tree.changed',
      'categories.created',
      'categories.updated',
      'categories.deleted',
      'products.updated',
      'products.created',
      'products.deleted',
      'connect',
      'disconnect',
    ];
    return events.reduce((acc, e) => ({ ...acc, [e]: ws.eventHandlers[e]?.length || 0 }), {});
  };

  const storesStatus = () => {
    const p = useProductStore.getState();
    const c = useCategoryStore.getState();
    const h = useCategoryHierarchyStore.getState();
    const b = useBrandStore.getState();
    const s = useSupplierDataStore.getState();

    return {
      products: { loaded: p.items.length > 0, count: p.items.length },
      categories: { loaded: c.items.length > 0, count: c.items.length },
      categoryHierarchy: { loaded: h.items?.length > 0, count: h.items?.length || 0 },
      brands: { loaded: b.items.length > 0, count: b.items.length },
      suppliers: { loaded: s.suppliers?.length > 0, count: s.suppliers?.length || 0 },
    };
  };

  return {
    api: { available: !!baseUrl, baseUrl },
    websocket: {
      connected: ws.isConnected,
      reconnecting: ws.isReconnecting,
      reconnectAttempts: ws.reconnectAttempts,
      subscriptions: [...ws.subscriptions],
      listeners: countListeners(),
    },
    imageProxy: { initialized: imageProxyService.isInitialized || false },
    stores: storesStatus(),
  };
}

export default { initializeServices, cleanupServices, checkServicesStatus };
