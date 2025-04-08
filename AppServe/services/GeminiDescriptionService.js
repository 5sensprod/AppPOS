// services/GeminiDirectService.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

/**
 * Nettoie la description générée par l'IA pour supprimer les symboles Markdown
 * et s'assurer que le HTML est correctement formaté
 */
function cleanGeneratedDescription(description) {
  if (!description) return '';

  let cleaned = description;

  // 1. Traiter les blocs de code markdown
  // Remplacer ```html par le contenu HTML direct
  cleaned = cleaned.replace(/```html\s*([\s\S]*?)```/g, (match, codeContent) => {
    return codeContent.trim();
  });

  // Supprimer autres blocs de code markdown
  cleaned = cleaned.replace(/```[a-z]*\s*([\s\S]*?)```/g, (match, codeContent) => {
    return codeContent.trim();
  });

  // 2. Nettoyer les numéros de section
  cleaned = cleaned.replace(/^\s*\d+\.\s*/gm, '');

  // 3. Convertir le format Markdown pour les points forts et autres sections
  cleaned = cleaned.replace(/\*\*([^*]+):\*\*/g, '<strong>$1:</strong>');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 4. Remplacer les listes à puces Markdown par du HTML
  const bulletLines = cleaned.match(/^\s*\*\s+(.+)$/gm);
  if (bulletLines) {
    bulletLines.forEach((line) => {
      const cleanedLine = line.replace(/^\s*\*\s+/, '');
      cleaned = cleaned.replace(line, `<li>${cleanedLine}</li>`);
    });

    // Entourer les séquences de <li> avec <ul>
    cleaned = cleaned.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/g, '<ul>$&</ul>');
  }

  // 5. S'assurer que les tableaux HTML sont bien formés
  cleaned = cleaned.replace(/<table>\s*<tbody>/g, '<table>');
  cleaned = cleaned.replace(/<\/tbody>\s*<\/table>/g, '</table>');

  return cleaned;
}

