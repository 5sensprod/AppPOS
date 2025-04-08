// services/gemini/config/apiConfig.js

/**
 * Configuration pour l'API Gemini
 */
module.exports = {
  // URL de base de l'API
  baseUrl: 'https://generativelanguage.googleapis.com/v1/models',

  // Modèle à utiliser
  modelName: 'gemini-1.5-flash',

  // Paramètres de sécurité pour toutes les requêtes
  safetySettings: [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
  ],

  // Configuration par défaut de génération
  defaultGenerationConfig: {
    temperature: 0.7,
    maxOutputTokens: 1500,
    topP: 0.95,
    topK: 40,
  },
};
