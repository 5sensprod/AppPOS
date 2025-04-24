// AppTools\src\injected\modules\productSelectorCommunication.js
const ProductSelectorCommunication = (config) => {
  // État local pour les URLs
  let productUrls = {};

  // Demander l'état actuel à l'application principale
  function requestState() {
    sendToMainApp('REQUEST_STATE', {});
  }

  // Envoyer un message à l'application principale
  function sendToMainApp(type, data) {
    window.postMessage(
      {
        source: 'product-content-selector',
        type: type,
        payload: data,
      },
      '*'
    );
  }

  // Initialiser les écouteurs de messages
  function initialize() {
    window.addEventListener('message', handleMessage);

    // Demander l'état initial après un délai
    setTimeout(requestState, config.timeouts.stateRequest);
  }

  // Gérer les messages reçus
  function handleMessage(event) {
    // Vérifier que le message vient de l'application principale
    if (event.data.source === 'main-app') {
      console.log("Message reçu de l'application principale:", event.data);

      // Émettre un événement personnalisé pour les autres modules
      const customEvent = new CustomEvent('product-selector-message', {
        detail: event.data,
      });
      document.dispatchEvent(customEvent);

      // Traiter les URLs spécifiquement ici pour les avoir disponibles dans ce module
      if (event.data.type === 'LOAD_PRODUCT_URLS' && event.data.payload.productUrls) {
        productUrls = event.data.payload.productUrls;
        console.log('URLs de produits chargées:', productUrls);
      }
    }
  }

  // Vérifier si une URL est stockée pour un produit
  function hasStoredUrl(productId) {
    return !!productUrls[productId];
  }

  // Obtenir l'URL stockée pour un produit
  function getStoredUrl(productId) {
    return productUrls[productId] || null;
  }

  // Sauvegarder l'URL pour un produit
  function saveUrl(productId, url) {
    if (!productId || !url) return false;

    // Vérifier si l'URL doit être exclue
    const shouldExclude = config.excludedUrls.some((excluded) => url.includes(excluded));
    if (shouldExclude) return false;

    // Sauvegarder l'URL
    productUrls[productId] = url;

    // Informer l'application principale
    sendToMainApp('URL_SAVED', {
      productId: productId,
      url: url,
    });

    return true;
  }

  // API publique
  return {
    initialize,
    sendToMainApp,
    requestState,
    hasStoredUrl,
    getStoredUrl,
    saveUrl,
    get productUrls() {
      return { ...productUrls };
    },
  };
};

// Export pour le contexte global
window.ProductSelectorCommunication = ProductSelectorCommunication;
