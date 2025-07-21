// services/ai/AIServiceFactory.js - ADAPTÉ à votre structure
const HuggingFaceService = require('../huggingface/HuggingFaceService');

/**
 * Factory pour gérer les différents services IA
 */
class AIServiceFactory {
  constructor() {
    this.services = new Map();
    this.currentProvider = process.env.AI_PROVIDER || 'gemini';

    // Initialiser les services
    this._initializeServices();
  }

  /**
   * Initialise tous les services disponibles
   */
  _initializeServices() {
    try {
      // Gemini service - Utiliser la classe directement depuis le fichier
      if (process.env.GEMINI_API_KEY) {
        try {
          // Essayer plusieurs chemins possibles
          let GeminiService;

          try {
            GeminiService = require('../GeminiDescriptionService');
          } catch (e1) {
            try {
              GeminiService = require('../../GeminiDescriptionService');
            } catch (e2) {
              try {
                GeminiService = require('../gemini/GeminiDescriptionService');
              } catch (e3) {
                console.warn(
                  '❌ Impossible de trouver GeminiDescriptionService, utilisation du service existant'
                );
                // Fallback : créer un wrapper du service existant
                GeminiService = this._createGeminiWrapper();
              }
            }
          }

          if (GeminiService) {
            this.services.set('gemini', new GeminiService());
            console.log('✅ Service Gemini initialisé');
          }
        } catch (error) {
          console.warn('⚠️ Erreur initialisation Gemini:', error.message);
          // Utiliser un wrapper du service existant
          const geminiWrapper = this._createGeminiWrapper();
          if (geminiWrapper) {
            this.services.set('gemini', geminiWrapper);
            console.log('✅ Service Gemini initialisé (wrapper)');
          }
        }
      }

      // HuggingFace service
      if (process.env.HUGGINGFACE_API_KEY) {
        this.services.set('huggingface', new HuggingFaceService());
        console.log('✅ Service HuggingFace initialisé');
      }

      // Vérifier qu'au moins un service est disponible
      if (this.services.size === 0) {
        throw new Error('Aucun service IA configuré. Vérifiez vos clés API.');
      }

      // Vérifier que le provider par défaut est disponible
      if (!this.services.has(this.currentProvider)) {
        const availableProviders = Array.from(this.services.keys());
        this.currentProvider = availableProviders[0];
        console.warn(
          `🔄 Provider par défaut non disponible, basculement vers: ${this.currentProvider}`
        );
      }
    } catch (error) {
      console.error('❌ Erreur initialisation services IA:', error);
      throw error;
    }
  }

  /**
   * Crée un wrapper du service Gemini existant
   */
  _createGeminiWrapper() {
    try {
      // Importer le service Gemini existant
      const existingGeminiService = require('../gemini');

      // Créer un wrapper qui a la même interface
      return {
        generateProductDescription: async (productData, imagePath) => {
          return existingGeminiService.generateProductDescription(productData, imagePath);
        },
        generateChatResponse: async (productData, userMessage, conversation, filePaths) => {
          return existingGeminiService.generateChatResponse(
            productData,
            userMessage,
            conversation,
            filePaths
          );
        },
        generateProductTitle: async (productData, imagePath) => {
          return existingGeminiService.generateProductTitle(productData, imagePath);
        },
      };
    } catch (error) {
      console.error('❌ Impossible de créer wrapper Gemini:', error);
      return null;
    }
  }

  /**
   * Obtient le service actuellement configuré
   */
  getCurrentService() {
    const service = this.services.get(this.currentProvider);
    if (!service) {
      throw new Error(`Service ${this.currentProvider} non disponible`);
    }
    return service;
  }

  /**
   * Change le provider IA en cours d'utilisation
   * @param {string} provider - 'gemini' ou 'huggingface'
   */
  setProvider(provider) {
    if (!this.services.has(provider)) {
      throw new Error(
        `Provider ${provider} non disponible. Providers disponibles: ${Array.from(this.services.keys()).join(', ')}`
      );
    }

    const oldProvider = this.currentProvider;
    this.currentProvider = provider;

    console.log(`🔄 Basculement du provider IA: ${oldProvider} → ${provider}`);
    return this;
  }

  /**
   * Obtient la liste des providers disponibles
   */
  getAvailableProviders() {
    return Array.from(this.services.keys());
  }

  /**
   * Obtient le provider actuellement utilisé
   */
  getCurrentProvider() {
    return this.currentProvider;
  }

  /**
   * Teste la disponibilité d'un service
   */
  async testService(provider) {
    const service = this.services.get(provider);
    if (!service) {
      return { available: false, error: 'Service non configuré' };
    }

    try {
      // Test simple avec des données minimales
      const testData = {
        name: 'Test Product',
        category: 'Test',
        brand: 'Test Brand',
      };

      const result = await service.generateProductDescription(testData, null);

      return {
        available: true,
        provider: provider,
        response: 'Service fonctionnel',
      };
    } catch (error) {
      return {
        available: false,
        provider: provider,
        error: error.message,
      };
    }
  }

  /**
   * Basculement automatique en cas d'erreur
   */
  async executeWithFallback(method, ...args) {
    const originalProvider = this.currentProvider;

    for (const provider of this.getAvailableProviders()) {
      try {
        this.setProvider(provider);
        const service = this.getCurrentService();

        if (typeof service[method] === 'function') {
          const result = await service[method](...args);

          // Si succès avec un provider différent, le garder
          if (provider !== originalProvider) {
            console.log(`✅ Succès avec fallback provider: ${provider}`);
          }

          return result;
        }
      } catch (error) {
        console.warn(`❌ Échec avec provider ${provider}:`, error.message);
        continue;
      }
    }

    // Remettre le provider original
    this.setProvider(originalProvider);
    throw new Error('Tous les services IA ont échoué');
  }

  /**
   * Interface unifiée pour génération de description
   */
  async generateProductDescription(productData, imagePath) {
    return this.executeWithFallback('generateProductDescription', productData, imagePath);
  }

  /**
   * Interface unifiée pour chat
   */
  async generateChatResponse(productData, userMessage, conversation, filePaths) {
    return this.executeWithFallback(
      'generateChatResponse',
      productData,
      userMessage,
      conversation,
      filePaths
    );
  }

  /**
   * Interface unifiée pour génération de titre
   */
  async generateProductTitle(productData, imagePath) {
    return this.executeWithFallback('generateProductTitle', productData, imagePath);
  }
}

// Singleton pour éviter les réinitialisations
let aiServiceFactoryInstance = null;

module.exports = {
  /**
   * Obtient l'instance singleton du factory
   */
  getInstance: () => {
    if (!aiServiceFactoryInstance) {
      aiServiceFactoryInstance = new AIServiceFactory();
    }
    return aiServiceFactoryInstance;
  },

  /**
   * Réinitialise le factory (utile pour les tests)
   */
  resetInstance: () => {
    aiServiceFactoryInstance = null;
  },
};
