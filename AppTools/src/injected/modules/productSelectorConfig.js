// AppTools\src\injected\modules\productSelectorConfig.js
const ProductSelectorConfig = {
  // Préfixe pour toutes les classes CSS
  classPrefix: 'app-',

  // Sélecteurs pour les éléments interactifs
  selectors: {
    text: 'p,li,div,h1,h2,h3,h4,h5,h6',
    image: 'img',

    // Sélecteurs spécifiques pour le blocage d'interactions
    interactionBlockers: {
      links: 'a[href]',
      buttons: 'button:not([disabled]), [role="button"]',
      inputs: 'input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      modals: '[role="dialog"], .modal, .popup',
      iframes: 'iframe',
    },
  },

  // Configuration du comportement
  behavior: {
    enableImageSelection: true,
    blockExternalInteractions: false, // À activer selon les besoins
    preventUrlNavigation: true, // À activer selon les besoins
  },

  // URLs à exclure de la capture automatique
  excludedUrls: ['google.com/#APP_PRODUCTS_DATA=', 'qwant.com/?q='],

  // Délais
  timeouts: {
    urlSave: 1000,
    stateRequest: 300,
    initialNavigation: 300,
  },

  // Domaines de recherche
  searchDomains: {
    default: 'qwant.com',
  },
};

// Export pour le contexte global
window.ProductSelectorConfig = ProductSelectorConfig;
