// services/gemini/prompts/chatResponse.js
const styleConfig = require('../config/styleConfig');
const { createUniversalProductTemplate } = require('./promptTemplates');

/**
 * Génère un prompt pour les réponses de chat
 * @param {Object} productData Les données du produit
 * @returns {string} Le prompt formaté
 */
function getChatResponsePrompt(productData) {
  // Obtenir les styles inline
  const styles = styleConfig.getInlineStyles();

  // Créer le template de base
  let template = createUniversalProductTemplate(styles);

  // Construire le prompt spécifique au chat
  const optimizedPrompt = `
Crée une fiche produit e-commerce pour ce ${productData.category || 'produit'} avec la structure HTML EXACTE suivante:

${template}

RÈGLES STRICTES:
1. Pour le titre principal (h1):
   - Crée un titre court et commercial (généralement 2-5 mots)
   - Évite d'y mettre le numéro de référence ou SKU
   - Prends en compte le message de l'utilisateur pour choisir ce titre

2. Pour la description:
   - TRÈS IMPORTANT: La description DOIT commencer par "Le/La [type de produit] [SKU/UGS]" 
   - Exemple: "Le casque 3000B offre..." ou "La perceuse XDR-500 combine..."
   - Utilise le bon article (Le/La/L') selon le type de produit
   - Le SKU/référence doit être mentionné uniquement au début de la description

3. Remplace les instructions entre crochets par du contenu réel, puis SUPPRIME les crochets
4. Adapte les caractéristiques techniques au type de produit concerné
5. Conserve TOUS les attributs style="..." exactement comme indiqués
6. Ne génère AUCUN texte ou commentaire en dehors de cette structure HTML
7. N'utilise PAS de balises \`\`\`html ou \`\`\` autour du contenu

Limitations STRICTES:
- Maximum 50 mots pour la description initiale
- Maximum 4 points forts
- Maximum 8 lignes dans le tableau technique
- Maximum 30 mots pour les conseils d'utilisation

Utilise les informations du produit fournies: ${JSON.stringify(productData)}

Prends également en compte toutes les informations fournies par l'utilisateur dans son message et les images s'il en a envoyé.

Ta réponse doit contenir UNIQUEMENT le HTML pur tel que montré, sans introduction ni conclusion.`;

  return optimizedPrompt;
}

module.exports = { getChatResponsePrompt };
