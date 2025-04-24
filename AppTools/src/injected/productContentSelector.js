// AppTools\src\injected\productContentSelector.js
(function (products) {
  try {
    // Stockage de l'index courant
    let currentIndex = 0;

    // Import des modules du sélecteur
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

    // Écoute des messages envoyés depuis le main process
    window.addEventListener('message', (event) => {
      if (event.data && event.data.source === 'main-app') {
        switch (event.data.type) {
          case 'SET_CURRENT_PRODUCT':
            currentIndex = event.data.payload.currentProductIndex;
            break;
          // Vous pouvez ajouter d'autres types ici si besoin
        }
      }
    });

    function initialize() {
      ui.createUI();
      interactionBlocker.initialize();
      communication.initialize();
      productManager.initialize();
      navigation.initialize();
      selection.initialize();
      navigation.handleInitialNavigation();
      ui.showFeedback('Sélecteur de contenu activé !');

      // ➕ Bouton “Mettre à jour la description”
      const btn = document.createElement('button');
      btn.textContent = 'Mettre à jour la description';
      Object.assign(btn.style, {
        position: 'fixed',
        bottom: '1em',
        right: '1em',
        zIndex: 9999,
        padding: '0.5em 1em',
        background: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      });
      document.body.appendChild(btn);

      btn.addEventListener('click', () => {
        const prod = products[currentIndex];
        const productId = prod.id || prod._id;

        // Nouvelle desc directement depuis le champ _captured.description
        const newDesc = prod._captured?.description || '';

        console.log('[webview] click update from state, newDesc =', newDesc);
        window.electronAPI.updateProductDescription(productId, newDesc);
      });
    }

    initialize();
    return true;
  } catch (e) {
    console.error('Erreur dans productContentSelector:', e);
    return false;
  }
})(/*PLACEHOLDER_PRODUCTS*/);
