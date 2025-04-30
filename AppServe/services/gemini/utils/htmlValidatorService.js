// services/gemini/utils/htmlValidatorService.js

const { JSDOM } = require('jsdom');
const htmlCleanerService = require('../../HtmlCleanerService');

/**
 * Service pour valider et normaliser les descriptions HTML générées par Gemini
 */
class HtmlValidatorService {
  /**
   * Valide et nettoie une description HTML pour s'assurer qu'elle respecte le format standard
   * @param {string} htmlDescription - Description HTML brute générée par l'IA
   * @returns {string} - Description HTML validée et nettoyée
   */
  validateAndClean(htmlDescription) {
    if (!htmlDescription) return '';

    try {
      // Étape 1: Nettoyage initial avec le service existant
      const cleanedHtml = htmlCleanerService.cleanHtmlDescription(htmlDescription);
      
      // Étape 2: Validation de la structure globale
      return this._validateStructure(cleanedHtml);
    } catch (error) {
      console.error("Erreur lors de la validation HTML:", error);
      // En cas d'erreur, on retourne au moins le HTML nettoyé par le service de base
      return htmlCleanerService.cleanHtmlDescription(htmlDescription);
    }
  }

  /**
   * Valide que le HTML respecte la structure attendue pour nos descriptions de produits
   * @param {string} html - HTML nettoyé
   * @returns {string} - HTML validé et structuré
   */
  _validateStructure(html) {
    // Créer un DOM à partir du HTML
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // Récupérer le conteneur principal
    let container = doc.querySelector('.wc-product-container');
    
    // Si le conteneur n'existe pas, créer un nouveau et y placer tout le contenu
    if (!container) {
      container = doc.createElement('div');
      container.className = 'wc-product-container';
      container.setAttribute('style', 'font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0');
      
      // Déplacer tous les éléments existants dans le nouveau conteneur
      while (doc.body.firstChild) {
        container.appendChild(doc.body.firstChild);
      }
      
      doc.body.appendChild(container);
    }
    
    // S'assurer qu'il y a bien un titre h1 (sinon convertir le premier h2)
    if (!container.querySelector('h1')) {
      const firstH2 = container.querySelector('h2');
      if (firstH2) {
        const h1 = doc.createElement('h1');
        h1.setAttribute('style', 'font-size: 24px; margin: 0 0 15px 0; padding: 0; color: #333');
        h1.innerHTML = firstH2.innerHTML;
        container.insertBefore(h1, container.firstChild);
        firstH2.parentNode.removeChild(firstH2);
      } else {
        // Créer un h1 par défaut si aucun titre n'est trouvé
        const h1 = doc.createElement('h1');
        h1.setAttribute('style', 'font-size: 24px; margin: 0 0 15px 0; padding: 0; color: #333');
        h1.textContent = 'Description produit';
        container.insertBefore(h1, container.firstChild);
      }
    }
    
    // Vérifier la présence du conteneur de description
    let descContainer = container.querySelector('.wc-product-description');
    if (!descContainer) {
      // Trouver les premiers paragraphes de description
      const paragraphs = Array.from(container.querySelectorAll('p'))
        .filter(p => !p.closest('table') && !p.closest('li'));
      
      if (paragraphs.length > 0) {
        // Créer un conteneur de description et y déplacer les paragraphes
        descContainer = doc.createElement('div');
        descContainer.className = 'wc-product-description';
        descContainer.setAttribute('style', 'margin: 0 0 20px 0');
        
        // Placer le conteneur après le h1
        const h1 = container.querySelector('h1');
        if (h1 && h1.nextSibling) {
          container.insertBefore(descContainer, h1.nextSibling);
        } else {
          container.appendChild(descContainer);
        }
        
        // Déplacer les paragraphes dans le conteneur
        paragraphs.forEach(p => {
          if (!p.getAttribute('style')) {
            p.setAttribute('style', 'margin: 0; padding: 0');
          }
          descContainer.appendChild(p);
        });
      }
    }
    
    // Vérifier les sections principales (Points Forts, Caractéristiques Techniques, Conseils d'utilisation)
    this._ensureSection(doc, container, 'Points Forts', 'ul');
    this._ensureSection(doc, container, 'Caractéristiques Techniques', 'table');
    this._ensureSection(doc, container, 'Conseils d\'utilisation', 'p');
    
    // Vérifier que chaque liste a un style correct
    container.querySelectorAll('ul').forEach(ul => {
      if (!ul.getAttribute('style')) {
        ul.setAttribute('style', 'margin: 0 0 20px 0; padding: 0 0 0 20px; list-style-type: disc');
      }
      
      // Vérifier chaque élément de liste
      ul.querySelectorAll('li').forEach(li => {
        if (!li.getAttribute('style')) {
          li.setAttribute('style', 'margin: 0 0 8px 0; padding: 0');
        }
      });
    });
    
    // Vérifier que chaque tableau a un style correct
    container.querySelectorAll('table').forEach(table => {
      if (!table.getAttribute('style')) {
        table.setAttribute('style', 'width: 100%; border-collapse: collapse; margin: 0 0 20px 0');
      }
      
      // Vérifier les lignes d'en-tête
      table.querySelectorAll('tr:first-child').forEach(tr => {
        if (!tr.getAttribute('style')) {
          tr.setAttribute('style', 'background-color: #f5f5f5');
        }
        
        // Vérifier les cellules d'en-tête
        tr.querySelectorAll('th').forEach((th, index) => {
          if (!th.getAttribute('style')) {
            if (index === 0) {
              th.setAttribute('style', 'text-align: left; padding: 10px; border: 1px solid #ddd; width: 40%');
            } else {
              th.setAttribute('style', 'text-align: left; padding: 10px; border: 1px solid #ddd; width: 60%');
            }
          }
        });
      });
      
      // Vérifier les cellules normales
      table.querySelectorAll('td').forEach(td => {
        if (!td.getAttribute('style')) {
          td.setAttribute('style', 'padding: 10px; border: 1px solid #ddd');
        }
      });
    });
    
    // Retourner le HTML validé et structuré
    return container.outerHTML;
  }
  
