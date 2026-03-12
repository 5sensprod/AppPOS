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

    // ── Reporting vers PocketApp SaaS ──────────────────────────────────────
    this.pocketAppUrl = process.env.POCKETAPP_URL;
    this.pocketAppApiKey = process.env.POCKETAPP_API_KEY;
  }

  /**
   * Envoie les stats de tokens au SaaS PocketApp (fire & forget)
   * Ne bloque jamais l'appel principal en cas d'erreur
   */
  async _reportUsage(inputTokens, outputTokens, label = null) {
    if (!this.pocketAppUrl || !this.pocketAppApiKey) return;

    try {
      const res = await axios.post(
        `${this.pocketAppUrl}/api/usage.php`,
        { input_tokens: inputTokens, output_tokens: outputTokens, label },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.pocketAppApiKey,
          },
          timeout: 5000,
        }
      );
      console.log('[PocketApp] Reporting OK:', res.data); // ← AJOUT
    } catch (err) {
      console.warn('[PocketApp] Reporting usage échoué:', err.message);
      console.warn('[PocketApp] Response:', err.response?.data); // ← AJOUT
    }
  }
  /**
   * Génère une réponse de chat avec format JSON → HTML
   */
  async generateChatResponse(productData, userMessage, conversation, filePaths) {
    try {
      const systemContext = this._createSystemContext(productData);
      const conversationFormatted = this._formatConversation(systemContext, conversation);
      const optimizedPrompt = getChatResponsePrompt(productData);
      const userParts = this._prepareUserPartsWithImages(userMessage, optimizedPrompt, filePaths);

      conversationFormatted.push({
        role: 'user',
        parts: userParts,
      });

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

      const response = await this._sendApiRequest(requestData, 'chat response');

      if (this._isValidResponse(response)) {
        const rawText = response.data.candidates[0].content.parts[0].text;
        const productSheet = extractJsonFromResponse(rawText);
        const htmlDescription = formatProductSheetToHtml(productSheet);

        return {
          message: rawText,
          description: htmlDescription,
          product_name: productData.name,
          json: productSheet,
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

      if (imagePath && fs.existsSync(imagePath)) {
        this._addImageToRequest(requestData, imagePath);
      }

      const response = await this._sendApiRequest(requestData, 'product title');

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

  // ── Méthodes privées ────────────────────────────────────────────────────────

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

  /**
   * Envoie la requête à Gemini et reporte l'usage au SaaS
   * @param {object} requestData
   * @param {string} label - Label pour l'historique PocketApp
   */
  async _sendApiRequest(requestData, label = null) {
    const apiUrl = `${this.apiBaseUrl}/${this.modelName}:generateContent?key=${this.apiKey}`;
    const response = await axios.post(apiUrl, requestData, {
      headers: { 'Content-Type': 'application/json' },
    });

    // ── Reporting tokens (fire & forget) ──────────────────────────────────
    const usage = response.data?.usageMetadata;
    if (usage) {
      this._reportUsage(usage.promptTokenCount || 0, usage.candidatesTokenCount || 0, label);
    }

    return response;
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

    if (productData.category) systemContext += `\n- Catégorie: ${productData.category}`;
    if (productData.brand) systemContext += `\n- Marque: ${productData.brand}`;
    if (productData.price) systemContext += `\n- Prix: ${productData.price} €`;

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
          conversationFormatted.push({ role: 'user', parts: [{ text: message.content }] });
        } else if (message.type === 'assistant') {
          conversationFormatted.push({ role: 'model', parts: [{ text: message.content }] });
        }
      }
    }

    return conversationFormatted;
  }

  _prepareUserPartsWithImages(userMessage, optimizedPrompt, filePaths) {
    const userParts = [{ text: userMessage + '\n\n' + optimizedPrompt }];

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
