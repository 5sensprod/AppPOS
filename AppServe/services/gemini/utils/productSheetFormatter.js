// services/gemini/utils/productSheetFormatter.js

/**
 * Formate un objet JSON de fiche produit en HTML stylisé pour WooCommerce
 * @param {Object} productSheet - L'objet contenant les données structurées du produit
 * @returns {string} Le HTML formaté avec styles inline
 */
function formatProductSheetToHtml(productSheet) {
  // Vérifier la structure
  if (!productSheet || !productSheet.product) {
    throw new Error('Structure de fiche produit invalide');
  }

  const product = productSheet.product;

  // Validation des champs requis
  if (!product.title || !product.description || !product.highlights) {
    throw new Error('Champs obligatoires manquants dans la fiche produit');
  }

  // Vérifier que les spécifications existent et sont un tableau
  if (!product.specifications || !Array.isArray(product.specifications)) {
    product.specifications = [];
  }

  // Construire le tableau des spécifications
  const specsRows = product.specifications
    .map(
      (spec) =>
        `    <tr><td style="padding: 10px; border: 1px solid #ddd;">${spec.name}</td><td style="padding: 10px; border: 1px solid #ddd;">${spec.value}</td></tr>`
    )
    .join('\n');

  // Construire la liste des points forts
  const highlightsList = product.highlights
    .map(
      (h, i) =>
        `    <li style="margin: 0 0 ${i === product.highlights.length - 1 ? '0' : '8'}px 0; padding: 0;">${h}</li>`
    )
    .join('\n');

  // Générer le HTML final
  return `<div class="wc-product-container" style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0;">
  <h1 style="font-size: 24px; margin: 0 0 15px 0; padding: 0; color: #333;">${product.title}</h1>
  
  <div class="wc-product-description" style="margin: 0 0 20px 0;">
    <p style="margin: 0 0 10px 0; padding: 0;">${product.description.intro}</p>
    <p style="margin: 0; padding: 0;">${product.description.details}</p>
  </div>

  <h2 style="font-size: 20px; margin: 25px 0 15px 0; padding: 0; color: #333;">Points Forts</h2>
  <ul style="margin: 0 0 20px 0; padding: 0 0 0 20px; list-style-type: disc;">
${highlightsList}
  </ul>

  <h2 style="font-size: 20px; margin: 25px 0 15px 0; padding: 0; color: #333;">Caractéristiques Techniques</h2>
  <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px 0;">
    <tr style="background-color: #f5f5f5;">
      <th style="text-align: left; padding: 10px; border: 1px solid #ddd; width: 40%;">Caractéristique</th>
      <th style="text-align: left; padding: 10px; border: 1px solid #ddd; width: 60%;">Détail</th>
    </tr>
${specsRows}
  </table>

  <h2 style="font-size: 20px; margin: 25px 0 15px 0; padding: 0; color: #333;">Conseils d'utilisation</h2>
  <p style="margin: 0; padding: 0;">${product.usage_tips}</p>
</div>`;
}

/**
 * Extrait les informations du JSON brut de Gemini
 * Gère les cas où Gemini renvoie du texte avant/après le JSON
 * @param {string} rawResponse - La réponse brute de Gemini
 * @returns {Object} L'objet JSON parsé
 */
function extractJsonFromResponse(rawResponse) {
  let cleaned = rawResponse.trim();

  // Supprimer les blocs markdown
  cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');

  // Trouver le JSON dans la réponse
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`Impossible de parser le JSON de Gemini: ${error.message}`);
  }
}

module.exports = {
  formatProductSheetToHtml,
  extractJsonFromResponse,
};
