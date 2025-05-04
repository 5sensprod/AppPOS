// AppTools\src\injected\modules\productSelectorProductManager.js
const ProductSelectorProductManager = (products, config, communication, ui, navigation) => {
  // Variables d'état
  let currentProductIndex = 0;

  // Initialiser les gestionnaires d'événements
  function initialize() {
    // Écouter les messages de l'application principale
    document.addEventListener('product-selector-message', (e) => {
      const message = e.detail;

      switch (message.type) {
        case 'SET_CURRENT_PRODUCT':
          // Mettre à jour l'index du produit actuel
          if (message.payload.currentProductIndex !== undefined) {
            setCurrentProductIndex(message.payload.currentProductIndex);
            updateProductForm();
          }
          break;

        case 'LOAD_PRODUCT_DATA':
          // Charger les données d'un produit
          if (message.payload.productData) {
            const index =
              message.payload.productIndex !== undefined
                ? message.payload.productIndex
                : currentProductIndex;

            if (products[index]) {
              products[index]._captured = message.payload.productData;
              if (index === currentProductIndex) {
                loadProductData(products[index]);
              }
            }
          }
          break;
      }
    });

    // Écouter les événements personnalisés
    document.addEventListener('form-updated', bindFormEvents);
    document.addEventListener('save-current-product', saveCurrentProduct);
    document.addEventListener('get-current-product', (e) => {
      const detail = e.detail || {};
      const index = detail.index !== undefined ? detail.index : currentProductIndex;
      detail.index = index;
      detail.product = products[index];
    });

    // Première mise à jour du formulaire
    updateProductForm();
  }

  // Mettre à jour l'index du produit actuel
  function setCurrentProductIndex(index) {
    if (index >= 0 && index < products.length) {
      currentProductIndex = index;
      return true;
    }
    return false;
  }

  // Mettre à jour le formulaire avec les données du produit actuel
  function updateProductForm() {
    const product = products[currentProductIndex];
    if (!product) return;

    const productId = product.id || product._id;
    const hasStoredUrl = communication.hasStoredUrl(productId);

    // Mettre à jour l'interface utilisateur
    ui.updateForm(product, currentProductIndex, products.length, hasStoredUrl);

    // Charger les données capturées si disponibles
    loadProductData(product);

    // Informer l'application principale du changement de produit
    communication.sendToMainApp('PRODUCT_CHANGED', {
      currentProductIndex: currentProductIndex,
      product: {
        id: productId,
        sku: product.sku,
        designation: product.designation,
      },
    });
  }

  // Charger les données capturées d'un produit
  function loadProductData(product) {
    if (!product || !product._captured) return;

    // Charger les champs texte
    document.getElementById('title').value = product._captured.title || '';
    document.getElementById('description').value = product._captured.description || '';

    // Charger les images
    const containerEl = document.getElementById('image-container');
    if (containerEl) {
      containerEl.innerHTML = '';
      (product._captured.images || []).forEach((i) => {
        ui.addImageThumbnail(i.src, i.alt, () => saveCurrentProduct());
      });
    }

    // Charger les sélections de texte
    (product._captured.selections || []).forEach((txt) => {
      document.querySelectorAll(config.selectors.text).forEach((el) => {
        if (ProductSelectorSelection(config).getTextContent(el) === txt) {
          el.classList.add(config.classPrefix + 'text-selected');
        }
      });
    });
  }

  // Sauvegarder les données du produit actuel
  function saveCurrentProduct() {
    const product = products[currentProductIndex];
    if (!product) return;

    product._captured = product._captured || {};

    // Sauvegarder les champs de formulaire
    const titleEl = document.getElementById('title');
    const descEl = document.getElementById('description');

    if (titleEl) product._captured.title = titleEl.value;
    if (descEl) product._captured.description = descEl.value;

    // Sauvegarder les sélections de texte
    const selectionModule = ProductSelectorSelection(config);
    product._captured.selections = Array.from(selectionModule.getSelectedTextElements()).map((el) =>
      selectionModule.getTextContent(el)
    );

    // Sauvegarder les images en utilisant la fonction modulaire de l'UI
    const containerEl = document.getElementById('image-container');
    if (containerEl) {
      product._captured.images = ui.extractImagesInfo(containerEl);
    }

    // Sauvegarder l'URL actuelle si ce n'est pas une URL système
    const productId = product.id || product._id;
    if (productId) {
      const urlSaved = communication.saveUrl(productId, window.location.href);
      if (urlSaved) {
        // Mettre à jour l'état du bouton URL
        ui.updateUrlButtonState(true);
      }
    }

    // Envoyer les données capturées à l'application principale
    communication.sendToMainApp('PRODUCT_SAVED', {
      currentProductIndex: currentProductIndex,
      productData: product._captured,
    });
  }

  // Attacher les gestionnaires d'événements au formulaire
  function bindFormEvents() {
    // Gestionnaires pour les champs texte
    const titleInput = document.getElementById('title');
    const descInput = document.getElementById('description');

    if (titleInput && descInput) {
      [titleInput, descInput].forEach((input) => {
        // Focus sur le champ
        input.addEventListener('focus', ui.handleFieldFocus);

        // Mise à jour des données lors de saisie
        input.addEventListener('input', () => {
          const product = products[currentProductIndex];
          if (!product) return;

          product._captured = product._captured || {};
          product._captured[input.id] = input.value;

          communication.sendToMainApp('FIELD_UPDATED', {
            currentProductIndex: currentProductIndex,
            field: input.id,
            value: input.value,
          });
        });
      });
    }

    // Bouton précédent
    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentProductIndex > 0) {
          saveCurrentProduct();
          setCurrentProductIndex(currentProductIndex - 1);

          // Demander la navigation vers l'URL du produit précédent
          communication.sendToMainApp('NAVIGATE_TO_PRODUCT_URL', {
            productIndex: currentProductIndex,
          });

          updateProductForm();
        }
      });
    }

    // Bouton suivant
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentProductIndex < products.length - 1) {
          saveCurrentProduct();
          setCurrentProductIndex(currentProductIndex + 1);

          // Demander la navigation vers l'URL du produit suivant
          communication.sendToMainApp('NAVIGATE_TO_PRODUCT_URL', {
            productIndex: currentProductIndex,
          });

          updateProductForm();
        }
      });
    }

    // Bouton recherche
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        navigation.navigateToProductSearch(currentProductIndex);
      });
    }

    // Bouton URL
    const urlBtn = document.getElementById('url-btn');
    if (urlBtn) {
      urlBtn.addEventListener('click', () => {
        const product = products[currentProductIndex];
        if (!product) return;

        const productId = product.id || product._id;
        if (!productId) return;

        navigation.navigateToStoredUrl(productId);
      });
    }

    // Suppression du code pour le bouton export
  }

  // API publique
  return {
    initialize,
    getCurrentProductIndex: () => currentProductIndex,
    getCurrentProduct: () => products[currentProductIndex],
    setCurrentProductIndex,
    updateProductForm,
    saveCurrentProduct,
  };
};

// Export pour le contexte global
window.ProductSelectorProductManager = ProductSelectorProductManager;
