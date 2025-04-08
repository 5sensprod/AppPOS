// services/GeminiDirectService.js
const axios = require('axios');
const fs = require('fs');

/**
 * Nettoie la description générée par l'IA pour supprimer les symboles Markdown
 * et s'assurer que le HTML est correctement formaté
 */
function cleanGeneratedDescription(description) {
  if (!description) return '';

  let cleaned = description;

  // 1. Traiter les blocs de code markdown
  cleaned = cleaned.replace(/```html\s*([\s\S]*?)```/g, (match, codeContent) => {
    return codeContent.trim();
  });
  cleaned = cleaned.replace(/```[a-z]*\s*([\s\S]*?)```/g, (match, codeContent) => {
    return codeContent.trim();
  });
  cleaned = cleaned.replace(/<\/?h1[^>]*>/g, '');

  // 2. Extraire uniquement le contenu du body si structure HTML complète
  if (cleaned.includes('<!DOCTYPE html>') || cleaned.includes('<html')) {
    const bodyMatch = cleaned.match(/<body>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      cleaned = bodyMatch[1].trim();
    }
  }

  // 3. Nettoyer les numéros de section
  cleaned = cleaned.replace(/^\s*\d+\.\s*/gm, '');

  // 4. Convertir le format Markdown pour les points forts et autres sections
  cleaned = cleaned.replace(/\*\*([^*]+):\*\*/g, '<strong>$1:</strong>');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 5. Remplacer les listes à puces Markdown par du HTML
  const bulletLines = cleaned.match(/^\s*\*\s+(.+)$/gm);
  if (bulletLines) {
    bulletLines.forEach((line) => {
      const cleanedLine = line.replace(/^\s*\*\s+/, '');
      cleaned = cleaned.replace(line, `<li>${cleanedLine}</li>`);
    });
    cleaned = cleaned.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/g, '<ul>$&</ul>');
  }

  // 6. S'assurer que les tableaux HTML sont bien formés
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

      // Structure de la conversation
      const conversationFormatted = [
        {
          role: 'user',
          parts: [{ text: systemContext }],
        },
      ];

      // Ajouter l'historique des messages
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

      // Préparation du message utilisateur final
      const userParts = [
        {
          text:
            userMessage +
            `\n\nCrée une fiche produit COMPLÈTE avec une structure HTML:
        1. Un titre <h1>
        2. Une introduction commerciale
        3. Une liste de points forts <h2>Points Forts</h2> avec liste <ul><li>
        4. Un tableau HTML <h2>Caractéristiques Techniques</h2> avec TOUTES les spécifications mentionnées
        5. Une section <h2>Conseils d'utilisation</h2> si pertinent
        
        IMPORTANT: Utilise uniquement les informations disponibles dans notre conversation ou visibles sur les images.
        TRÈS IMPORTANT:
- Ne génère PAS une page HTML complète (pas de <!DOCTYPE>, <html>, <head>, <body>)
- Fournis UNIQUEMENT le contenu HTML des sections demandées
- Assure-toi que le contenu est proprement formaté pour être intégré directement
- Utilise les balises HTML pour la mise en forme (<h1>, <h2>, <p>, <ul>, <li>, <table>)
        `,
        },
      ];

      // AJOUTER TOUTES LES IMAGES au message final
      if (filePaths && filePaths.length > 0) {
        console.log(`Ajout de ${filePaths.length} images à la requête finale`);

        for (const filePath of filePaths) {
          if (fs.existsSync(filePath)) {
            try {
              console.log(`Traitement de l'image: ${filePath}`);
              const imageData = fs.readFileSync(filePath);
              const base64Image = imageData.toString('base64');

              userParts.push({
                inline_data: {
                  mime_type: this._getMimeType(filePath),
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

      // Ajouter le message utilisateur avec toutes les images
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
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      };

      // Appel à l'API Gemini
      const apiUrl = `${this.apiBaseUrl}/${this.modelName}:generateContent?key=${this.apiKey}`;
      console.log('Envoi de la requête à Gemini avec toutes les images');

      const response = await axios.post(apiUrl, requestData, {
        headers: { 'Content-Type': 'application/json' },
      });

      // Traitement de la réponse
      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const generatedText = response.data.candidates[0].content.parts[0].text;
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
