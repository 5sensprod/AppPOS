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

  // Construire un prompt simple mais avec termes techniques pertinents
  let optimizedPrompt = `
  Crée un titre simple pour ce ${category} de la marque ${brand} destiné à une boutique de musique en ligne.
 
  RÈGLES STRICTES:
  1. Le titre doit être COURT (2-4 mots maximum, sans compter la marque)
  2. Format: "[Type de produit] [Qualificatif technique pertinent] ${brand}"
  3. SEULEMENT inclure un qualificatif technique s'il est IMPORTANT et PERTINENT (Studio, Dynamique, Condensateur, Électrique, etc.)
  4. ÉVITER les détails non essentiels comme les dimensions en mm, les impédances, etc.
  5. IMPORTANT: Utiliser les qualificatifs techniques standards du domaine musical
  6. TOUJOURS INCLURE LA MARQUE "${brand}" À LA FIN DU TITRE si fournie
  
  EXEMPLES DE BONS QUALIFICATIFS PAR CATÉGORIE:
  - Casque: Studio, Monitoring, DJ, Fermé, Ouvert
  - Microphone: Dynamique, Condensateur, USB, Cardioïde, Omnidirectionnel
  - Guitare: Électrique, Acoustique, Classique, Basse, Folk
  - Ampli: Lampes, Transistor, Combo, Tête
  - Clavier: Synthétiseur, MIDI, Workstation, Arrangeur
  
  EXEMPLES DE TITRES BIEN FORMULÉS:
  - Casque Studio PRODIPE (et non "Casque 40mm PRODIPE")
  - Micro Condensateur RODE (et non "Micro 48V RODE")
  - Guitare Électrique FENDER (et non "Guitare 6 Cordes FENDER")
  - Ampli Lampes MARSHALL (et non "Ampli 100W MARSHALL")
  
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

  const prefixMap = {
    casque: `Casque Studio${brandSuffix}`,
    audio: `Système Audio${brandSuffix}`,
    guitare: `Guitare Électrique${brandSuffix}`,
    basse: `Basse Électrique${brandSuffix}`,
    ampli: `Ampli Lampes${brandSuffix}`,
    micro: `Micro Dynamique${brandSuffix}`,
    table: `Table de Mixage${brandSuffix}`,
    clavier: `Clavier Synthétiseur${brandSuffix}`,
    enceinte: `Enceinte Active${brandSuffix}`,
    batterie: `Batterie Acoustique${brandSuffix}`,
  };

  // Retourne un titre par défaut selon la catégorie ou un titre générique
  return prefixMap[category.toLowerCase()] || `${category}${brandSuffix}`;
}

module.exports = {
  getProductTitlePrompt,
  generateExampleTitle,
};
