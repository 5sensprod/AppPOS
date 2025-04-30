// services/gemini/GeminiDirectService.js - Avec validation HTML améliorée
const axios = require('axios');
const fs = require('fs');
const apiConfig = require('./config/apiConfig');
const { cleanGeneratedDescription } = require('./utils/cleanGeneratedDescription');
const { getMimeType } = require('./utils/mimeTypeHelper');
const { getProductDescriptionPrompt } = require('./prompts/productDescription');
const { getChatResponsePrompt } = require('./prompts/chatResponse');
// Ajout du service de validation HTML
const htmlValidatorService = require('./utils/htmlValidatorService');

/**
 * Service pour interagir avec l'API Gemini et générer des descriptions de produits
 */
class GeminiDirectService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.apiBaseUrl = apiConfig.baseUrl;
    this.modelName = apiConfig.modelName;
  }

  /**
   * Génère une description de produit basée sur les données fournies
   * @param {Object} productData Les données du produit
   * @param {string} imagePath Chemin de l'image du produit (optionnel)
   * @returns {Object} Description générée
   */
  async generateProductDescription(productData, imagePath) {
    try {
      // Obtenir le prompt formaté pour la description du produit
      const textPrompt = getProductDescriptionPrompt(productData);

      // Préparer la requête
      const requestData = this._prepareApiRequest(textPrompt, 0.3);

      // Ajouter une image si fournie
      if (imagePath && fs.existsSync(imagePath)) {
        this._addImageToRequest(requestData, imagePath);
      }

      // Envoyer la requête à l'API Gemini
      const response = await this._sendApiRequest(requestData);

      // Traiter la réponse
      if (this._isValidResponse(response)) {
        const rawDescription = response.data.candidates[0].content.parts[0].text;

        // Utiliser cleanGeneratedDescription pour le nettoyage initial
        const cleanedDescription = cleanGeneratedDescription(rawDescription);

        // NOUVEAU : Validation supplémentaire avec le service de validation HTML
        const validatedDescription = htmlValidatorService.validateAndClean(cleanedDescription);

        return {
          product_name: productData.name,
          description: validatedDescription,
        };
      } else {
        throw new Error('Format de réponse inattendu de Gemini');
      }
    } catch (error) {
      console.error('Erreur lors de la génération de la description:', error);
      throw new Error(`Échec de la génération de description: ${error.message}`);
    }
  }

  /**
   * Génère une réponse de chat adaptative basée sur le contexte de la conversation
   * @param {Object} productData Les données du produit
   * @param {string} userMessage Le message de l'utilisateur
   * @param {Array} conversation L'historique de la conversation
   * @param {Array} filePaths Les chemins des fichiers téléchargés
   * @returns {Object} La réponse et la description générée
   */
  async generateChatResponse(productData, userMessage, conversation, filePaths) {
    try {
      // Créer le contexte système pour l'IA
      const systemContext = this._createSystemContext(productData);

      // Formatter la conversation
      const conversationFormatted = this._formatConversation(systemContext, conversation);

      // Obtenir le prompt pour la réponse de chat
      const optimizedPrompt = getChatResponsePrompt(productData);

      // Préparer le message utilisateur final avec images
      const userParts = this._prepareUserPartsWithImages(userMessage, optimizedPrompt, filePaths);

      // Ajouter le message utilisateur à la conversation
      conversationFormatted.push({
        role: 'user',
        parts: userParts,
      });

      // Créer la requête finale
      const requestData = {
        contents: conversationFormatted,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: apiConfig.safetySettings,
      };

      // Appel à l'API Gemini
      const response = await this._sendApiRequest(requestData);

      // Traitement de la réponse
      if (this._isValidResponse(response)) {
        const generatedText = response.data.candidates[0].content.parts[0].text;

        // Utiliser cleanGeneratedDescription pour le nettoyage initial
        const cleanedDescription = cleanGeneratedDescription(generatedText);

        // NOUVEAU : Validation supplémentaire avec le service de validation HTML
        const validatedDescription = htmlValidatorService.validateAndClean(cleanedDescription);

        return {
          message: generatedText,
          description: validatedDescription,
          product_name: productData.name,
        };
      } else {
        throw new Error('Format de réponse inattendu de Gemini');
      }
    } catch (error) {
      console.error('Erreur lors de la génération de la réponse du chat:', error);
      throw new Error(`Échec de la génération de réponse: ${error.message}`);
    }
  }

  /**
   * Génère uniquement un titre pour un produit
   * @param {Object} productData Données du produit
   * @param {string} imagePath Chemin optionnel vers l'image du produit (non utilisé)
   * @returns {Promise<Object>} Résultat de la génération
   */
  async generateProductTitle(productData, imagePath = null) {
    try {
      // Importer le template de génération de titre
      const { getProductTitlePrompt } = require('./prompts/productTitleGenerator');

      // Construire le prompt pour le titre
      const prompt = getProductTitlePrompt(productData);

      // Préparer la requête API
      const requestData = this._prepareApiRequest(prompt, 0.7);

      // Ajouter une image si fournie
      if (imagePath && fs.existsSync(imagePath)) {
        this._addImageToRequest(requestData, imagePath);
      }

      // Envoyer la requête à l'API Gemini
      const response = await this._sendApiRequest(requestData);

      // Traiter la réponse
      if (this._isValidResponse(response)) {
        const rawTitle = response.data.candidates[0].content.parts[0].text;
        const title = this._cleanResponse(rawTitle);

        return {
          title,
          success: true,
          message: 'Titre généré avec succès',
        };
      } else {
        throw new Error('Format de réponse inattendu de Gemini');
      }
    } catch (error) {
      console.error('Erreur lors de la génération du titre:', error);
      return {
        title: '',
        success: false,
        message: `Erreur lors de la génération: ${error.message || 'Erreur inconnue'}`,
      };
    }
  }

  /**
   * Nettoie la réponse de l'API pour extraire uniquement le titre
   * @param {string} response Réponse brute de l'API
   * @returns {string} Titre nettoyé
   */
  _cleanResponse(response) {
    // Retirer les guillemets si présents
    let cleaned = response.trim();
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }

    // Retirer les préfixes potentiels comme "Titre: " ou "Title: "
    cleaned = cleaned.replace(/^(titre\s*:|title\s*:)/i, '').trim();

    return cleaned;
  }

  // Méthodes privées d'aide
  _prepareApiRequest(textPrompt, temperature = 0.7) {
    return {
      contents: [
        {
          role: 'user',
          parts: [{ text: textPrompt }],
        },
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 1500,
        topP: 0.95,
        topK: 40,
      },
      safetySettings: apiConfig.safetySettings,
    };
  }

  _addImageToRequest(requestData, imagePath) {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    requestData.contents[0].parts.push({
      inline_data: {
        mime_type: getMimeType(imagePath),
        data: base64Image,
      },
    });
  }

  async _sendApiRequest(requestData) {
    const apiUrl = `${this.apiBaseUrl}/${this.modelName}:generateContent?key=${this.apiKey}`;
    return await axios.post(apiUrl, requestData, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  _isValidResponse(response) {
    return (
      response.data &&
      response.data.candidates &&
      response.data.candidates[0] &&
      response.data.candidates[0].content &&
      response.data.candidates[0].content.parts &&
      response.data.candidates[0].content.parts[0]
    );
  }

  _createSystemContext(productData) {
    let systemContext = `Tu es un assistant spécialisé dans la création de fiches produit e-commerce WooCommerce.
    Chacune de tes réponses doit être une fiche produit en HTML pur, sans commentaires ni explications.
    
    Informations sur le produit "${productData.name || 'ce produit'}":`;

    if (productData.category) {
      systemContext += `\n- Catégorie: ${productData.category}`;
    }
    if (productData.brand) {
      systemContext += `\n- Marque: ${productData.brand}`;
    }
    if (productData.price) {
      systemContext += `\n- Prix: ${productData.price} €`;
    }
    if (productData.currentDescription) {
      systemContext += `\n\nDescription actuelle:\n"${productData.currentDescription}"`;
    }

    return systemContext;
  }

  _formatConversation(systemContext, conversation) {
    const conversationFormatted = [
      {
        role: 'user',
        parts: [{ text: systemContext }],
      },
    ];

    if (conversation && conversation.length > 0) {
      for (const message of conversation) {
        if (message.type === 'user') {
          conversationFormatted.push({
            role: 'user',
            parts: [{ text: message.content }],
          });
        } else if (message.type === 'assistant') {
          conversationFormatted.push({
            role: 'model',
            parts: [{ text: message.content }],
          });
        }
      }
    }

    return conversationFormatted;
  }

  _prepareUserPartsWithImages(userMessage, optimizedPrompt, filePaths) {
    const userParts = [
      {
        text: userMessage + '\n\n' + optimizedPrompt,
      },
    ];

    if (filePaths && filePaths.length > 0) {
      console.log(`Ajout de ${filePaths.length} images à la requête finale`);

      for (const filePath of filePaths) {
        if (fs.existsSync(filePath)) {
          try {
            const imageData = fs.readFileSync(filePath);
            const base64Image = imageData.toString('base64');

            userParts.push({
              inline_data: {
                mime_type: getMimeType(filePath),
                data: base64Image,
              },
            });
          } catch (error) {
            console.error(`Erreur lors du traitement de l'image ${filePath}:`, error);
          }
        } else {
          console.warn(`Le fichier ${filePath} n'existe pas`);
        }
      }
    }

    return userParts;
  }
}

module.exports = GeminiDirectService;
