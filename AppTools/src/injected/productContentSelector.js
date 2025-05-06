// AppTools\src\injected\productContentSelector.js
(function (products) {
  try {
    // Stockage de l'index courant
    let currentIndex = 0;

    // Rendre products accessible globalement pour le panneau
    window.products = products;

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

      // Ajouter le bouton de mise à jour
      addUpdateButton();
    }

    // Fonction séparée pour ajouter le bouton de mise à jour
    function addUpdateButton() {
      // Créer le bouton de mise à jour
      const updateBtn = document.createElement('button');
      updateBtn.innerHTML = '<span>Mettre à jour le produit</span>';
      Object.assign(updateBtn.style, {
        padding: '10px 16px',
        background: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        margin: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '14px',
        width: 'calc(100% - 32px)',
      });

      // Créer le spinner
      const updateSpinner = document.createElement('div');
      updateSpinner.className = 'update-spinner';
      Object.assign(updateSpinner.style, {
        display: 'none',
        marginLeft: '10px',
        width: '16px',
        height: '16px',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderTop: '2px solid #fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      });
      updateBtn.appendChild(updateSpinner);

      // Ajouter l'animation de rotation si elle n'existe pas déjà
      if (!document.getElementById('spinner-style')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'spinner-style';
        styleElement.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
        document.head.appendChild(styleElement);
      }

      // Trouver le panneau et ajouter le bouton
      const panel = document.getElementById('app-tools-panel');
      if (panel) {
        // Créer un div pour le bouton en bas du panneau
        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
          position: 'sticky',
          bottom: '0',
          padding: '10px 0',
          background: '#fff',
          boxShadow: '0 -2px 5px rgba(0, 0, 0, 0.1)',
          zIndex: '1',
        });
        buttonContainer.appendChild(updateBtn);
        panel.appendChild(buttonContainer);
      }

      // Fonction simple pour activer/désactiver le spinner
      function setButtonLoading(isLoading) {
        const spinner = updateBtn.querySelector('.update-spinner');
        const buttonText = updateBtn.querySelector('span');

        if (spinner && buttonText) {
          if (isLoading) {
            spinner.style.display = 'inline-block';
            buttonText.textContent = 'Mise à jour en cours...';
            updateBtn.disabled = true;
            updateBtn.style.opacity = '0.8';
            updateBtn.style.cursor = 'wait';
          } else {
            spinner.style.display = 'none';
            buttonText.textContent = 'Mettre à jour le produit';
            updateBtn.disabled = false;
            updateBtn.style.opacity = '1';
            updateBtn.style.cursor = 'pointer';
          }
        }
      }

      // Écouter l'événement de fin de mise à jour de la description
      if (window.electronAPI && window.electronAPI.onDescriptionEnhanced) {
        window.electronAPI.onDescriptionEnhanced(() => {
          console.log('[webview] Description mise à jour, réinitialisation du bouton');
          setButtonLoading(false);
          ui.showFeedback('Produit mis à jour avec succès !');
        });
      }

      // Gestion du bouton de mise à jour
      updateBtn.addEventListener('click', () => {
        const prod = products[currentIndex];
        const productId = prod.id || prod._id;
        const newDesc = prod._captured?.description || '';
        const newTitle = prod._captured?.title || '';

        // Activer le spinner
        setButtonLoading(true);

        // Récupérer les images
        const imageContainer = document.getElementById('image-container');
        const images = ui.extractImagesInfo(imageContainer) || [];

        console.log(
          '[webview] click update product, title=',
          newTitle,
          'desc=',
          newDesc,
          'images=',
          images.length
        );

        // Effectuer les mises à jour
        let hasDescriptionUpdate = false;

        if (newDesc) {
          hasDescriptionUpdate = true;
          window.electronAPI.updateProductDescription(productId, newDesc);
        }

        if (newTitle) {
          window.electronAPI.updateProductName(productId, newTitle);
        }

        if (images.length > 0) {
          window.electronAPI.updateProductImages(productId, images);
        }

        // Si pas de mise à jour de description, réinitialiser le bouton après un délai
        if (!hasDescriptionUpdate) {
          setTimeout(() => {
            setButtonLoading(false);
            ui.showFeedback('Produit mis à jour avec succès !');
          }, 3000);
        }
        // Sinon, le bouton sera réinitialisé par l'événement onDescriptionEnhanced
      });
    }

    initialize();
    return true;
  } catch (e) {
    console.error('Erreur dans productContentSelector:', e);
    return false;
  }
})(/*PLACEHOLDER_PRODUCTS*/);
