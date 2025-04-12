// services/gemini/prompts/productTitleGenerator.js

/**
 * Génère un prompt pour créer un titre de produit optimisé pour WooCommerce
 * @param {Object} productData Les données du produit
 * @returns {string} Le prompt pour générer un titre
 */
function getProductTitlePrompt(productData) {
  const optimizedPrompt = `
  Crée un titre court et accrocheur pour ce ${productData.category || 'produit'} destiné à une boutique en ligne.
  
  RÈGLES STRICTES:
  1. Le titre doit être COURT (généralement 2-5 mots, maximum 50 caractères)
  2. Le titre doit être COMMERCIAL et ATTRACTIF
  3. NE PAS inclure la référence ou SKU dans le titre
  4. Le titre doit être DESCRIPTIF et donner une idée claire du produit
  5. Le titre peut inclure un adjectif qualificatif (Professionnel, Premium, Ultra, etc.) si pertinent
  6. Le titre peut mentionner une caractéristique clé si elle est vraiment différenciante
  7. Adapter le niveau de langage à un public de ${productData.targetAudience || 'consommateurs'}
  
  Informations sur le produit: ${JSON.stringify(productData)}
  
  Réponds UNIQUEMENT avec le titre, sans guillemets, sans préfixe, sans introduction ni explication.`;

  return optimizedPrompt;
}

/**
 * Fonction simplifiée pour générer directement un titre de produit (pour les tests)
 * @param {Object} productData Les données du produit
 * @returns {string} Un exemple de titre
 */
function generateExampleTitle(productData) {
  // Cette fonction pourrait être utilisée pour des tests ou des démonstrations
  // sans avoir à appeler l'API Gemini

  const category = productData.category || '';

  const prefixMap = {
    casque: 'Casque Studio Professionnel',
    audio: 'Système Audio Premium',
    guitare: 'Guitare Électrique Signature',
    ampli: 'Amplificateur Haute-Fidélité',
    micro: 'Microphone Broadcast Pro',
    vêtement: 'Veste Performance Tech',
    chaussure: 'Chaussures Ultra Confort',
    outil: 'Kit Outillage Pro',
    perceuse: 'Perceuse Sans Fil MaxPower',
  };

  // Retourne un titre par défaut selon la catégorie ou un titre générique
  return prefixMap[category.toLowerCase()] || `${category} Premium`;
}

module.exports = {
  getProductTitlePrompt,
  generateExampleTitle,
};
