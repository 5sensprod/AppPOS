// services/gemini/prompts/productTitleGenerator.js
/**
 * Génère un prompt pour créer un titre de produit avec qualificatif technique pertinent
 * @param {Object} productData Les données du produit
 * @returns {string} Le prompt pour générer un titre
 */
function getProductTitlePrompt(productData) {
  // Extraire les informations clés
  const category = productData.category || 'produit';
  const brand = productData.brand || '';

  // Extraire et préparer la description
  let description = '';
  if (productData.currentDescription) {
    description = productData.currentDescription;
  } else if (productData.description) {
    description = productData.description;
  } else if (productData.description_short) {
    description = productData.description_short;
  }

  // Extraire le texte des balises HTML si nécessaire
  if (description && description.includes('<')) {
    description = description
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Construire un prompt qui utilise explicitement la description
  let optimizedPrompt = `
  Crée un titre simple pour ce ${category} de la marque ${brand} destiné à une boutique de musique en ligne.
 
  RÈGLES STRICTES:
  1. Le titre doit être COURT (2-4 mots maximum, sans compter la marque)
  2. TOUJOURS INCLURE LA MARQUE "${brand}" À LA FIN DU TITRE si fournie
  3. ANALYSE ATTENTIVEMENT LA DESCRIPTION DU PRODUIT pour identifier précisément le type de produit et ses caractéristiques clés
  
  FORMATS SELON LE TYPE DE PRODUIT:
  
  A) Pour les INSTRUMENTS et ÉQUIPEMENTS:
     Format: "[Type de produit] [Qualificatif technique pertinent] ${brand}"
     Exemples: "Casque Studio PRODIPE", "Guitare Électrique FENDER"
  
  B) Pour les ACCESSOIRES et HOUSSES:
     Format: "[Type d'accessoire] pour [instrument concerné précis] ${brand}"
     Exemples: "Housse pour Guitare Acoustique GATOR", "Support pour Micro KONIG"
  
  4. SEULEMENT inclure un qualificatif technique s'il est IMPORTANT et PERTINENT
  5. Pour les accessoires, TOUJOURS préciser l'instrument PRÉCIS concerné (pas juste "Instruments" mais "Guitare Acoustique", "Micro", etc.)
  6. UTILISER LES TERMES EXACTS mentionnés dans la description`;

  // Ajouter la description en la mettant très en évidence
  if (description) {
    optimizedPrompt += `
  
  ===========================================
  DESCRIPTION DU PRODUIT (À LIRE ATTENTIVEMENT):
  ===========================================
  ${description}
  ===========================================`;
  }

  // Finaliser le prompt avec des exemples
  optimizedPrompt += `
  
  EXEMPLES DE TITRES BIEN FORMULÉS:
  - Casque Studio PRODIPE
  - Micro Dynamique SHURE
  - Guitare Électrique FENDER
  - Housse pour Guitare Acoustique GATOR (PAS "Housse pour Instruments")
  - Support pour Micro K&M
  
  SI LE PRODUIT EST UNE HOUSSE ET QUE LA DESCRIPTION MENTIONNE "GUITARE ACOUSTIQUE", LE TITRE DOIT ÊTRE "Housse pour Guitare Acoustique ${brand}" ET NON PAS "Housse pour Instruments ${brand}".
  
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
  const brand = productData.brand || '';

  // Intégrer la marque à la fin si disponible
  const brandSuffix = brand ? ` ${brand}` : '';

  // Déterminer si c'est un accessoire
  const isAccessory = /hous|support|étui|cable|cordon|sangle|stand|pied|alimentation/i.test(
    category
  );

  // Utiliser la catégorie parente ou une catégorie par défaut pour les accessoires
  const forInstrument = isAccessory ? ' pour Guitare' : '';

  const prefixMap = {
    // Instruments
    casque: `Casque Studio${brandSuffix}`,
    audio: `Système Audio${brandSuffix}`,
    guitare: `Guitare Électrique${brandSuffix}`,
    basse: `Basse Électrique${brandSuffix}`,
    ampli: `Ampli Lampes${brandSuffix}`,
    micro: `Micro Dynamique${brandSuffix}`,
    clavier: `Clavier Synthétiseur${brandSuffix}`,
    enceinte: `Enceinte Active${brandSuffix}`,
    batterie: `Batterie Acoustique${brandSuffix}`,

    // Accessoires
    housse: `Housse pour Guitare Acoustique${brandSuffix}`,
    étui: `Étui pour Guitare Électrique${brandSuffix}`,
    support: `Support pour Micro${brandSuffix}`,
    stand: `Stand pour Clavier${brandSuffix}`,
    cable: `Câble Instrument${brandSuffix}`,
    sangle: `Sangle pour Guitare${brandSuffix}`,
  };

  // Retourne un titre par défaut selon la catégorie ou un titre générique
  if (prefixMap[category.toLowerCase()]) {
    return prefixMap[category.toLowerCase()];
  } else if (isAccessory) {
    return `${category}${forInstrument}${brandSuffix}`;
  } else {
    return `${category}${brandSuffix}`;
  }
}

module.exports = {
  getProductTitlePrompt,
  generateExampleTitle,
};
