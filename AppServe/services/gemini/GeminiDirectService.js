// services/gemini/GeminiDirectService.js - Version optimisée JSON → HTML
const axios = require('axios');
const fs = require('fs');
const apiConfig = require('./config/apiConfig');
const { getMimeType } = require('./utils/mimeTypeHelper');
const { getChatResponsePrompt } = require('./prompts/chatResponse');
const {
  formatProductSheetToHtml,
  extractJsonFromResponse,
} = require('./utils/productSheetFormatter');

/**
 * Service pour interagir avec l'API Gemini
 */
class GeminiDirectService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.apiBaseUrl = apiConfig.baseUrl;
    this.modelName = apiConfig.modelName;
  }

  /**
   * Génère une réponse de chat avec format JSON → HTML
   */
  async generateChatResponse(productData, userMessage, conversation, filePaths) {
    try {
      // Créer le contexte système pour l'IA
      const systemContext = this._createSystemContext(productData);

      // Formatter la conversation
      const conversationFormatted = this._formatConversation(systemContext, conversation);

      // Obtenir le prompt JSON optimisé
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
          maxOutputTokens: 2000,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: apiConfig.safetySettings,
      };

      // Appel à l'API Gemini
      const response = await this._sendApiRequest(requestData);

      // Traitement de la réponse
      if (this._isValidResponse(response)) {
        const rawText = response.data.candidates[0].content.parts[0].text;

        // Extraire et parser le JSON de la réponse
        const productSheet = extractJsonFromResponse(rawText);

        // Convertir le JSON en HTML formaté
        const htmlDescription = formatProductSheetToHtml(productSheet);

        return {
          message: rawText, // Le JSON brut pour debug/historique
          description: htmlDescription, // Le HTML formaté pour la base
          product_name: productData.name,
          json: productSheet, // Le JSON structuré si besoin
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
   */
  async generateProductTitle(productData, imagePath = null) {
    try {
      const { getProductTitlePrompt } = require('./prompts/productTitleGenerator');

      const prompt = getProductTitlePrompt(productData);
      const requestData = this._prepareApiRequest(prompt, 0.7);

      // Ajouter une image si fournie
      if (imagePath && fs.existsSync(imagePath)) {
        this._addImageToRequest(requestData, imagePath);
      }

      const response = await this._sendApiRequest(requestData);

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
   */
  _cleanResponse(response) {
    let cleaned = response.trim();
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }

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
    if (!fs.existsSync(imagePath)) {
      console.warn(`Image non trouvée: ${imagePath}`);
      return;
    }

    try {
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      requestData.contents[0].parts.push({
        inline_data: {
          mime_type: getMimeType(imagePath),
          data: base64Image,
        },
      });
    } catch (error) {
      console.error(`Erreur ajout image: ${error.message}`);
    }
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
    let systemContext = `Tu es un assistant spécialisé dans la création de fiches produit e-commerce.
    Tu dois générer une fiche produit structurée en JSON pour "${productData.name || 'ce produit'}".`;

    if (productData.category) {
      systemContext += `\n- Catégorie: ${productData.category}`;
    }
    if (productData.brand) {
      systemContext += `\n- Marque: ${productData.brand}`;
    }
    if (productData.price) {
      systemContext += `\n- Prix: ${productData.price} €`;
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
      console.log(`📸 Ajout de ${filePaths.length} image(s) à la requête`);

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
            console.error(`Erreur traitement image ${filePath}:`, error);
          }
        } else {
          console.warn(`Fichier introuvable: ${filePath}`);
        }
      }
    }

    return userParts;
  }
}

module.exports = GeminiDirectService;
