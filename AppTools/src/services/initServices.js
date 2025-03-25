// src/services/initServices.js
import apiService from './api';
import imageProxyService from './imageProxyService';
import websocketService from './websocketService';

// Importer les stores Zustand
import { useProductStore } from '../features/products/stores/productStore';
import { useCategoryStore } from '../features/categories/stores/categoryStore';
import { useBrandStore } from '../features/brands/stores/brandStore';
import { useSupplierStore } from '../features/suppliers/stores/supplierStore';

/**
 * Initialise tous les services nécessaires au démarrage de l'application
 * @returns {Promise<boolean>} - true si l'initialisation a réussi, false sinon
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

    // Configuration des gestionnaires d'événements WebSocket globaux
    setupGlobalWebSocketEventHandlers();

    // Pré-charger les données essentielles
    await preloadEssentialData();

    console.log('✅ Services initialisés avec succès');
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
    // Vous pourriez appeler une fonction pour afficher une notification ici
  });

  // Gestionnaire pour les déconnexions inattendues
  websocketService.on('disconnect', () => {
    console.warn('⚠️ WebSocket déconnecté');
    // Vous pourriez afficher un indicateur de connexion perdue
  });

  // Gestionnaire pour les reconnexions réussies
  websocketService.on('connect', () => {
    console.log('✅ WebSocket reconnecté');
    // Vous pourriez rafraîchir certaines données ici
  });
}

/**
 * Précharge les données essentielles pour l'application
 * @returns {Promise<void>}
 */
async function preloadEssentialData() {
  // On utilise Promise.allSettled pour éviter que les erreurs ne se propagent
  const preloadResults = await Promise.allSettled([
    preloadEntityData('product'),
    preloadEntityData('category'),
    preloadEntityData('brand'),
    preloadEntityData('supplier'),
  ]);

  // Vérifier les résultats
  preloadResults.forEach((result, index) => {
    const entities = ['products', 'categories', 'brands', 'suppliers'];
    if (result.status === 'rejected') {
      console.warn(`⚠️ Échec du préchargement des ${entities[index]}:`, result.reason);
    } else {
      console.log(`✅ ${entities[index]} préchargés avec succès`);
    }
  });
}

/**
 * Précharge les données d'une entité spécifique
 * @param {string} entityType - Type d'entité (product, category, brand, supplier)
 * @returns {Promise<void>}
 */
async function preloadEntityData(entityType) {
  try {
    let fetchFunction;
    switch (entityType) {
      case 'product':
        fetchFunction = useProductStore.getState().fetchItems;
        break;
      case 'category':
        fetchFunction = useCategoryStore.getState().fetchItems;
        break;
      case 'brand':
        fetchFunction = useBrandStore.getState().fetchItems;
        break;
      case 'supplier':
        fetchFunction = useSupplierStore.getState().fetchItems;
        break;
      default:
        console.warn(`Type d'entité inconnu pour le préchargement: ${entityType}`);
        return;
    }

    await fetchFunction();
  } catch (error) {
    console.error(`❌ Échec du préchargement des données ${entityType}:`, error);
    throw error;
  }
}

/**
 * Nettoie tous les gestionnaires d'événements WebSocket
 * À appeler lors de la déconnexion de l'application
 */
export function cleanupServices() {
  // Nettoyer les gestionnaires d'événements globaux
  websocketService.off('system.notification');
  websocketService.off('disconnect');
  websocketService.off('connect');

  // Déconnecter le WebSocket proprement
  websocketService.disconnect();

  console.log('🧹 Services nettoyés avec succès');
}

/**
 * Vérifie si les services sont connectés et fonctionnels
 * Utile pour les diagnostics
 * @returns {Object} - État des différents services
 */
export function checkServicesStatus() {
  return {
    api: {
      available: !!apiService.getBaseUrl(),
      baseUrl: apiService.getBaseUrl(),
    },
    websocket: {
      connected: websocketService.isConnected,
      reconnecting: websocketService.isReconnecting,
      reconnectAttempts: websocketService.reconnectAttempts,
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
      brands: {
        loaded: useBrandStore.getState().items.length > 0,
        count: useBrandStore.getState().items.length,
      },
      suppliers: {
        loaded: useSupplierStore.getState().items.length > 0,
        count: useSupplierStore.getState().items.length,
      },
    },
  };
}
