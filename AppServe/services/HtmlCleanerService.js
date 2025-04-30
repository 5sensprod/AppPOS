// services/HtmlCleanerService.js

/**
 * Service pour nettoyer et corriger les descriptions HTML générées par IA
 */
class HtmlCleanerService {
  /**
   * Nettoie une description HTML contenant potentiellement des balises orphelines
   * @param {string} htmlContent - Le contenu HTML à nettoyer
   * @returns {string} - Le contenu HTML nettoyé
   */
  cleanHtmlDescription(htmlContent) {
    // Vérifier si le contenu existe
    if (!htmlContent) {
      return '';
    }

    try {
      // Étape 1: Utiliser DOMParser pour analyser le HTML
      const { JSDOM } = require('jsdom');

      // Envelopper le contenu dans un conteneur temporaire si nécessaire
      let wrappedContent = htmlContent;
      if (!htmlContent.trim().startsWith('<!DOCTYPE') && !htmlContent.trim().startsWith('<html')) {
        wrappedContent = `<div id="temp-container">${htmlContent}</div>`;
      }

      // Analyser le HTML
      const dom = new JSDOM(wrappedContent);
      const doc = dom.window.document;

      // Si nous avons utilisé un conteneur temporaire, extraire son contenu
      if (wrappedContent !== htmlContent) {
        const container = doc.getElementById('temp-container');
        if (container) {
          // Obtenir le HTML nettoyé
          return container.innerHTML;
        }
      }

      // Si nous n'avons pas utilisé de conteneur ou il n'a pas été trouvé
      // Retourner le document complet sans les balises html/body
      return doc.body.innerHTML;
    } catch (error) {
      console.error('Erreur lors du nettoyage HTML:', error);

      // En cas d'erreur, essayer la méthode de secours
      return this.fixOrphanedTagsWithRegex(htmlContent);
    }
  }

  /**
   * Méthode de secours utilisant des expressions régulières pour corriger les balises
   * @param {string} htmlContent - Le contenu HTML à corriger
   * @returns {string} - Le contenu HTML corrigé
   */
  fixOrphanedTagsWithRegex(htmlContent) {
    // Liste des balises HTML courantes qui nécessitent une fermeture
    const commonTags = [
      'div',
      'p',
      'span',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'table',
      'tr',
      'td',
      'th',
      'thead',
      'tbody',
    ];

    let fixedContent = htmlContent;

    // Vérifier chaque type de balise
    commonTags.forEach((tag) => {
      // Compter les balises ouvrantes et fermantes
      const openTagsCount = (fixedContent.match(new RegExp(`<${tag}[^>]*>`, 'gi')) || []).length;
      const closeTagsCount = (fixedContent.match(new RegExp(`</${tag}>`, 'gi')) || []).length;

      // Si déséquilibre, ajouter les balises manquantes
      if (openTagsCount > closeTagsCount) {
        const missingCloseTags = openTagsCount - closeTagsCount;
        fixedContent += `\n${'</' + tag + '>'.repeat(missingCloseTags)}`;
      }
    });

    // Enlever les balises fermantes orphelines
    commonTags.forEach((tag) => {
      // Compter après la première correction
      const openTagsCount = (fixedContent.match(new RegExp(`<${tag}[^>]*>`, 'gi')) || []).length;
      const closeTagsCount = (fixedContent.match(new RegExp(`</${tag}>`, 'gi')) || []).length;

      // Si plus de balises fermantes que d'ouvrantes, les retirer
      if (closeTagsCount > openTagsCount) {
        let tempContent = fixedContent;
        const excessCloseTags = closeTagsCount - openTagsCount;

        for (let i = 0; i < excessCloseTags; i++) {
          // Trouver et supprimer une balise fermante orpheline
          const closeTagRegex = new RegExp(`</${tag}>`, 'i');
          tempContent = tempContent.replace(closeTagRegex, '');
        }

        fixedContent = tempContent;
      }
    });

    return fixedContent;
  }

  /**
   * Vérifie si une balise HTML est correctement fermée
   * @param {string} html - Le contenu HTML à vérifier
   * @returns {boolean} - true si le HTML est valide, false sinon
   */
  isValidHtml(html) {
    try {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(html);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new HtmlCleanerService();
