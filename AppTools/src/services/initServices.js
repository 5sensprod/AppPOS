// src/services/initServices.js
import apiService from './api';
import imageProxyService from './imageProxyService';
import websocketService from './websocketService';

// Importer les stores Zustand
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
    // Initialiser l'API et récupérer les informations du serveur
    await apiService.init();

    // Récupérer les informations du serveur
    const { data } = await apiService.get('/api/server-info');
    if (!data?.url) {
      throw new Error("L'URL de l'API est introuvable");
    }

    // Initialiser le service d'images
    imageProxyService.initialize(data.url);

    // Initialiser WebSocket avec l'URL fournie ou générée
    const wsUrl = data.websocket ?? data.url.replace(/^http/, 'ws');
    websocketService.init(wsUrl);

    // Attendre que la connexion WebSocket soit établie
    await new Promise((resolve) => {
      if (websocketService.isConnected) {
        resolve();
      } else {
        const checkConnection = () => {
          if (websocketService.isConnected) {
            websocketService.off('connect', checkConnection);
            resolve();
          }
        };
        websocketService.on('connect', checkConnection);
        // Timeout après 5 secondes
        setTimeout(() => resolve(), 5000);
      }
    });

    // Configurer les gestionnaires d'événements WebSocket globaux
    setupGlobalWebSocketEventHandlers();

    // Pré-charger les données essentielles
    await preloadEssentialData();

    console.log('✅ Services initialisés avec succès');
    // Afficher l'état des écouteurs WebSocket pour débogage
    websocketService.listAllListeners();

    return true;
  } catch (error) {
    console.error("🚫 Échec de l'initialisation des services:", error.message);
    return false;
  }
}

/**
 * Configure les gestionnaires d'événements globaux pour WebSocket
 */
function setupGlobalWebSocketEventHandlers() {
  // Exemple de gestionnaire global pour les notifications système
  websocketService.on('system.notification', (data) => {
    console.log('📢 Notification système reçue:', data);
  });

  // Gestionnaire pour les déconnexions inattendues
  websocketService.on('disconnect', () => {
    console.warn('⚠️ WebSocket déconnecté');
  });

  // Gestionnaire pour les reconnexions réussies
  websocketService.on('connect', () => {
    console.log('✅ WebSocket reconnecté');
    // Force le rafraîchissement des données critiques après reconnexion
    preloadCriticalData();
  });

  // Gestionnaire global pour les changements dans l'arborescence des catégories
  websocketService.on('categories.tree.changed', (data) => {
    console.log('🌳 Arborescence des catégories modifiée, notification globale reçue');
  });

  // Abonnement aux événements produits pour les compteurs
  websocketService.on('products.updated', (data) => {
    console.log('📦 Produit mis à jour, vérification des compteurs');
    // On peut forcer un rafraîchissement des données fournisseurs ici
    const supplierStore = useSupplierDataStore.getState();
    if (supplierStore.fetchSuppliers) {
      supplierStore.fetchSuppliers();
    }
  });

  // Abonnement aux événements de création de produits
  websocketService.on('products.created', (data) => {
    console.log('📦 Nouveau produit créé, mise à jour des compteurs');
    const supplierStore = useSupplierDataStore.getState();
    if (supplierStore.fetchSuppliers) {
      supplierStore.fetchSuppliers();
    }
  });

  // Abonnement aux événements de suppression de produits
  websocketService.on('products.deleted', (data) => {
    console.log('📦 Produit supprimé, mise à jour des compteurs');
    const supplierStore = useSupplierDataStore.getState();
    if (supplierStore.fetchSuppliers) {
      supplierStore.fetchSuppliers();
    }
  });
}

/**
 * Précharge uniquement les données critiques après une reconnexion
 */
async function preloadCriticalData() {
  try {
    // Priorité à la hiérarchie des catégories qui est souvent utilisée dans l'interface
    const hierarchyStore = useCategoryHierarchyStore.getState();
    if (hierarchyStore.initWebSocketListeners) {
      hierarchyStore.initWebSocketListeners();
    }
    console.log('🔄 Données critiques rechargées après reconnexion');
  } catch (error) {
    console.error('❌ Erreur lors du rechargement des données critiques:', error);
  }
}

/**
 * Précharge les données essentielles pour l'application
 */
async function preloadEssentialData() {
  console.log('🚀 Démarrage du préchargement des données essentielles');

  // Priorité à la hiérarchie des catégories (chargée en premier)
  try {
    await preloadCategoryHierarchy();
    console.log('✅ Hiérarchie des catégories préchargée avec succès');
  } catch (error) {
    console.warn('⚠️ Échec du préchargement de la hiérarchie des catégories:', error);
  }

  // Puis charger le reste des données en parallèle
  const preloadResults = await Promise.allSettled([
    preloadEntityData('product'),
    preloadEntityData('category'),
    preloadEntityData('brand'),
    preloadEntityData('supplier'),
  ]);

  // Vérifier les résultats
  const entities = ['products', 'categories', 'brands', 'suppliers'];
  preloadResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`⚠️ Échec du préchargement des ${entities[index]}:`, result.reason);
    } else {
      console.log(`✅ ${entities[index]} préchargés avec succès`);
    }
  });
}

/**
 * Précharge la hiérarchie des catégories
 */
