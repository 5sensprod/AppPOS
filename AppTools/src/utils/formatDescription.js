// src/utils/formatDescription.js

/**
 * Formate la description du produit pour l'affichage
 * Version simplifiée qui préserve le HTML généré par l'API
 * @param {string} description - La description HTML
 * @returns {string} - Description formatée
 */
export const formatDescriptionForDisplay = (description) => {
  if (!description || typeof description !== 'string') {
    return '';
  }

  // Minimaliste : ne nettoie que les balises markdown de code et les commentaires
  let cleaned = description;

  // Supprimer les marqueurs de code markdown
  cleaned = cleaned.replace(/```html/g, '');
  cleaned = cleaned.replace(/```/g, '');

  // Nettoyer les commentaires HTML
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  return cleaned;
};

/**
 * Nettoie le texte HTML généré par l'IA pour enlever les balises de code ou instructions
 * @param {string} content - Contenu généré par l'IA
 * @returns {string} - Contenu nettoyé
 */
export const cleanAIGeneratedContent = (content) => {
  if (!content) return '';

  return content
    .replace(/```html/g, '')
    .replace(/```/g, '')
    .trim();
};
