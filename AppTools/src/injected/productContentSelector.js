// AppTools\src\injected\productContentSelector.js
(function (products) {
  try {
    // Importer les modules
    const config = ProductSelectorConfig;
    const communication = ProductSelectorCommunication(config);
    const ui = ProductSelectorUI(config, communication);
    const navigation = ProductSelectorNavigation(config, communication, ui);
    const selection = ProductSelectorSelection(config, communication, ui);
    const productManager = ProductSelectorProductManager(
      products,
      config,
      communication,
      ui,
      navigation
    );
    const interactionBlocker = ProductSelectorInteractionBlocker(config);

    // Initialisation
    function initialize() {
      // Afficher le formulaire initial
      ui.createUI();

      // Bloquer les interactions non désirées
      interactionBlocker.initialize();

      // Initialiser la communication
      communication.initialize();

      // Initialiser la gestion des produits
      productManager.initialize();

      // Initialiser la navigation
      navigation.initialize();

      // Initialiser la sélection de contenu
      selection.initialize();

      // Vérifier si c'est le premier chargement pour gérer la navigation initiale
      navigation.handleInitialNavigation();

      ui.showFeedback('Sélecteur de contenu activé !');
    }

    // Démarrer l'application
    initialize();

    return true;
  } catch (e) {
    console.error('Erreur dans productContentSelector:', e);
    return false;
  }
})(/*PLACEHOLDER_PRODUCTS*/);
