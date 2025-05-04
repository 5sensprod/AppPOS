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
Crée une fiche produit e-commerce complète et détaillée pour ce ${productData.category || 'produit'} avec la structure HTML EXACTE suivante:
${template}
RÈGLES STRICTES:
1. Pour le titre principal (h1):
   - Crée un titre court et commercial (généralement 2-5 mots)
   - Évite d'y mettre le numéro de référence ou SKU
   - Prends en compte le message de l'utilisateur pour choisir ce titre

2. Pour la description:
   - TRÈS IMPORTANT: La description DOIT commencer par "Le/La [type de produit]"
   - Exemple: "Le casque 3000B offre..." ou "La perceuse XDR-500 combine..."
   - Utilise le bon article (Le/La/L') selon le type de produit
   - Évite d'y mettre le numéro de référence ou SKU
   - DÉVELOPPE une description riche et commerciale (100-150 mots)
   - Structure la description en 2-3 paragraphes avec des éléments convaincants
   - Met en avant l'expertise, la qualité, les matériaux et l'usage du produit
   - Inspire-toi de l'exemple: "Chez Prodipe Guitars, nous aimons les défis et nous préférons faire des basses à partir de 229 € qui défient celles à 400 ou 600 €..."

3. Points forts:
   - Inclus entre 4 et 8 points forts pertinents selon la complexité du produit
   - Chaque point fort doit être percutant et unique (une phrase par point)
   - Ne liste que les caractéristiques vraiment différenciantes pour le client

4. Caractéristiques techniques:
   - Inclus entre 8 et 13 caractéristiques techniques pertinentes
   - Adapte les spécifications au type de produit concerné
   - Privilégie les spécifications qui aident à la décision d'achat
   - Organise-les des plus importantes aux moins importantes
   - Ne laisse jamais de ligne avec une cellule detail vide

5. Conseils d'utilisation:
   - Rédige entre 30 et 50 mots de conseils pratiques
   - Inclus au moins 2 conseils spécifiques et utiles
   - Aide l'utilisateur à tirer le meilleur parti du produit
   - La dernière ohrase doit être complete

6. Formatage général:
   - Remplace les instructions entre crochets par du contenu réel, puis SUPPRIME les crochets
   - Conserve TOUS les attributs style="..." exactement comme indiqués
   - Ne génère AUCUN texte ou commentaire en dehors de cette structure HTML
   - N'utilise PAS de balises \`\`\`html ou \`\`\` autour du contenu

Utilise les informations du produit fournies: ${JSON.stringify(productData)}
Prends également en compte toutes les informations fournies par l'utilisateur dans son message et les images s'il en a envoyé.
Ta réponse doit contenir UNIQUEMENT le HTML pur tel que montré, sans introduction ni conclusion.`;

  return optimizedPrompt;
}

module.exports = { getChatResponsePrompt };
