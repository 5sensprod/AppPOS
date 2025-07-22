// services/gemini/prompts/chatResponse.js - Version ultra-légère

/**
 * Génère un prompt simplifié pour les réponses de chat
 * @param {Object} productData Les données du produit
 * @returns {string} Le prompt formaté avec template intégré
 */
function getChatResponsePrompt(productData) {
  return `
Crée une fiche produit e-commerce HTML complète pour "${productData.name || 'ce produit'}" avec cette structure :

<div class="wc-product-container" style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0;">
  <h1 style="font-size: 24px; margin: 0 0 15px 0; padding: 0; color: #333;">[Titre court et commercial]</h1>
  
  <div class="wc-product-description" style="margin: 0 0 20px 0;">
    <p style="margin: 0; padding: 0;">[Description commençant par "Le/La [produit]" - 2-3 phrases commerciales]</p>
    <p style="margin: 0; padding: 0;">[2ème paragraphe développant qualités et usage]</p>
  </div>
  
  <h2 style="font-size: 20px; margin: 25px 0 15px 0; padding: 0; color: #333;">Points Forts</h2>
  <ul style="margin: 0 0 20px 0; padding: 0 0 0 20px; list-style-type: disc;">
    <li style="margin: 0 0 8px 0; padding: 0;">[Avantage 1]</li>
    <li style="margin: 0 0 8px 0; padding: 0;">[Avantage 2]</li>
    <li style="margin: 0 0 8px 0; padding: 0;">[Avantage 3]</li>
    <li style="margin: 0 0 8px 0; padding: 0;">[Avantage 4]</li>
    <li style="margin: 0 0 0 0; padding: 0;">[Plus d'avantages si pertinent]</li>
  </ul>
  
  <h2 style="font-size: 20px; margin: 25px 0 15px 0; padding: 0; color: #333;">Caractéristiques Techniques</h2>
  <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px 0;">
    <tr style="background-color: #f5f5f5;">
      <th style="text-align: left; padding: 10px; border: 1px solid #ddd; width: 40%;">Caractéristique</th>
      <th style="text-align: left; padding: 10px; border: 1px solid #ddd; width: 60%;">Détail</th>
    </tr>
    <tr><td style="padding: 10px; border: 1px solid #ddd;">[Spec 1]</td><td style="padding: 10px; border: 1px solid #ddd;">[Valeur 1]</td></tr>
    <tr><td style="padding: 10px; border: 1px solid #ddd;">[Spec 2]</td><td style="padding: 10px; border: 1px solid #ddd;">[Valeur 2]</td></tr>
    [Ajoute 6-10 spécifications selon le produit]
  </table>
  
  <h2 style="font-size: 20px; margin: 25px 0 15px 0; padding: 0; color: #333;">Conseils d'utilisation</h2>
  <p style="margin: 0; padding: 0;">[2-3 conseils pratiques en 30-50 mots pour optimiser l'usage du produit]</p>
</div>

RÈGLES :
- Remplace les textes entre crochets par du contenu réel
- La description DOIT commencer par "Le/La [type de produit]"
- Conserve TOUS les styles CSS exactement comme indiqués
- 4-8 points forts percutants selon la complexité du produit
- 8-12 spécifications techniques pertinentes
- Réponds UNIQUEMENT avec le HTML final, sans commentaires

Informations produit disponibles :
${productData.category ? `- Catégorie: ${productData.category}` : ''}
${productData.brand ? `- Marque: ${productData.brand}` : ''}
${productData.price ? `- Prix: ${productData.price}€` : ''}
${productData.currentDescription ? `- Description existante: ${productData.currentDescription.replace(/<[^>]*>/g, ' ').trim()}` : ''}`;
}

module.exports = { getChatResponsePrompt };
