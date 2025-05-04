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
    
    <!-- Description qui DOIT commencer par "Le/La [type de produit]" -->
    <div class="wc-product-description" style="${styles.descriptionContainer}">
      <p style="${styles.descriptionText}">Le/La [type de produit] [référence] [suite de la description commerciale persuasive]. [Ajoutez plusieurs phrases convaincantes ici]. [Développez un second paragraphe sur la qualité et les avantages du produit].</p>
      <p style="${styles.descriptionText}">[Ajoutez un paragraphe supplémentaire si nécessaire pour décrire les utilisations ou l'histoire du produit].</p>
    </div>
    
    <h2 style="${styles.sectionTitle}">Points Forts</h2>
    <ul style="${styles.listContainer}">
      <li style="${styles.listItem}">[Avantage 1 - une phrase percutante]</li>
      <li style="${styles.listItem}">[Avantage 2 - une phrase percutante]</li>
      <li style="${styles.listItem}">[Avantage 3 - une phrase percutante]</li>
      <li style="${styles.listItem}">[Avantage 4 - une phrase percutante]</li>
      <li style="${styles.listItem}">[Avantage 5 - une phrase percutante, si pertinent]</li>
      <li style="${styles.listItem}">[Avantage 6 - une phrase percutante, si pertinent]</li>
      <li style="${styles.listItem}">[Avantage 7 - une phrase percutante, si pertinent]</li>
      <li style="${styles.listLastItem}">[Avantage 8 - une phrase percutante, si pertinent]</li>
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
      <tr>
        <td style="${styles.tableCell}">[Nom caractéristique 6]</td>
        <td style="${styles.tableCell}">[Valeur 6]</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">[Nom caractéristique 7]</td>
        <td style="${styles.tableCell}">[Valeur 7]</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">[Nom caractéristique 8]</td>
        <td style="${styles.tableCell}">[Valeur 8]</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">[Nom caractéristique 9, si pertinent]</td>
        <td style="${styles.tableCell}">[Valeur 9]</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">[Nom caractéristique 10, si pertinent]</td>
        <td style="${styles.tableCell}">[Valeur 10]</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">[Nom caractéristique 11, si pertinent]</td>
        <td style="${styles.tableCell}">[Valeur 11]</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">[Nom caractéristique 12, si pertinent]</td>
        <td style="${styles.tableCell}">[Valeur 12]</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">[Nom caractéristique 13, si pertinent]</td>
        <td style="${styles.tableCell}">[Valeur 13]</td>
      </tr>
    </table>
    
    <h2 style="${styles.sectionTitle}">Conseils d'utilisation</h2>
    <p style="${styles.descriptionText}">[Rédige ici 3-4 phrases avec des conseils d'utilisation pratiques et spécifiques. Inclus au moins 2 conseils distincts qui aideront l'utilisateur à tirer le meilleur parti du produit.]</p>
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
      <p style="${styles.descriptionText}">Le casque 3000B offre une isolation phonique exceptionnelle et un confort optimal pour les longues sessions d'enregistrement. Sa conception légère et son design fermé garantissent une restitution sonore fidèle, idéale pour le monitoring en studio. Chez Audio Professional, nous défions les standards de l'industrie en proposant des équipements qui rivalisent avec des modèles bien plus coûteux.</p>
      <p style="${styles.descriptionText}">Notre approche repose sur deux piliers fondamentaux : sincérité dans la fabrication avec un soin particulier apporté aux matériaux et générosité dans l'équipement technique. Le casque 3000B bénéficie d'une conception acoustique avancée et de transducteurs haute-fidélité pour une expérience d'écoute immersive.</p>
    </div>
    
    <h2 style="${styles.sectionTitle}">Points Forts</h2>
    <ul style="${styles.listContainer}">
      <li style="${styles.listItem}">Isolation phonique professionnelle avec réduction de bruit passive</li>
      <li style="${styles.listItem}">Conception ultra-légère (233g) pour un confort prolongé</li>
      <li style="${styles.listItem}">Bandeau ergonomique à mémoire de forme avec coussinets velours</li>
      <li style="${styles.listItem}">Design circum-aural fermé pour une immersion sonore optimale</li>
      <li style="${styles.listItem}">Transducteurs 50mm avec technologie à large bande passante</li>
      <li style="${styles.listItem}">Câble détachable haute qualité avec connecteurs plaqués or</li>
      <li style="${styles.listLastItem}">Compatible avec interfaces studio et appareils mobiles</li>
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
      <tr>
        <td style="${styles.tableCell}">Diamètre des transducteurs</td>
        <td style="${styles.tableCell}">50mm</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">Matériau des coussinets</td>
        <td style="${styles.tableCell}">Velours premium</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">Longueur du câble</td>
        <td style="${styles.tableCell}">3m détachable</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">Connecteur</td>
        <td style="${styles.tableCell}">Jack 3.5mm (adaptateur 6.35mm inclus)</td>
      </tr>
      <tr>
        <td style="${styles.tableCell}">Accessoires inclus</td>
        <td style="${styles.tableCell}">Housse de transport, adaptateur 6.35mm</td>
      </tr>
    </table>
    
    <h2 style="${styles.sectionTitle}">Conseils d'utilisation</h2>
    <p style="${styles.descriptionText}">Pour une meilleure immersion sonore, assurez-vous que les coussinets entourent complètement vos oreilles et ajustez le bandeau pour un port confortable. Nous recommandons une période de rodage de 20-30 heures pour que les transducteurs atteignent leurs performances optimales. Lors des premières utilisations, alternez entre différents types de musique pour accélérer ce processus.</p>
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
