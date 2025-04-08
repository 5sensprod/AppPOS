// services/gemini/index.js
const GeminiDirectService = require('./GeminiDirectService');

// Créer une instance singleton du service Gemini
const geminiServiceInstance = new GeminiDirectService();

/**
 * Service Gemini exporté avec une interface simplifiée pour les routes
 */
module.exports = {
  /**
   * Génère une description de produit
   * @param {Object} productData Données du produit
   * @param {string} imagePath Chemin optionnel vers l'image du produit
   * @returns {Promise<Object>} Résultat de la génération
   */
  generateProductDescription: async (productData, imagePath) => {
    return geminiServiceInstance.generateProductDescription(productData, imagePath);
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
    return geminiServiceInstance.generateChatResponse(
      productData,
      userMessage,
      conversation,
      filePaths
    );
  },

  // Pour accéder directement à l'instance du service si nécessaire
  service: geminiServiceInstance,
};
