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

      // ➕ Bouton "Mettre à jour le produit"
      const updateBtn = document.createElement('button');
      updateBtn.textContent = 'Mettre à jour le produit';
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
      });
      document.body.appendChild(updateBtn);

      // ➕ Bouton "Prévisualiser description améliorée"
      const previewBtn = document.createElement('button');
      previewBtn.textContent = 'Prévisualiser IA';
      Object.assign(previewBtn.style, {
        position: 'fixed',
        bottom: '4em',
        right: '1em',
        zIndex: 9999,
        padding: '0.5em 1em',
        background: '#28a745',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      });
      document.body.appendChild(previewBtn);

      // Dialog pour la prévisualisation
      const previewDialog = document.createElement('div');
      previewDialog.id = 'preview-dialog';
      Object.assign(previewDialog.style, {
        display: 'none',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        maxWidth: '800px',
        maxHeight: '80vh',
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 10000,
        overflow: 'auto',
      });
      previewDialog.innerHTML = `
        <h3 style="margin-top:0;margin-bottom:15px;">Prévisualisation de la description améliorée par IA</h3>
        <div style="display:flex;margin-bottom:15px;">
          <div style="flex:1;padding-right:10px;">
            <h4 style="margin-top:0;">Description originale</h4>
            <div id="original-desc" style="border:1px solid #ddd;padding:10px;min-height:200px;max-height:300px;overflow:auto;white-space:pre-wrap;"></div>
          </div>
          <div style="flex:1;padding-left:10px;">
            <h4 style="margin-top:0;">Description améliorée</h4>
            <div id="enhanced-desc" style="border:1px solid #ddd;padding:10px;min-height:200px;max-height:300px;overflow:auto;white-space:pre-wrap;"></div>
          </div>
        </div>
        <div style="text-align:right;">
          <button id="use-enhanced-btn" style="background:#28a745;color:#fff;border:none;padding:8px 15px;border-radius:4px;margin-right:10px;cursor:pointer;">Utiliser</button>
          <button id="close-preview-btn" style="background:#6c757d;color:#fff;border:none;padding:8px 15px;border-radius:4px;cursor:pointer;">Fermer</button>
        </div>
      `;
      document.body.appendChild(previewDialog);

      // Overlay pour l'arrière-plan
      const overlay = document.createElement('div');
      overlay.id = 'preview-overlay';
      Object.assign(overlay.style, {
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
      });
      document.body.appendChild(overlay);

      // Spinner pour le chargement
      const spinner = document.createElement('div');
      spinner.id = 'loading-spinner';
      Object.assign(spinner.style, {
        display: 'none',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '50px',
        height: '50px',
        border: '5px solid #f3f3f3',
        borderTop: '5px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 2s linear infinite',
        zIndex: 10001,
      });

      // Ajouter l'animation de rotation
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        @keyframes spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `;
      document.head.appendChild(styleElement);
      document.body.appendChild(spinner);

      // Gérer l'événement du bouton de prévisualisation
      previewBtn.addEventListener('click', async () => {
        const prod = products[currentIndex];
        const productId = prod.id || prod._id;
        const description = prod._captured?.description || '';

        if (!description) {
          ui.showFeedback('Aucune description à améliorer !');
          return;
        }

        // Afficher le spinner
        spinner.style.display = 'block';
        overlay.style.display = 'block';

        try {
          // Appeler l'API pour obtenir la prévisualisation
          const result = await window.electronAPI.previewEnhancedDescription(
            productId,
            description
          );

          if (result.success) {
            // Remplir la boîte de dialogue
            document.getElementById('original-desc').textContent = result.originalDescription;
            document.getElementById('enhanced-desc').textContent = result.enhancedDescription;

            // Cacher le spinner et afficher la boîte de dialogue
            spinner.style.display = 'none';
            previewDialog.style.display = 'block';
          } else {
            ui.showFeedback(`Erreur: ${result.error || "Impossible d'améliorer la description"}`);
            spinner.style.display = 'none';
            overlay.style.display = 'none';
          }
        } catch (error) {
          console.error('Erreur prévisualisation:', error);
          ui.showFeedback('Erreur lors de la prévisualisation');
          spinner.style.display = 'none';
          overlay.style.display = 'none';
        }
      });

      // Gérer le bouton "Utiliser"
      document.getElementById('use-enhanced-btn').addEventListener('click', () => {
        const prod = products[currentProductIndex];
        const enhancedDesc = document.getElementById('enhanced-desc').textContent;

        // Mettre à jour la description capturée
        if (prod._captured) {
          prod._captured.description = enhancedDesc;
        } else {
          prod._captured = { description: enhancedDesc };
        }

        // Mettre à jour le champ de description dans le formulaire
        const descInput = document.getElementById('description');
        if (descInput) {
          descInput.value = enhancedDesc;
          // Déclencher l'événement input pour que les écouteurs sachent que le contenu a changé
          descInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Fermer la boîte de dialogue
        previewDialog.style.display = 'none';
        overlay.style.display = 'none';

        ui.showFeedback('Description améliorée appliquée !');
      });

      // Gérer le bouton "Fermer"
      document.getElementById('close-preview-btn').addEventListener('click', () => {
        previewDialog.style.display = 'none';
        overlay.style.display = 'none';
      });

      // Fermer également lors d'un clic sur l'overlay
      // Écouteur pour les notifications de description en cours d'amélioration
      window.electronAPI.onDescriptionEnhancementStart((data) => {
        if (data.productId) {
          // Afficher le spinner et l'overlay
          spinner.style.display = 'block';
          overlay.style.display = 'block';
          ui.showFeedback('Amélioration de la description en cours...');
        }
      });

      // Écouteur pour les descriptions améliorées
      window.electronAPI.onDescriptionEnhanced((data) => {
        // Masquer le spinner et l'overlay
        spinner.style.display = 'none';
        overlay.style.display = 'none';

        if (data.productId) {
          ui.showFeedback('Description améliorée par IA !');

          // Si la description est fournie dans la notification
          if (data.enhancedDescription) {
            // Rechercher le produit directement par ID
            for (let i = 0; i < products.length; i++) {
              const prod = products[i];
              const prodId = prod.id || prod._id;

              if (prodId === data.productId) {
                // Mettre à jour la description capturée
                if (prod._captured) {
                  prod._captured.description = data.enhancedDescription;
                } else {
                  prod._captured = { description: data.enhancedDescription };
                }

                // Mettre à jour l'interface si c'est le produit actuellement affiché
                // Nous utilisons currentIndex qui est la variable dans votre fichier productContentSelector.js
                if (i === currentIndex) {
                  const descInput = document.getElementById('description');
                  if (descInput) {
                    descInput.value = data.enhancedDescription;
                    descInput.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }

                break;
              }
            }
          }
        }
      });

      // Modifier l'écouteur existant pour les descriptions améliorées
      window.electronAPI.onDescriptionEnhanced((data) => {
        // Masquer le spinner et l'overlay
        spinner.style.display = 'none';
        overlay.style.display = 'none';

        if (data.productId) {
          ui.showFeedback('Description améliorée par IA !');

          // Si la description est fournie dans la notification
          if (data.enhancedDescription) {
            // Trouver le produit par son ID
            const productId = data.productId;
            const productIndex = products.findIndex((p) => (p.id || p._id) === productId);

            if (productIndex !== -1) {
              const prod = products[productIndex];

              // Mettre à jour la description capturée
              if (prod._captured) {
                prod._captured.description = data.enhancedDescription;
              } else {
                prod._captured = { description: data.enhancedDescription };
              }

              // Si c'est le produit actuellement affiché, mettre à jour le champ
              if (productIndex === currentProductIndex) {
                // Assurez-vous que cette variable est correcte pour votre code
                const descInput = document.getElementById('description');
                if (descInput) {
                  descInput.value = data.enhancedDescription;
                  descInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }
            }
          }
        }
      });

      // Gestion du bouton de mise à jour
      updateBtn.addEventListener('click', () => {
        // Nous utilisons currentIndex qui est la variable dans votre fichier
        const prod = products[currentIndex];
        const productId = prod.id || prod._id;
        const newDesc = prod._captured?.description || '';
        const newTitle = prod._captured?.title || '';
        const images = prod._captured?.images || [];

        console.log(
          '[webview] click update product, title=',
          newTitle,
          'desc=',
          newDesc,
          'images=',
          images.length
        );

        // Afficher le spinner uniquement si une description est mise à jour
        if (newDesc) {
          spinner.style.display = 'block';
          overlay.style.display = 'block';
          ui.showFeedback('Mise à jour de la description en cours...');
        }

        // Mettre à jour les champs si nécessaire
        if (newDesc) {
          window.electronAPI.updateProductDescription(productId, newDesc);
        }

        if (newTitle) {
          window.electronAPI.updateProductName(productId, newTitle);
        }

        // Mettre à jour les images si présentes
        if (images.length > 0) {
          window.electronAPI.updateProductImages(productId, images);
        }
      });
    }

    initialize();
    return true;
  } catch (e) {
    console.error('Erreur dans productContentSelector:', e);
    return false;
  }
})(/*PLACEHOLDER_PRODUCTS*/);
