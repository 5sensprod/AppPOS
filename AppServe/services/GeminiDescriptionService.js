// services/GeminiDirectService.js
const axios = require('axios');
const fs = require('fs');

/**
 * Nettoie la description générée par l'IA pour supprimer les symboles Markdown
 * et s'assurer que le HTML est correctement formaté pour WooCommerce
 */
function cleanGeneratedDescription(description) {
  if (!description) return '';

  let cleaned = description;

  // 1. Supprimer tous les blocs de code markdown complètement
  cleaned = cleaned.replace(/```[a-z]*\s*([\s\S]*?)```/g, '$1');

  // 2. Extraire uniquement le contenu du body si structure HTML complète
  if (cleaned.includes('<!DOCTYPE html>') || cleaned.includes('<html')) {
    const bodyMatch = cleaned.match(/<body>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      cleaned = bodyMatch[1].trim();
    }
  }

  // 3. Nettoyer les numéros de section et les explications
  cleaned = cleaned.replace(/^\s*\d+\.\s*/gm, '');

  // 4. Supprimer les lignes qui sont des instructions ou des commentaires
  cleaned = cleaned.replace(/^(Voici|Voilà|Ici|J'ai créé|J'ai généré|Voici le code HTML).*$/gm, '');
  cleaned = cleaned.replace(/^(Note|Important|Remarque):.*$/gm, '');

  // 5. Convertir le format Markdown tout en PRÉSERVANT les attributs style
  // Rechercher les balises avec attributs style et les protéger
  const styleMatches = [];
  let counter = 0;
  cleaned = cleaned.replace(
    /<([a-z0-9]+)([^>]*?style="[^"]*")([^>]*)>/gi,
    (match, tag, styleAttr, rest) => {
      const placeholder = `__STYLE_PLACEHOLDER_${counter}__`;
      styleMatches[counter] = { tag, styleAttr, rest };
      counter++;
      return placeholder;
    }
  );

  // Appliquer les conversions Markdown standard
  cleaned = cleaned.replace(/\*\*([^*]+):\*\*/g, '<strong>$1:</strong>');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Restaurer les balises avec attributs style
  for (let i = 0; i < styleMatches.length; i++) {
    const { tag, styleAttr, rest } = styleMatches[i];
    const placeholder = `__STYLE_PLACEHOLDER_${i}__`;
    cleaned = cleaned.replace(placeholder, `<${tag}${styleAttr}${rest}>`);
  }

  // 6. Remplacer les listes à puces Markdown par du HTML si non déjà formaté
  if (!cleaned.includes('<ul style=')) {
    cleaned = cleaned.replace(
      /^\s*-\s+(.+)$/gm,
      '<li style="margin: 0 0 8px 0; padding: 0;">$1</li>'
    );
    cleaned = cleaned.replace(
      /^\s*\*\s+(.+)$/gm,
      '<li style="margin: 0 0 8px 0; padding: 0;">$1</li>'
    );
    cleaned = cleaned.replace(
      /(<li style.*?<\/li>)(\s*<li style.*?<\/li>)*/g,
      '<ul style="margin: 0 0 20px 0; padding: 0 0 0 20px; list-style-type: disc;">$&</ul>'
    );
  }

  // 7. Nettoyer les espaces inutiles, les lignes vides multiples
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();

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
      // Préparer le texte du prompt avec instructions précises pour le format HTML
      let textPrompt = `
Tu es un expert en rédaction de fiches produit pour un site e-commerce WooCommerce.
      
Crée une description commerciale HTML pour ce produit : "${productData.name}"

Informations disponibles :`;

      // Ajouter les informations supplémentaires au prompt
      if (productData.category) {
        textPrompt += `\n- Catégorie : ${productData.category}`;
      }

      if (productData.brand) {
        textPrompt += `\n- Marque : ${productData.brand}`;
      }

      if (productData.price) {
        textPrompt += `\n- Prix : ${productData.price} €`;
      }

      // Ajouter la description actuelle si disponible
      if (productData.currentDescription) {
        textPrompt += `\n\nDescription existante à améliorer :\n"${productData.currentDescription}"`;
      }

      // Ajouter les spécifications si disponibles
      if (productData.specifications && Object.keys(productData.specifications).length > 0) {
        textPrompt += '\n\nSpécifications techniques :';
        for (const [key, value] of Object.entries(productData.specifications)) {
          textPrompt += `\n- ${key}: ${value}`;
        }
      }

      // Exemple de structure HTML attendue
      textPrompt += `\n\nCrée une fiche produit avec la structure HTML EXACTE suivante:

<h1>${productData.name}</h1>

<div class="wc-product-description">
  <p>[Rédige ici une description commerciale persuasive de 2-3 phrases maximum]</p>
</div>

<h2 class="wc-product-highlights">Points Forts</h2>
<ul>
  <li>[Avantage 1 - une phrase]</li>
  <li>[Avantage 2 - une phrase]</li>
  <li>[Avantage 3 - une phrase]</li>
  <li>[Avantage 4 - une phrase, si pertinent]</li>
</ul>

<h2 class="wc-product-specs">Caractéristiques Techniques</h2>
<table class="wc-specs-table">
  <tr><th>Caractéristique</th><th>Détail</th></tr>
  [Ajoute ici 5-8 lignes avec toutes les spécifications importantes du produit]
</table>

<h2 class="wc-product-usage">Conseils d'utilisation</h2>
<p>[Rédige ici 1-2 phrases avec des conseils d'utilisation pratiques]</p>

RÈGLES STRICTES:
1. Remplace les instructions entre crochets par du contenu réel, puis SUPPRIME les crochets
2. Utilise UNIQUEMENT les informations disponibles
3. Sois concis mais persuasif, chaque section doit être courte
4. Ne modifie PAS la structure HTML fournie
5. Ne génère AUCUN texte ou commentaire en dehors de cette structure HTML
6. N'utilise PAS de balises \`\`\`html ou \`\`\` autour du contenu
7. N'ajoute PAS de notes explicatives avant ou après le HTML

Limitations STRICTES:
- Maximum 50 mots pour la description initiale
- Maximum 4 points forts
- Maximum 8 lignes dans le tableau technique
- Maximum 30 mots pour les conseils d'utilisation

Ta réponse doit contenir UNIQUEMENT le HTML pur tel que montré, sans introduction ni conclusion.`;

      // Préparation de la requête
      const requestData = {
        contents: [
          {
            role: 'user',
            parts: [{ text: textPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3, // Température réduite pour plus de conformité
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
      // Format du contexte initial avec des instructions claires
      let systemContext = `Tu es un assistant spécialisé dans la création de fiches produit e-commerce WooCommerce.
      Chacune de tes réponses doit être une fiche produit en HTML pur, sans commentaires ni explications.
      
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

      // Préparation du message utilisateur final avec instructions optimisées
      // Modifiez votre prompt pour inclure des styles CSS inline
      const optimizedPrompt = `
Crée une fiche produit e-commerce pour "${productData.name}" avec la structure HTML EXACTE suivante:

<div class="wc-product-container" style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0;">
  <h1 style="font-size: 24px; margin: 0 0 15px 0; padding: 0; color: #333;">[Titre court et accrocheur]</h1>
  
  <div class="wc-product-description" style="margin: 0 0 20px 0;">
    <p style="margin: 0; padding: 0;">[Rédige ici une description commerciale persuasive de 2-3 phrases maximum]</p>
  </div>
  
  <h2 style="font-size: 20px; margin: 25px 0 15px 0; padding: 0; color: #333;">Points Forts</h2>
  <ul style="margin: 0 0 20px 0; padding: 0 0 0 20px; list-style-type: disc;">
    <li style="margin: 0 0 8px 0; padding: 0;">[Avantage 1 - une phrase]</li>
    <li style="margin: 0 0 8px 0; padding: 0;">[Avantage 2 - une phrase]</li>
    <li style="margin: 0 0 8px 0; padding: 0;">[Avantage 3 - une phrase]</li>
    <li style="margin: 0 0 0 0; padding: 0;">[Avantage 4 - une phrase, si pertinent]</li>
  </ul>
  
  <h2 style="font-size: 20px; margin: 25px 0 15px 0; padding: 0; color: #333;">Caractéristiques Techniques</h2>
  <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px 0;">
    <tr style="background-color: #f5f5f5;">
      <th style="text-align: left; padding: 10px; border: 1px solid #ddd; width: 40%;">Caractéristique</th>
      <th style="text-align: left; padding: 10px; border: 1px solid #ddd; width: 60%;">Détail</th>
    </tr>
    [Ajoute ici 5-8 lignes avec toutes les spécifications importantes du produit, avec ce format]
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">[Nom caractéristique]</td>
      <td style="padding: 10px; border: 1px solid #ddd;">[Valeur]</td>
    </tr>
  </table>
  
  <h2 style="font-size: 20px; margin: 25px 0 15px 0; padding: 0; color: #333;">Conseils d'utilisation</h2>
  <p style="margin: 0; padding: 0;">[Rédige ici 1-2 phrases avec des conseils d'utilisation pratiques]</p>
</div>

RÈGLES STRICTES:
1. Remplace les instructions entre crochets par du contenu réel, puis SUPPRIME les crochets
2. Conserve TOUS les attributs style="..." exactement comme indiqués
3. Utilise UNIQUEMENT les informations disponibles dans cette conversation ou visibles sur les images
4. Ne modifie PAS la structure HTML fournie
5. Ne génère AUCUN texte ou commentaire en dehors de cette structure HTML
6. N'utilise PAS de balises \`\`\`html ou \`\`\` autour du contenu

Voici un exemple du résultat attendu pour un casque:

<div class="wc-product-container" style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0;">
  <h1 style="font-size: 24px; margin: 0 0 15px 0; padding: 0; color: #333;">Casque Audio Bluetooth Premium</h1>
  
  <div class="wc-product-description" style="margin: 0 0 20px 0;">
    <p style="margin: 0; padding: 0;">Ce casque sans fil offre une qualité sonore exceptionnelle avec une autonomie de 30 heures. Sa technologie de réduction de bruit active vous plonge dans une expérience d'écoute immersive.</p>
  </div>
  
  <h2 style="font-size: 20px; margin: 25px 0 15px 0; padding: 0; color: #333;">Points Forts</h2>
  <ul style="margin: 0 0 20px 0; padding: 0 0 0 20px; list-style-type: disc;">
    <li style="margin: 0 0 8px 0; padding: 0;">Autonomie exceptionnelle de 30 heures</li>
    <li style="margin: 0 0 8px 0; padding: 0;">Réduction de bruit active</li>
    <li style="margin: 0 0 8px 0; padding: 0;">Commandes tactiles intuitives</li>
    <li style="margin: 0 0 0 0; padding: 0;">Pliable et léger pour un transport facile</li>
  </ul>
  
  <h2 style="font-size: 20px; margin: 25px 0 15px 0; padding: 0; color: #333;">Caractéristiques Techniques</h2>
  <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px 0;">
    <tr style="background-color: #f5f5f5;">
      <th style="text-align: left; padding: 10px; border: 1px solid #ddd; width: 40%;">Caractéristique</th>
      <th style="text-align: left; padding: 10px; border: 1px solid #ddd; width: 60%;">Détail</th>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">Type</td>
      <td style="padding: 10px; border: 1px solid #ddd;">Circum-aural fermé</td>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">Connectivité</td>
      <td style="padding: 10px; border: 1px solid #ddd;">Bluetooth 5.0</td>
    </tr>
  </table>
  
  <h2 style="font-size: 20px; margin: 25px 0 15px 0; padding: 0; color: #333;">Conseils d'utilisation</h2>
  <p style="margin: 0; padding: 0;">Chargez complètement le casque avant la première utilisation et conservez-le dans l'étui de protection inclus lorsqu'il n'est pas utilisé.</p>
</div>

Ta réponse doit contenir UNIQUEMENT le HTML pur tel que montré, sans introduction ni conclusion.`;

      const userParts = [
        {
          text: userMessage + '\n\n' + optimizedPrompt,
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