  /**
   * S'assure qu'une section spécifique existe avec le bon format
   * @param {Document} doc - Document DOM
   * @param {Element} container - Conteneur principal
   * @param {string} title - Titre de la section
   * @param {string} contentType - Type d'élément attendu pour le contenu (ul, table, p)
   */
  _ensureSection(doc, container, title, contentType) {
    // Chercher le titre de section
    let sectionTitle = Array.from(container.querySelectorAll('h2')).find(h2 => 
      h2.textContent.trim().toLowerCase() === title.toLowerCase());
    
    // Si la section n'existe pas, ne rien faire (pas de création automatique de section vide)
    if (!sectionTitle) return;
    
    // Vérifier le style du titre
    if (!sectionTitle.getAttribute('style')) {
      sectionTitle.setAttribute('style', 'font-size: 20px; margin: 25px 0 15px 0; padding: 0; color: #333');
    }
    
    // Vérifier si l'élément de contenu suit directement le titre
    let nextElement = sectionTitle.nextElementSibling;
    if (!nextElement || nextElement.tagName.toLowerCase() !== contentType) {
      // Si l'élément suivant n'est pas du bon type, chercher plus loin
      let foundElement = false;
      let currentElement = nextElement;
      
      // Chercher jusqu'au prochain titre ou la fin du conteneur
      while (currentElement && !foundElement) {
        if (currentElement.tagName.toLowerCase() === contentType) {
          foundElement = true;
          break;
        } else if (currentElement.tagName.toLowerCase() === 'h2') {
          // Arrêter si on atteint un autre titre de section
          break;
        }
        currentElement = currentElement.nextElementSibling;
      }
      
      if (!foundElement) {
        // Créer un élément de contenu par défaut si non trouvé
        const newElement = doc.createElement(contentType);
        
        switch (contentType) {
          case 'ul':
            newElement.setAttribute('style', 'margin: 0 0 20px 0; padding: 0 0 0 20px; list-style-type: disc');
            break;
          case 'table':
            newElement.setAttribute('style', 'width: 100%; border-collapse: collapse; margin: 0 0 20px 0');
            break;
          case 'p':
            newElement.setAttribute('style', 'margin: 0; padding: 0');
            break;
        }
        
        // Insérer après le titre de section
        sectionTitle.parentNode.insertBefore(newElement, sectionTitle.nextSibling);
      }
    }
  }
}

module.exports = new HtmlValidatorService();