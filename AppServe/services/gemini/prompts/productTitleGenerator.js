// services/gemini/prompts/productTitleGenerator.js - Version simplifiée
/**
 * Génère un prompt simple pour créer un titre de produit
 * @param {Object} productData Les données du produit
 * @returns {string} Le prompt pour générer un titre
 */
function getProductTitlePrompt(productData) {
  let prompt = `Génère un titre commercial attractif pour ce produit e-commerce.

Informations disponibles :`;

  if (productData.name) {
    prompt += `\n- Nom actuel : ${productData.name}`;
  }
  if (productData.category) {
    prompt += `\n- Catégorie : ${productData.category}`;
  }
  if (productData.brand) {
    prompt += `\n- Marque : ${productData.brand}`;
  }
  if (productData.currentDescription) {
    // Nettoyer le HTML de la description
    const cleanDescription = productData.currentDescription
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    prompt += `\n- Description : ${cleanDescription}`;
  }

  prompt += `

INSTRUCTIONS :
- Crée un titre court et accrocheur (maximum 60 caractères)
- Inclus la marque si elle est fournie
- Inspire-toi de la description pour identifier les caractéristiques importantes
- Évite les caractères spéciaux
- Réponds UNIQUEMENT avec le titre, sans guillemets ni explication

Titre :`;

  return prompt;
}

module.exports = {
  getProductTitlePrompt,
};
