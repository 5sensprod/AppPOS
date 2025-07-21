// services/huggingface/HuggingFaceService.js
const axios = require('axios');
const fs = require('fs');
const { cleanGeneratedDescription } = require('../gemini/utils/cleanGeneratedDescription');
const htmlValidatorService = require('../gemini/utils/htmlValidatorService');
const { getProductDescriptionPrompt } = require('../gemini/prompts/productDescription');
const { getChatResponsePrompt } = require('../gemini/prompts/chatResponse');

/**
 * Service pour interagir avec l'API Hugging Face
 */
class HuggingFaceService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.baseUrl = 'https://api-inference.huggingface.co/models';

    // Modèles recommandés pour la génération de texte
    this.models = {
      text: 'meta-llama/Llama-3.2-3B-Instruct', // Ou 'mistralai/Mistral-7B-Instruct-v0.3'
      multimodal: 'llava-hf/llava-1.5-7b-hf', // Pour les images
    };
  }

  /**
   * Génère une description de produit
   * @param {Object} productData Les données du produit
   * @param {string} imagePath Chemin de l'image du produit (optionnel)
   * @returns {Object} Description générée
   */
  async generateProductDescription(productData, imagePath) {
    try {
      // Obtenir le prompt formaté (réutilise celui de Gemini)
      const textPrompt = getProductDescriptionPrompt(productData);

      let response;

      if (imagePath && fs.existsSync(imagePath)) {
        // Utiliser un modèle multimodal si image fournie
        response = await this._generateWithImage(textPrompt, imagePath);
      } else {
        // Génération texte seul
        response = await this._generateText(textPrompt);
      }

      // Traiter la réponse
      const rawDescription = this._extractTextFromResponse(response);
      const cleanedDescription = cleanGeneratedDescription(rawDescription);
      const validatedDescription = htmlValidatorService.validateAndClean(cleanedDescription);

      return {
        product_name: productData.name,
        description: validatedDescription,
      };
    } catch (error) {
      console.error('Erreur HuggingFace génération description:', error);
      throw new Error(`Échec génération HuggingFace: ${error.message}`);
    }
  }

  /**
   * Génère une réponse de chat
   * @param {Object} productData Les données du produit
   * @param {string} userMessage Le message de l'utilisateur
   * @param {Array} conversation L'historique de la conversation
   * @param {Array} filePaths Les chemins des fichiers téléchargés
   * @returns {Object} La réponse générée
   */
  async generateChatResponse(productData, userMessage, conversation, filePaths) {
    try {
      // Créer le contexte système
      const systemContext = this._createSystemContext(productData);

      // Formatter la conversation pour Llama/Mistral
      const formattedPrompt = this._formatConversationForHF(
        systemContext,
        conversation,
        userMessage
      );

      let response;

      if (filePaths && filePaths.length > 0) {
        // Utiliser modèle multimodal pour les images
        response = await this._generateWithImages(formattedPrompt, filePaths);
      } else {
        // Génération texte seul
        response = await this._generateText(formattedPrompt);
      }

      const generatedText = this._extractTextFromResponse(response);
      const cleanedDescription = cleanGeneratedDescription(generatedText);
      const validatedDescription = htmlValidatorService.validateAndClean(cleanedDescription);

      return {
        message: generatedText,
        description: validatedDescription,
        product_name: productData.name,
      };
    } catch (error) {
      console.error('Erreur HuggingFace chat:', error);
      throw new Error(`Échec chat HuggingFace: ${error.message}`);
    }
  }

  /**
   * Génère un titre de produit
   * @param {Object} productData Données du produit
   * @param {string} imagePath Chemin optionnel vers l'image
   * @returns {Promise<Object>} Résultat de la génération
   */
  async generateProductTitle(productData, imagePath = null) {
    try {
      const { getProductTitlePrompt } = require('../gemini/prompts/productTitleGenerator');
      const prompt = getProductTitlePrompt(productData);

      let response;
      if (imagePath && fs.existsSync(imagePath)) {
        response = await this._generateWithImage(prompt, imagePath);
      } else {
        response = await this._generateText(prompt);
      }

      const rawTitle = this._extractTextFromResponse(response);
      const title = this._cleanResponse(rawTitle);

      return {
        title,
        success: true,
        message: 'Titre généré avec HuggingFace',
      };
    } catch (error) {
      console.error('Erreur génération titre HF:', error);
      return {
        title: '',
        success: false,
        message: `Erreur HuggingFace: ${error.message}`,
      };
    }
  }

  // Méthodes privées

  /**
   * Génération de texte seul
   */
  async _generateText(prompt) {
    const url = `${this.baseUrl}/${this.models.text}`;

    const requestData = {
      inputs: prompt,
      parameters: {
        max_new_tokens: 1500,
        temperature: 0.7,
        top_p: 0.95,
        do_sample: true,
        return_full_text: false,
      },
    };

    const response = await axios.post(url, requestData, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  /**
   * Génération avec une image
   */
  async _generateWithImage(prompt, imagePath) {
    // Pour les modèles multimodaux, la structure peut varier
    const url = `${this.baseUrl}/${this.models.multimodal}`;

    const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });

    const requestData = {
      inputs: {
        text: prompt,
        image: `data:image/jpeg;base64,${imageData}`,
      },
      parameters: {
        max_new_tokens: 1500,
        temperature: 0.7,
      },
    };

    const response = await axios.post(url, requestData, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  /**
   * Génération avec plusieurs images
   */
  async _generateWithImages(prompt, filePaths) {
    // Pour l'instant, prendre seulement la première image
    // HuggingFace a des limitations sur les images multiples
    if (filePaths.length > 0) {
      return await this._generateWithImage(prompt, filePaths[0]);
    }
    return await this._generateText(prompt);
  }

  /**
   * Extraire le texte de la réponse HuggingFace
   */
  _extractTextFromResponse(response) {
    if (Array.isArray(response) && response.length > 0) {
      // Format standard pour la génération de texte
      return response[0].generated_text || response[0].text || '';
    } else if (response.generated_text) {
      return response.generated_text;
    } else if (typeof response === 'string') {
      return response;
    }

    console.warn('Format de réponse HF inattendu:', response);
    return '';
  }

  /**
   * Créer le contexte système (réutilise la logique Gemini)
   */
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

  /**
   * Formatter la conversation pour les modèles HuggingFace
   */
  _formatConversationForHF(systemContext, conversation, userMessage) {
    let prompt = `<|system|>\n${systemContext}\n\n`;

    // Ajouter l'historique de conversation
    if (conversation && conversation.length > 0) {
      for (const message of conversation) {
        if (message.type === 'user') {
          prompt += `<|user|>\n${message.content}\n\n`;
        } else if (message.type === 'assistant') {
          prompt += `<|assistant|>\n${message.content}\n\n`;
        }
      }
    }

    // Ajouter le message utilisateur actuel
    prompt += `<|user|>\n${userMessage}\n\n<|assistant|>\n`;

    return prompt;
  }

  /**
   * Nettoyer la réponse (réutilise la logique Gemini)
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
}

module.exports = HuggingFaceService;
