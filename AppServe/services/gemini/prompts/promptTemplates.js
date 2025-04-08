// services/gemini/prompts/promptTemplates.js

/**
 * Crée un template de produit universel avec styles CSS inline
 * @param {Object} styles Les styles CSS inline à appliquer
 * @returns {string} Le template HTML avec styles
 */
function createUniversalProductTemplate(styles) {
  return `
  <div class="wc-product-container" style="${styles.container}">
    <!-- Titre principal - court et attractif -->
    <h1 style="${styles.title}">[Titre court et accrocheur]</h1>
    
    <!-- Description qui DOIT commencer par "Le/La [type de produit] [SKU/UGS]" -->
    <div class="wc-product-description" style="${styles.descriptionContainer}">
      <p style="${styles.descriptionText}">Le/La [type de produit] [référence] [suite de la description commerciale persuasive]. [Ajoutez une seconde phrase si nécessaire].</p>
    </div>
    
    <h2 style="${styles.sectionTitle}">Points Forts</h2>
    <ul style="${styles.listContainer}">
      <li style="${styles.listItem}">[Avantage 1 - une phrase]</li>
      <li style="${styles.listItem}">[Avantage 2 - une phrase]</li>
      <li style="${styles.listItem}">[Avantage 3 - une phrase]</li>
      <li style="${styles.listLastItem}">[Avantage 4 - une phrase, si pertinent]</li>
    </ul>
    
    <h2 style="${styles.sectionTitle}">Caractéristiques Techniques</h2>
    <table style="${styles.tableContainer}">
      <tr style="${styles.tableHeaderRow}">
        <th style="${styles.tableHeaderCell}">Caractéristique</th>
        <th style="${styles.tableHeaderCellValue}">Détail</th>
      </tr>
      <tr>
        <td style="${styles.tableCell}">[Nom caractéristique 1]</td>
        <td style="${styles.tableCell}">[Valeur 1]</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">[Nom caractéristique 2]</td>
        <td style="${styles.tableCell}">[Valeur 2]</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">[Nom caractéristique 3]</td>
        <td style="${styles.tableCell}">[Valeur 3]</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">[Nom caractéristique 4]</td>
        <td style="${styles.tableCell}">[Valeur 4]</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">[Nom caractéristique 5]</td>
        <td style="${styles.tableCell}">[Valeur 5]</td>
      </tr>
    </table>
    
    <h2 style="${styles.sectionTitle}">Conseils d'utilisation</h2>
    <p style="${styles.descriptionText}">[Rédige ici 1-2 phrases avec des conseils d'utilisation pratiques]</p>
  </div>`;
}

/**
 * Crée un exemple de fiche produit complétée
 * @param {string} productType Type de produit (casque, veste, etc.)
 * @param {Object} styles Les styles CSS inline
 * @returns {string} L'exemple HTML complet
 */
function createProductExample(productType, styles) {
  // Pour simplifier, nous allons utiliser un seul exemple pour un casque
  // Dans une implémentation complète, vous pourriez avoir différents exemples pour différents types de produits

  if (productType === 'casque' || productType === 'audio') {
    return `
  <div class="wc-product-container" style="${styles.container}">
    <h1 style="${styles.title}">Casque Studio Professionnel</h1>
    
    <div class="wc-product-description" style="${styles.descriptionContainer}">
      <p style="${styles.descriptionText}">Le casque 3000B offre une isolation phonique exceptionnelle et un confort optimal pour les longues sessions d'enregistrement. Sa conception légère et son design fermé garantissent une restitution sonore fidèle, idéale pour le monitoring en studio.</p>
    </div>
    
    <h2 style="${styles.sectionTitle}">Points Forts</h2>
    <ul style="${styles.listContainer}">
      <li style="${styles.listItem}">Isolation phonique professionnelle</li>
      <li style="${styles.listItem}">Conception légère (233g)</li>
      <li style="${styles.listItem}">Bandeau réglable pour un confort optimal</li>
      <li style="${styles.listLastItem}">Design fermé pour une meilleure atténuation du bruit</li>
    </ul>
    
    <h2 style="${styles.sectionTitle}">Caractéristiques Techniques</h2>
    <table style="${styles.tableContainer}">
      <tr style="${styles.tableHeaderRow}">
        <th style="${styles.tableHeaderCell}">Caractéristique</th>
        <th style="${styles.tableHeaderCellValue}">Détail</th>
      </tr>
      <tr>
        <td style="${styles.tableCell}">Impédance</td>
        <td style="${styles.tableCell}">320 Ohms</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">Sensibilité</td>
        <td style="${styles.tableCell}">95dB (±3dB)</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">Réponse en fréquence</td>
        <td style="${styles.tableCell}">15Hz à 22kHz</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">Type de casque</td>
        <td style="${styles.tableCell}">Fermé circum-aural</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">Poids</td>
        <td style="${styles.tableCell}">233g</td>
      </tr>
    </table>
    
    <h2 style="${styles.sectionTitle}">Conseils d'utilisation</h2>
    <p style="${styles.descriptionText}">Pour une meilleure immersion sonore, assurez-vous que les coussinets entourent complètement vos oreilles et ajustez le bandeau pour un port confortable.</p>
  </div>`;
  } else {
    // Retourner un exemple générique si le type de produit n'est pas reconnu
    return createUniversalProductTemplate(styles);
  }
}

module.exports = {
  createUniversalProductTemplate,
  createProductExample,
};
