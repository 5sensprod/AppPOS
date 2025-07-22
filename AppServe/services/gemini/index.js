// services/gemini/index.js - Version nettoyée
const GeminiDirectService = require('./GeminiDirectService');

// Instance singleton du service Gemini
const geminiServiceInstance = new GeminiDirectService();

/**
 * Service Gemini simplifié - Seulement les méthodes utilisées
 */
module.exports = {
  /**
   * Génère une réponse de chat avec contexte de conversation
   * Utilisée par: ProductDescription.jsx
   */
  generateChatResponse: async (productData, userMessage, conversation, filePaths) => {
    return geminiServiceInstance.generateChatResponse(
      productData,
      userMessage,
      conversation,
      filePaths
    );
  },

  /**
   * Génère uniquement un titre pour un produit
   * Utilisée par: WooCommerceTab.jsx
   */
  generateProductTitle: async (productData, imagePath) => {
    return geminiServiceInstance.generateProductTitle(productData, imagePath);
  },

  // Accès à l'instance si besoin (pour debug/tests)
  service: geminiServiceInstance,
};
