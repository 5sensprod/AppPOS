// AppTools\src\injected\modules\productSelectorNavigation.js
const ProductSelectorNavigation = (config, communication, ui) => {
  // Variables d'état
  let navInProgress = false;
  let isFirstLoad = true;

  // Initialiser les écouteurs pour la navigation
  function initialize() {
    // Écouter les messages de l'application principale
    document.addEventListener('product-selector-message', (e) => {
      const message = e.detail;

      switch (message.type) {
        case 'NAVIGATE_TO_URL':
          // Naviguer vers l'URL spécifiée
          if (message.payload.url) {
            console.log('Navigation vers URL stockée:', message.payload.url);
            window.location.href = message.payload.url;
          }
          break;

        case 'PERFORM_SEARCH':
          // Lancer une recherche pour le produit spécifié
          if (message.payload.productIndex !== undefined) {
            navigateToProductSearch(message.payload.productIndex);
          }
          break;
      }
    });
  }

  // Naviguer vers la recherche du produit spécifié
  function navigateToProductSearch(productIndex) {
    if (navInProgress) return;

    // Déclencher un événement pour sauvegarder l'état actuel
    document.dispatchEvent(new CustomEvent('save-current-product'));

    const event = new CustomEvent('get-current-product', { detail: { index: productIndex } });
    document.dispatchEvent(event);

    const product = event.detail.product;
    if (!product) {
      ui.showFeedback('Produit non trouvé');
      return;
    }

    const searchTerm = (product.designation || product.sku || '').trim();
    if (!searchTerm) {
      ui.showFeedback('Pas de terme de recherche pour ce produit');
      return;
    }

    // Sauvegarder l'URL actuelle si pertinent
    const productId = product.id || product._id;
    if (productId) {
      communication.saveUrl(productId, window.location.href);
    }

    // Informer l'application principale de la navigation imminente
    communication.sendToMainApp('NAVIGATION_START', {
      currentProductIndex: productIndex,
      searchTerm: searchTerm,
    });

    navInProgress = true;

    // Créer URL de recherche
    const encodedSearch = encodeURIComponent(searchTerm);
    const redirectUrl = `https://www.${config.searchDomains.default}/?q=${encodedSearch}`;

    // Rediriger
    window.location.href = redirectUrl;
    ui.showFeedback('Recherche: ' + searchTerm);
  }

  // Naviguer vers l'URL stockée du produit
  function navigateToStoredUrl(productId) {
    if (navInProgress) return;

    if (!communication.hasStoredUrl(productId)) {
      ui.showFeedback('Aucune URL produit enregistrée');
      return false;
    }

    // Déclencher un événement pour sauvegarder l'état actuel
    document.dispatchEvent(new CustomEvent('save-current-product'));

    // Informer l'application principale de la navigation
    communication.sendToMainApp('NAVIGATION_START', {
      targetUrl: communication.getStoredUrl(productId),
    });

    navInProgress = true;

    // Naviguer vers l'URL enregistrée
    window.location.href = communication.getStoredUrl(productId);
    ui.showFeedback('Navigation vers la page produit');
    return true;
  }

  // Gérer la navigation initiale (premier chargement)
  function handleInitialNavigation() {
    if (!isFirstLoad) return;
    isFirstLoad = false;

    // Vérifier si on est sur une page de démarrage et pas déjà sur une page de résultats
    if (
      window.location.href.includes('APP_PRODUCTS_DATA=') &&
      window.location.href.includes('google.com') &&
      !window.location.href.includes('qwant.com/?q=')
    ) {
      // Obtenir le produit actuel
      const event = new CustomEvent('get-current-product', { detail: {} });
      document.dispatchEvent(event);
      const product = event.detail.product;

      if (!product) return;

      const productId = product.id || product._id;
      if (productId && communication.hasStoredUrl(productId)) {
        // Si on a une URL stockée, naviguer directement vers celle-ci
        console.log(
          `Utilisation de l'URL stockée pour ${productId}:`,
          communication.getStoredUrl(productId)
        );
        window.location.href = communication.getStoredUrl(productId);
        ui.showFeedback('Navigation vers la page enregistrée');
      } else {
        // Sinon, lancer une recherche
        setTimeout(
          () => navigateToProductSearch(event.detail.index),
          config.timeouts.initialNavigation
        );
      }
    }
  }

  // API publique
  return {
    initialize,
    navigateToProductSearch,
    navigateToStoredUrl,
    handleInitialNavigation,
  };
};

// Export pour le contexte global
window.ProductSelectorNavigation = ProductSelectorNavigation;
