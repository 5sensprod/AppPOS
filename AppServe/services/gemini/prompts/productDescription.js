// services/gemini/prompts/productDescription.js
const styleConfig = require('../config/styleConfig');
const { createUniversalProductTemplate } = require('./promptTemplates');

/**
 * Génère un prompt pour la création de description de produit
 * @param {Object} productData Les données du produit
 * @returns {string} Le prompt formaté
 */
function getProductDescriptionPrompt(productData) {
  // Obtenir les styles inline
  const styles = styleConfig.getInlineStyles();

  // Créer le template de base
  let template = createUniversalProductTemplate(styles);

  // Construire le prompt complet
  let prompt = `
Tu es un expert en rédaction de fiches produit pour un site e-commerce WooCommerce.
      
Crée une description commerciale HTML pour ce produit : "${productData.name || ''}"

Informations disponibles :`;

  // Ajouter les informations du produit
  if (productData.category) {
    prompt += `\n- Catégorie : ${productData.category}`;
  }

  if (productData.brand) {
    prompt += `\n- Marque : ${productData.brand}`;
  }

  if (productData.price) {
    prompt += `\n- Prix : ${productData.price} €`;
  }

  if (productData.sku) {
    prompt += `\n- Référence/SKU : ${productData.sku}`;
  }

  // Ajouter la description actuelle si disponible
  if (productData.currentDescription) {
    prompt += `\n\nDescription existante à améliorer :\n"${productData.currentDescription}"`;
  }

  // Ajouter les spécifications si disponibles
  if (productData.specifications && Object.keys(productData.specifications).length > 0) {
    prompt += '\n\nSpécifications techniques :';
    for (const [key, value] of Object.entries(productData.specifications)) {
      prompt += `\n- ${key}: ${value}`;
    }
  }

  // Ajouter le template et les instructions
  prompt += `\n\n${template}`;

  // Ajouter les exemples et instructions
  prompt += `
RÈGLES STRICTES:
1. Pour le titre principal (h1):
   - Crée un titre court et commercial (généralement 2-5 mots)
   - Évite d'y mettre le numéro de référence ou SKU
   - Exemple: "Casque Studio Professionnel" plutôt que "Casque Studio Professionnel 3000B"

2. Pour la description:
   - TRÈS IMPORTANT: La description DOIT commencer par "Le/La [type de produit] [SKU/UGS]" 
   - Exemple: "Le casque 3000B offre..." ou "La perceuse XDR-500 combine..."
   - Utilise le bon article (Le/La/L') selon le type de produit
   - Le SKU/référence doit être mentionné uniquement au début de la description

3. Remplace les instructions entre crochets par du contenu réel, puis SUPPRIME les crochets
4. Conserve TOUS les attributs style="..." exactement comme indiqués
5. Ne génère AUCUN texte ou commentaire en dehors de cette structure HTML
6. N'utilise PAS de balises \`\`\`html ou \`\`\` autour du contenu

Limitations STRICTES:
- Maximum 50 mots pour la description initiale
- Maximum 4 points forts
- Maximum 8 lignes dans le tableau technique
- Maximum 30 mots pour les conseils d'utilisation

Ta réponse doit contenir UNIQUEMENT le HTML pur tel que montré, sans introduction ni conclusion.`;

  return prompt;
}

module.exports = { getProductDescriptionPrompt };