async function preloadCategoryHierarchy() {
  try {
    // Accéder au store hiérarchique
    const hierarchyStore = useCategoryHierarchyStore.getState();
    console.log('🌳 Initialisation du store de hiérarchie des catégories');

    // Initialiser les écouteurs WebSocket
    if (hierarchyStore.initWebSocketListeners) {
      hierarchyStore.initWebSocketListeners();
      console.log('🌳 Écouteurs WebSocket initialisés pour la hiérarchie des catégories');
    } else {
      console.warn('⚠️ Méthode initWebSocketListeners non trouvée dans le store');
    }

    // S'assurer d'être abonné explicitement au canal
    websocketService.subscribe('categories');

    // Précharger les données hiérarchiques
    if (hierarchyStore.fetchItems) {
      await hierarchyStore.fetchItems();
      console.log('🌳 Données hiérarchiques chargées avec succès');
    } else {
      console.warn('⚠️ Méthode fetchItems non trouvée dans le store');
    }

    return true;
  } catch (error) {
    console.error('❌ Échec du préchargement de la hiérarchie des catégories:', error);
    throw error;
  }
}

/**
 * Précharge les données d'une entité spécifique
 * @param {string} entityType - Type d'entité (product, category, brand, supplier)
 */
async function preloadEntityData(entityType) {
  try {
    let store;
    switch (entityType) {
      case 'product':
        store = useProductStore.getState();
        break;
      case 'category':
        store = useCategoryStore.getState();
        break;
      case 'brand':
        store = useBrandStore.getState();
        break;
      case 'supplier':
        // Utiliser le dataStore avec WebSocket pour les fournisseurs
        store = useSupplierDataStore.getState();
        break;
      default:
        console.warn(`Type d'entité inconnu pour le préchargement: ${entityType}`);
        return;
    }

    // Initialiser les écouteurs WebSocket si la méthode existe
    if (store.initWebSocket) {
      store.initWebSocket();
      console.log(`✓ Écouteurs WebSocket initialisés pour ${entityType}`);
    } else if (store.initWebSocketListeners) {
      store.initWebSocketListeners();
      console.log(`✓ Écouteurs WebSocket initialisés pour ${entityType}`);
    }

    // S'assurer d'être abonné au canal
    websocketService.subscribe(entityType);

    // Pour les fournisseurs, s'abonner aussi aux événements produits
    if (entityType === 'supplier') {
      websocketService.subscribe('products');
    }

    // Charger les données
    if (store.fetchItems) {
      await store.fetchItems();
      console.log(`✓ Données ${entityType} chargées`);
      return true;
    } else if (store.fetchSuppliers) {
      await store.fetchSuppliers();
      console.log(`✓ Données ${entityType} chargées`);
      return true;
    } else {
      console.warn(`⚠️ Méthode de chargement non trouvée pour ${entityType}`);
    }
  } catch (error) {
    console.error(`❌ Échec du préchargement des données ${entityType}:`, error);
    throw error;
  }
}

/**
 * Nettoie tous les gestionnaires d'événements WebSocket
 */
export function cleanupServices() {
  // Nettoyer les stores spécifiques
  try {
    // Nettoyage du store de hiérarchie des catégories
    const hierarchyStore = useCategoryHierarchyStore.getState();
    if (hierarchyStore.cleanup) {
      hierarchyStore.cleanup();
      console.log('✓ Store de hiérarchie des catégories nettoyé');
    }

    // Nettoyage des autres stores si nécessaire
    const stores = [
      { name: 'category', store: useCategoryStore.getState() },
      { name: 'product', store: useProductStore.getState() },
      { name: 'brand', store: useBrandStore.getState() },
      { name: 'supplier', store: useSupplierDataStore.getState() },
    ];

    stores.forEach(({ name, store }) => {
      if (store.cleanup) {
        store.cleanup();
        console.log(`✓ Store ${name} nettoyé`);
      }
    });
  } catch (error) {
    console.warn('⚠️ Erreur lors du nettoyage des stores:', error);
  }

  // Nettoyer les gestionnaires d'événements globaux
  websocketService.off('system.notification');
  websocketService.off('disconnect');
  websocketService.off('connect');
  websocketService.off('categories.tree.changed');
  websocketService.off('products.updated');
  websocketService.off('products.created');
  websocketService.off('products.deleted');

  // Déconnecter le WebSocket proprement
  websocketService.disconnect();

  console.log('🧹 Services nettoyés avec succès');
}

/**
 * Vérifie si les services sont connectés et fonctionnels
 */
export function checkServicesStatus() {
  // Obtenir des informations sur les écouteurs WebSocket
  let websocketListeners = {};
  try {
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
    events.forEach((event) => {
      websocketListeners[event] = websocketService.eventHandlers[event]?.length || 0;
    });
  } catch (e) {
    websocketListeners = { error: e.message };
  }

  return {
    api: {
      available: !!apiService.getBaseUrl(),
      baseUrl: apiService.getBaseUrl(),
    },
    websocket: {
      connected: websocketService.isConnected,
      reconnecting: websocketService.isReconnecting,
      reconnectAttempts: websocketService.reconnectAttempts,
      subscriptions: [...websocketService.subscriptions],
      listeners: websocketListeners,
    },
    imageProxy: {
      initialized: imageProxyService.isInitialized ?? false,
    },
    stores: {
      products: {
        loaded: useProductStore.getState().items.length > 0,
        count: useProductStore.getState().items.length,
      },
      categories: {
        loaded: useCategoryStore.getState().items.length > 0,
        count: useCategoryStore.getState().items.length,
      },
      categoryHierarchy: {
        loaded: useCategoryHierarchyStore.getState().items?.length > 0,
        count: useCategoryHierarchyStore.getState().items?.length || 0,
        listenersInitialized: useCategoryHierarchyStore.getState().listenersInitialized || false,
      },
      brands: {
        loaded: useBrandStore.getState().items.length > 0,
        count: useBrandStore.getState().items.length,
      },
      suppliers: {
        loaded: useSupplierDataStore.getState().suppliers?.length > 0,
        count: useSupplierDataStore.getState().suppliers?.length || 0,
      },
    },
  };
}

export default {
  initializeServices,
  cleanupServices,
  checkServicesStatus,
};
