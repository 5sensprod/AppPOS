// services/gemini/index.js - ADAPTÉ à votre structure existante
const { getInstance } = require('../ai/AIServiceFactory');

// Obtenir l'instance du factory IA
const aiServiceFactory = getInstance();

/**
 * Service unifié exporté avec fallback automatique entre providers
 * Interface compatible avec l'ancien service Gemini
 */
module.exports = {
  /**
   * Génère une description de produit avec fallback automatique
   * @param {Object} productData Données du produit
   * @param {string} imagePath Chemin optionnel vers l'image du produit
   * @returns {Promise<Object>} Résultat de la génération
   */
  generateProductDescription: async (productData, imagePath) => {
    return aiServiceFactory.generateProductDescription(productData, imagePath);
  },

  /**
   * Génère une réponse de chat avec contexte de conversation
   * @param {Object} productData Données du produit
   * @param {string} userMessage Message de l'utilisateur
   * @param {Array} conversation Historique des messages
   * @param {Array} filePaths Chemins des fichiers téléchargés
   * @returns {Promise<Object>} Résultat de la génération
   */
  generateChatResponse: async (productData, userMessage, conversation, filePaths) => {
    return aiServiceFactory.generateChatResponse(productData, userMessage, conversation, filePaths);
  },

  /**
   * Génère uniquement un titre pour un produit
   * @param {Object} productData Données du produit
   * @param {string} imagePath Chemin optionnel vers l'image du produit
   * @returns {Promise<Object>} Résultat de la génération contenant le titre
   */
  generateProductTitle: async (productData, imagePath) => {
    return aiServiceFactory.generateProductTitle(productData, imagePath);
  },

  /**
   * Nouvelles fonctionnalités pour gérer les providers IA
   */
  ai: {
    /**
     * Change le provider IA utilisé
     * @param {string} provider - 'gemini' ou 'huggingface'
     */
    setProvider: (provider) => {
      return aiServiceFactory.setProvider(provider);
    },

    /**
     * Obtient le provider actuellement utilisé
     */
    getCurrentProvider: () => {
      return aiServiceFactory.getCurrentProvider();
    },

    /**
     * Obtient la liste des providers disponibles
     */
    getAvailableProviders: () => {
      return aiServiceFactory.getAvailableProviders();
    },

    /**
     * Teste la disponibilité d'un service
     * @param {string} provider Provider à tester
     */
    testService: (provider) => {
      return aiServiceFactory.testService(provider);
    },

    /**
     * Teste tous les services disponibles
     */
    testAllServices: async () => {
      const providers = aiServiceFactory.getAvailableProviders();
      const results = {};

      for (const provider of providers) {
        results[provider] = await aiServiceFactory.testService(provider);
      }

      return results;
    },
  },

  // Pour accéder directement au factory si nécessaire (rétrocompatibilité)
  service: aiServiceFactory,
  factory: aiServiceFactory,
};
