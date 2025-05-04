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

      // ➕ Bouton "Mettre à jour le produit" avec spinner
      const updateBtn = document.createElement('button');
      updateBtn.innerHTML = '<span>Mettre à jour le produit</span>';
      Object.assign(updateBtn.style, {
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
      document.body.appendChild(updateBtn);

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

      // Gestion du bouton de mise à jour
      updateBtn.addEventListener('click', () => {
        // Code existant
        const prod = products[currentIndex];
        const productId = prod.id || prod._id;
        const newDesc = prod._captured?.description || '';
        const newTitle = prod._captured?.title || '';

        // Afficher le spinner et changer le texte du bouton
        const spinner = updateBtn.querySelector('.update-spinner');
        const buttonText = updateBtn.querySelector('span');
        if (spinner && buttonText) {
          spinner.style.display = 'inline-block';
          buttonText.textContent = 'Mise à jour en cours...';
          updateBtn.disabled = true;
          updateBtn.style.opacity = '0.8';
          updateBtn.style.cursor = 'wait';
        }

        // Récupérer les images avec extractImagesInfo
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

        // Fonction pour réinitialiser le bouton après la mise à jour
        const resetButton = () => {
          if (spinner && buttonText) {
            spinner.style.display = 'none';
            buttonText.textContent = 'Mettre à jour le produit';
            updateBtn.disabled = false;
            updateBtn.style.opacity = '1';
            updateBtn.style.cursor = 'pointer';
          }
          ui.showFeedback('Produit mis à jour avec succès !');
        };

        // Effectuer les mises à jour sans attendre de promesses
        if (newDesc) {
          window.electronAPI.updateProductDescription(productId, newDesc);
        }

        if (newTitle) {
          window.electronAPI.updateProductName(productId, newTitle);
        }

        if (images.length > 0) {
          window.electronAPI.updateProductImages(productId, images);
        }

        // Réinitialiser le bouton après un délai raisonnable (3 secondes)
        setTimeout(() => {
          resetButton();
        }, 3000);
      });
    }

    initialize();
    return true;
  } catch (e) {
    console.error('Erreur dans productContentSelector:', e);
    return false;
  }
})(/*PLACEHOLDER_PRODUCTS*/);
