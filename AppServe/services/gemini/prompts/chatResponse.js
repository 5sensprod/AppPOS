// services/gemini/prompts/chatResponse.js - Version JSON optimisée

/**
 * Génère un prompt pour que Gemini retourne une fiche produit structurée en JSON
 * @param {Object} productData - Les données du produit
 * @returns {string} Le prompt formaté
 */
function getChatResponsePrompt(productData) {
  return `
Tu es un expert en rédaction e-commerce. Génère une fiche produit UNIQUEMENT au format JSON strict.

Structure JSON obligatoire :
{
  "product": {
    "title": "Titre accrocheur et commercial (max 70 caractères)",
    "description": {
      "intro": "Le/La [type de produit] - 2-3 phrases commerciales d'accroche",
      "details": "Paragraphe développant qualités, usage et bénéfices (2-3 phrases)"
    },
    "highlights": [
      "Point fort 1 : Bénéfice client",
      "Point fort 2 : Bénéfice client",
      "Point fort 3 : Bénéfice client",
      "Point fort 4 : Bénéfice client",
      "Point fort 5 : Bénéfice client",
      "Point fort 6 : Bénéfice client"
    ],
    "specifications": [
      { "name": "Caractéristique", "value": "Valeur" },
      { "name": "Autre caractéristique", "value": "Valeur" }
    ],
    "usage_tips": "2-3 conseils pratiques d'utilisation (30-50 mots)"
  }
}

Règles :
- Titre : Court et commercial avec marque, modèle et argument de vente
- Description intro : DOIT commencer par "Le" ou "La" + type de produit
- Points forts : 4-8 bénéfices clients selon la complexité du produit
- Spécifications : 8-12 caractéristiques techniques au format tableau JSON
- Conseils : Pratiques et concrets

Informations produit :
${productData.category ? `- Catégorie: ${productData.category}` : ''}
${productData.brand ? `- Marque: ${productData.brand}` : ''}
${productData.name ? `- Nom: ${productData.name}` : ''}
${productData.price ? `- Prix: ${productData.price}€` : ''}
${
  productData.currentDescription
    ? `- Description existante: ${productData.currentDescription
        .replace(/<[^>]*>/g, ' ')
        .trim()
        .substring(0, 300)}`
    : ''
}

IMPORTANT : Réponds UNIQUEMENT avec le JSON, sans texte ni explication avant ou après.`;
}

module.exports = { getChatResponsePrompt };