class GeminiDirectService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.apiBaseUrl = 'https://generativelanguage.googleapis.com/v1/models';
    this.modelName = 'gemini-1.5-flash';
  }

  async generateProductDescription(productData, imagePath) {
    try {
      // Préparer le texte du prompt avec instructions claires pour éviter les problèmes Markdown
      let textPrompt = `Tu es un expert en rédaction de fiches produit pour un site e-commerce.
      
Crée une description commerciale concise mais impactante pour le produit suivant : ${productData.name}`;

      // Ajouter les informations supplémentaires au prompt
      if (productData.category) {
        textPrompt += `\nCatégorie de produit : ${productData.category}`;
      }

      if (productData.brand) {
        textPrompt += `\nMarque : ${productData.brand}`;
      }

      if (productData.price) {
        textPrompt += `\nPrix : ${productData.price} €`;
      }

      // NOUVEAU: Ajouter la description actuelle si disponible
      if (productData.currentDescription) {
        textPrompt += `\n\nVoici la description existante que tu dois prendre en compte et améliorer :\n"${productData.currentDescription}"`;
      }

      // Ajouter les spécifications si disponibles
      if (productData.specifications && Object.keys(productData.specifications).length > 0) {
        textPrompt += '\n\nVoici les spécifications connues du produit :';
        for (const [key, value] of Object.entries(productData.specifications)) {
          textPrompt += `\n- ${key}: ${value}`;
        }
      }

      // Format de réponse avec instructions claires sur le format HTML attendu
      textPrompt += `\n\nTa réponse doit suivre ce format :
1. Une description générale courte mais persuasive (1-2 paragraphes maximum)
2. Les points forts du produit (liste de 3-4 avantages clés)
3. Une fiche technique détaillée avec les caractéristiques principales, présentée sous forme de tableau HTML
4. Si pertinent, des conseils d'utilisation courts (1 paragraphe maximum)

TRÈS IMPORTANT - FORMATAGE:
- N'utilise PAS les délimiteurs \`\`\`html et \`\`\` autour du tableau HTML
- Utilise directement les balises HTML (<table>, <tr>, <th>, <td>) pour le tableau
- Pour le formatage, utilise des balises HTML simples (<strong>, <em>, <ul>, <li>) plutôt que des marqueurs Markdown
- Garde la fiche technique détaillée comme pour un produit e-commerce professionnel

Utilise un ton commercial et persuasif. Pour les parties textuelles, sois bref mais accrocheur.`;

      // Préparation de la requête
      const requestData = {
        contents: [
          {
            role: 'user',
            parts: [{ text: textPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
        ],
      };

      // Si une image est fournie, l'ajouter à la requête
      if (imagePath && fs.existsSync(imagePath)) {
        const imageData = fs.readFileSync(imagePath);
        const base64Image = imageData.toString('base64');

        // Ajouter l'image comme partie du message
        requestData.contents[0].parts.push({
          inline_data: {
            mime_type: this._getMimeType(imagePath),
            data: base64Image,
          },
        });
      }

      // URL de l'API Gemini
      const apiUrl = `${this.apiBaseUrl}/${this.modelName}:generateContent?key=${this.apiKey}`;

      // Envoyer la requête à l'API Gemini
      const response = await axios.post(apiUrl, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Extraire la description de la réponse
      if (
        response.data &&
        response.data.candidates &&
        response.data.candidates[0] &&
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts &&
        response.data.candidates[0].content.parts[0]
      ) {
        const rawDescription = response.data.candidates[0].content.parts[0].text;

        // Post-traitement pour nettoyer les artefacts Markdown et assurer un HTML propre
        const cleanedDescription = cleanGeneratedDescription(rawDescription);

        return {
          product_name: productData.name,
          description: cleanedDescription,
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
   * Génère une réponse adaptative basée sur le contexte de la conversation
   * @param {Object} productData Les données du produit
   * @param {string} userMessage Le message de l'utilisateur
   * @param {Array} conversation L'historique de la conversation
   * @param {Array} filePaths Les chemins des fichiers téléchargés
   * @returns {Object} La réponse et la description générée
   */
  async generateChatResponse(productData, userMessage, conversation, filePaths) {
    try {
      // Format du contexte initial
      let systemContext = `Tu es un assistant spécialisé dans la création de fiches produit e-commerce.
  Chacune de tes réponses doit être une fiche produit complète et structurée en HTML.
  
  Informations sur le produit "${productData.name || 'ce produit'}":`;

      // Ajouter les informations de base
      if (productData.category) {
        systemContext += `\n- Catégorie: ${productData.category}`;
      }
      if (productData.brand) {
        systemContext += `\n- Marque: ${productData.brand}`;
      }
      if (productData.price) {
        systemContext += `\n- Prix: ${productData.price} €`;
      }

      // Ajouter la description existante si disponible
      if (productData.currentDescription) {
        systemContext += `\n\nDescription actuelle:\n"${productData.currentDescription}"`;
      }

      // Structure de la conversation pour Gemini
      const conversationFormatted = [
        {
          role: 'user',
          parts: [{ text: systemContext }],
        },
      ];

      // Ajouter l'historique des messages pertinents
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

      // Ajouter le message actuel avec les fichiers
      const userMessageParts = [{ text: userMessage }];

      // Traiter les fichiers attachés
      if (filePaths && filePaths.length > 0) {
        for (const filePath of filePaths) {
          if (fs.existsSync(filePath)) {
            const imageData = fs.readFileSync(filePath);
            const base64Image = imageData.toString('base64');

            userMessageParts.push({
              inline_data: {
                mime_type: this._getMimeType(filePath),
                data: base64Image,
              },
            });
          }
        }
      }

      // Ajouter le message avec une instruction claire
      const finalUserMessage = `${userMessage}\n\nCrée une fiche produit COMPLÈTE avec une structure HTML:
  1. Un titre <h1>
  2. Une introduction commerciale
  3. Une liste de points forts <h2>Points Forts</h2> avec liste <ul><li>
  4. Un tableau HTML <h2>Caractéristiques Techniques</h2> avec TOUTES les spécifications mentionnées
  5. Une section <h2>Conseils d'utilisation</h2> si pertinent
  
  IMPORTANT: Utilise uniquement les informations disponibles dans notre conversation ou visibles sur les images.`;

      conversationFormatted.push({
        role: 'user',
        parts: [
          { text: finalUserMessage },
          ...userMessageParts.slice(1), // Exclure le premier élément qui est déjà le texte
        ],
      });

      // Structure de la requête
      const requestData = {
        contents: conversationFormatted,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      };

      // Appel à l'API Gemini
      const apiUrl = `${this.apiBaseUrl}/${this.modelName}:generateContent?key=${this.apiKey}`;
      const response = await axios.post(apiUrl, requestData, {
        headers: { 'Content-Type': 'application/json' },
      });

      // Traitement de la réponse
      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const generatedText = response.data.candidates[0].content.parts[0].text;

        // Nettoyer la description générée
        const cleanedDescription = cleanGeneratedDescription(generatedText);

        return {
          message: generatedText,
          description: cleanedDescription,
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
   * Génère une description complète basée sur l'historique du chat
   * @private
   */
  async _generateDescriptionFromChat(productData, conversation, lastUserMessage, lastAIResponse) {
    try {
      // Construire un prompt pour demander à Gemini de créer une description structurée
      // basée sur toute la conversation
      let descriptionPrompt = `En te basant sur notre conversation complète à propos du produit "${productData.name}", 
génère maintenant une description de produit commerciale complète et structurée. 

Voici un résumé des informations importantes discutées:
`;

      // Ajouter les informations de base du produit
      if (productData.category) {
        descriptionPrompt += `- Catégorie: ${productData.category}\n`;
      }

      if (productData.brand) {
        descriptionPrompt += `- Marque: ${productData.brand}\n`;
      }

      if (productData.price) {
        descriptionPrompt += `- Prix: ${productData.price} €\n`;
      }

      // Ajouter un résumé de la conversation
      descriptionPrompt += '\nRésumé de notre conversation:\n';

      // Ajouter les derniers messages pour le contexte
      if (conversation && conversation.length > 0) {
        // Limiter à 5 derniers messages pour éviter que le prompt soit trop long
        const recentMessages = conversation.slice(-5);
        for (const message of recentMessages) {
          if (message.type === 'user') {
            descriptionPrompt += `- Client: ${message.content}\n`;
          } else if (message.type === 'assistant') {
            descriptionPrompt += `- Assistant: [Réponse concernant ${this._summarizeMessage(message.content)}]\n`;
          }
        }
      }

      // Ajouter le dernier échange
      descriptionPrompt += `- Client: ${lastUserMessage}\n`;
      descriptionPrompt += `- Assistant: [Réponse concernant ${this._summarizeMessage(lastAIResponse)}]\n`;

      // Format de la description attendue
      descriptionPrompt += `\nMaintenant, génère une description de produit commerciale complète suivant ce format :
1. Une description générale courte mais persuasive (1-2 paragraphes maximum)
2. Les points forts du produit (liste de 3-4 avantages clés)
3. Une fiche technique détaillée avec les caractéristiques principales, présentée sous forme de tableau HTML
4. Si pertinent, des conseils d'utilisation courts (1 paragraphe maximum)

TRÈS IMPORTANT - FORMATAGE:
- N'utilise PAS les délimiteurs \`\`\`html et \`\`\` autour du tableau HTML
- Utilise directement les balises HTML (<table>, <tr>, <th>, <td>) pour le tableau
- Pour le formatage, utilise des balises HTML simples (<strong>, <em>, <ul>, <li>) plutôt que des marqueurs Markdown
- Garde la fiche technique détaillée comme pour un produit e-commerce professionnel

Utilise un ton commercial et persuasif. Pour les parties textuelles, sois bref mais accrocheur.`;

      // Structure de la requête pour Gemini
      const requestData = {
        contents: [
          {
            role: 'user',
            parts: [{ text: descriptionPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
          topP: 0.95,
          topK: 40,
        },
      };

      // URL de l'API Gemini
      const apiUrl = `${this.apiBaseUrl}/${this.modelName}:generateContent?key=${this.apiKey}`;

      // Envoyer la requête à l'API Gemini
      const response = await axios.post(apiUrl, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Extraire la description générée
      if (
        response.data &&
        response.data.candidates &&
        response.data.candidates[0] &&
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts &&
        response.data.candidates[0].content.parts[0]
      ) {
        return response.data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Format de réponse inattendu lors de la génération de la description');
      }
    } catch (error) {
      console.error('Erreur lors de la génération de la description basée sur le chat:', error);
      // En cas d'erreur, retourner une chaîne vide ou un message d'erreur
      return '';
    }
  }

  /**
   * Génère une description adaptative basée sur le contexte et le type de produit
   * @private
   */
  async _generateAdaptiveDescription(
    productData,
    conversation,
    lastUserMessage,
    lastAIResponse,
    filePaths
  ) {
    try {
      // Construire un prompt pour générer une description commerciale adaptée au type de produit
      let descriptionPrompt = `En tant qu'expert en rédaction commerciale, génère une description de produit e-commerce complète pour "${productData.name || 'ce produit'}".

Utilise toutes les informations fournies dans notre conversation, y compris les images et détails techniques partagés.`;

      // Ajouter des exemples d'images si disponibles
      if (filePaths && filePaths.length > 0) {
        descriptionPrompt += `\n\nJ'ai analysé ${filePaths.length} image(s) du produit, et j'en tiens compte dans ma description.`;
      }

      // Ajouter l'historique pertinent
      if (conversation && conversation.length > 0) {
        descriptionPrompt += `\n\nVoici un résumé des informations importantes discutées dans notre conversation:`;

        // Extraire les informations clés des messages de l'assistant
        // Pour éviter un prompt trop long, on se concentre sur les messages de l'assistant
        // qui contiennent probablement des analyses d'images et des spécifications techniques
        const keyMessages = conversation.filter((msg) => msg.type === 'assistant').slice(-3); // Prendre les 3 derniers messages de l'assistant pour le contexte

        for (const message of keyMessages) {
          if (message.content) {
            // Extraire les parties pertinentes (titre, spécifications, etc.)
            const lines = message.content.split('\n');
            for (const line of lines) {
              // Inclure les lignes qui semblent contenir des spécifications ou informations produit
              if (
                line.includes(':') ||
                line.includes('*') ||
                line.match(/^\d+\.\s/) ||
                line.match(/^-\s/)
              ) {
                descriptionPrompt += `\n${line}`;
              }
            }
          }
        }
      }

      // Ajouter la dernière réponse de l'IA car elle peut contenir des informations importantes
      descriptionPrompt += `\n\nMa dernière analyse: "${this._summarizeMessage(lastAIResponse, 200)}"`;

      // Instructions pour le format de la description
      descriptionPrompt += `\n\nCrée maintenant une description de produit COMPLÈTE et ADAPTÉE au type de produit spécifique, avec:

1. Un titre accrocheur au format HTML <h1>
2. Un ou deux paragraphes d'introduction vendeurs et persuasifs
3. Une liste de points forts (3-5 éléments) dans une section <h2>Points Forts</h2> avec liste <ul><li>
4. Un tableau HTML complet des spécifications techniques dans une section <h2>Caractéristiques Techniques</h2>
   - Ce tableau doit être ADAPTÉ au type de produit spécifique (pas un modèle générique)
   - Inclure TOUTES les spécifications mentionnées dans notre conversation
   - N'utilise PAS de placeholder comme "(à compléter)" - utilise uniquement les informations disponibles
5. Si pertinent, une courte section <h2>Conseils d'utilisation</h2>

IMPORTANT:
- Utilise uniquement les informations disponibles, sans inventer de spécifications
- Adapte le tableau technique au type de produit spécifique (audio, informatique, vêtement, etc.)
- Inclus des balises HTML structurées (<h1>, <h2>, <ul>, <li>, <table>) pour un rendu optimisé
- Sois précis, commercial et convaincant`;

      // Structure de la requête pour Gemini
      const requestData = {
        contents: [
          {
            role: 'user',
            parts: [{ text: descriptionPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
          topP: 0.95,
          topK: 40,
        },
      };

      // Inclure également les images pour la génération de la description finale
      if (filePaths && filePaths.length > 0) {
        // Limiter à une seule image pour la requête finale
        const filePath = filePaths[0];
        if (fs.existsSync(filePath)) {
          const imageData = fs.readFileSync(filePath);
          const base64Image = imageData.toString('base64');

          requestData.contents[0].parts.push({
            inline_data: {
              mime_type: this._getMimeType(filePath),
              data: base64Image,
            },
          });
        }
      }

      // URL de l'API Gemini
      const apiUrl = `${this.apiBaseUrl}/${this.modelName}:generateContent?key=${this.apiKey}`;

      // Envoyer la requête à l'API Gemini
      const response = await axios.post(apiUrl, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Extraire la description générée
      if (
        response.data &&
        response.data.candidates &&
        response.data.candidates[0] &&
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts &&
        response.data.candidates[0].content.parts[0]
      ) {
        return response.data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Format de réponse inattendu lors de la génération de la description');
      }
    } catch (error) {
      console.error('Erreur lors de la génération de la description adaptative:', error);
      // En cas d'erreur, retourner un message d'erreur formaté
      return `<h1>Description du produit</h1><p>Une erreur s'est produite lors de la génération de la description complète. Veuillez réessayer ou contacter le support.</p>`;
    }
  }

  /**
   * Résume un message pour l'inclure dans le contexte, avec une longueur maximale personnalisable
   * @private
   */
  _summarizeMessage(message, maxLength = 50) {
    if (!message) return 'information non spécifiée';

    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength - 3) + '...';
  }
  // Fonction utilitaire pour déterminer le type MIME basé sur l'extension du fichier
  _getMimeType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    return mimeTypes[ext] || 'image/jpeg';
  }
}

module.exports = GeminiDirectService;
