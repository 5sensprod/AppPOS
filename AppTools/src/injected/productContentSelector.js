(function (products) {
  try {
    const config = {
      selectors: {
        text: 'p,li,div,h1,h2,h3,h4,h5,h6',
        image: 'img',
      },
      classPrefix: 'app-', // Préfixe pour toutes nos classes
      enableImageSelection: true,
    };

    let currentProductIndex = 0;
    let focusedInput = null;
    let isFirstLoad = true;
    let redirectUrl = null;
    let navInProgress = false;
    let productUrls = {}; // Stockage local des URLs par produit

    // --- Communication avec l'application principale ---
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

    // Demander l'état actuel à l'application principale lors de l'initialisation
    function requestState() {
      sendToMainApp('REQUEST_STATE', {});
    }

    // Écouter les messages de l'application principale
    window.addEventListener('message', (event) => {
      // Vérifier que le message vient de l'application principale
      if (event.data.source === 'main-app') {
        console.log("Message reçu de l'application principale:", event.data);

        switch (event.data.type) {
          case 'SET_CURRENT_PRODUCT':
            // Mettre à jour l'index du produit actuel
            if (event.data.payload.currentProductIndex !== undefined) {
              currentProductIndex = event.data.payload.currentProductIndex;
              updateForm();
            }
            break;

          case 'LOAD_PRODUCT_DATA':
            // Charger les données d'un produit
            if (event.data.payload.productData) {
              const index = event.data.payload.productIndex || currentProductIndex;
              if (products[index]) {
                products[index]._captured = event.data.payload.productData;
                if (index === currentProductIndex) {
                  loadProductData(products[index]);
                }
              }
            }
            break;

          case 'LOAD_PRODUCT_URLS':
            // Récupérer les URLs stockées
            if (event.data.payload.productUrls) {
              productUrls = event.data.payload.productUrls;
              console.log('URLs de produits chargées:', productUrls);
              // Mettre à jour l'état du bouton URL si nous sommes déjà sur la page
              updateUrlButtonState();
            }
            break;

          case 'NAVIGATE_TO_URL':
            // Naviguer vers l'URL spécifiée
            if (event.data.payload.url) {
              console.log('Navigation vers URL stockée:', event.data.payload.url);
              window.location.href = event.data.payload.url;
            }
            break;

          case 'PERFORM_SEARCH':
            // Lancer une recherche pour le produit spécifié
            if (event.data.payload.productIndex !== undefined) {
              currentProductIndex = event.data.payload.productIndex;
              navigateToProductSearch();
            }
            break;
        }
      }
    });

    // Mettre à jour l'état du bouton URL en fonction de la disponibilité d'une URL pour le produit actuel
    function updateUrlButtonState() {
      const urlBtn = document.getElementById('url-btn');
      if (!urlBtn) return;

      const product = products[currentProductIndex];
      const productId = product.id || product._id;

      if (productId && productUrls[productId]) {
        urlBtn.disabled = false;
        urlBtn.title = 'Aller à la page produit enregistrée';
      } else {
        urlBtn.disabled = true;
        urlBtn.title = 'Aucune URL de produit enregistrée';
      }
    }

    // --- Helpers for text highlight toggling ---
    function toggleClass(el, cls) {
      el.classList.toggle(cls);
      return el.classList.contains(cls);
    }

    // Get trimmed content of element
    function getTextContent(el) {
      if (el.tagName === 'LI') return el.textContent.trim();
      if (['UL', 'OL'].includes(el.tagName)) {
        return Array.from(el.querySelectorAll('li'))
          .map((li) => '• ' + li.textContent.trim())
          .join('\n');
      }
      return el.textContent.trim();
    }

    function updateField(input, text, remove = false) {
      let val = input.value.trim();
      if (!remove) {
        input.value = val ? val + '\n\n' + text : text;
      } else {
        input.value = val.split(text).join('').trim();
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => input.focus(), 0);
    }

    // Feedback floating
    const feedback = document.createElement('div');
    feedback.className = config.classPrefix + 'feedback';
    document.body.appendChild(feedback);
    function showFeedback(msg) {
      feedback.textContent = msg;
      feedback.style.opacity = '1';
      setTimeout(() => (feedback.style.opacity = '0'), 2000);
    }

    // Main container
    const container = document.createElement('div');
    container.className = config.classPrefix + 'product-form';
    document.body.appendChild(container);

    // Fonction pour naviguer vers la recherche du produit actuel
    function navigateToProductSearch() {
      if (navInProgress) return;

      const product = products[currentProductIndex];
      const searchTerm = (product.designation || product.sku || '').trim();

      if (!searchTerm) {
        showFeedback('Pas de terme de recherche pour ce produit');
        return;
      }

      // Sauvegarder l'état actuel avant la navigation
      saveCurrentProduct();

      // Sauvegarder l'URL actuelle avant de naviguer si ce n'est pas une URL de recherche
      const productId = product.id || product._id;
      if (
        productId &&
        window.location.href &&
        !window.location.href.includes('google.com/#APP_PRODUCTS_DATA=') &&
        !window.location.href.includes('qwant.com/?q=')
      ) {
        productUrls[productId] = window.location.href;

        // Informer l'application principale de l'URL sauvegardée
        sendToMainApp('URL_SAVED', {
          productId: productId,
          url: window.location.href,
        });
      }

      // Informer l'application principale de la navigation imminente
      sendToMainApp('NAVIGATION_START', {
        currentProductIndex: currentProductIndex,
        searchTerm: searchTerm,
      });

      navInProgress = true;

      // Créer URL de recherche Qwant
      const encodedSearch = encodeURIComponent(searchTerm);
      redirectUrl = `https://www.qwant.com/?q=${encodedSearch}`;

      // Rediriger
      window.location.href = redirectUrl;
      showFeedback('Recherche: ' + searchTerm);
    }

    // Update form UI for current product
    function updateForm() {
      // Clear lingering text highlights
      document
        .querySelectorAll('.' + config.classPrefix + 'text-selected')
        .forEach((el) => el.classList.remove(config.classPrefix + 'text-selected'));

      const product = products[currentProductIndex];
      const sku = product.sku || 'Sans SKU';
      const designation = product.designation || 'Sans désignation';
      const productId = product.id || product._id;

      // Vérifier si on a une URL stockée pour ce produit
      const hasStoredUrl = productId && productUrls[productId];

      container.innerHTML = `
        <div class="${config.classPrefix}nav-row">
          <div>
            <h2>Capture de contenu</h2>
            <div>
              <span class="${config.classPrefix}badge">${currentProductIndex + 1} / ${products.length}</span>
              <span class="${config.classPrefix}badge">${sku}</span>
            </div>
          </div>
        </div>

        <label>Produit actuel</label>
        <input type="text" class="${config.classPrefix}input" value="${designation}" readonly>

        <label>Titre</label>
        <input id="title" type="text" class="${config.classPrefix}input" placeholder="Titre du produit">

        <label>Description</label>
        <textarea id="description" class="${config.classPrefix}input" rows="6" placeholder="Description du produit"></textarea>

        <label>Images <span id="images-counter">(0)</span></label>
        <div id="image-container" class="${config.classPrefix}image-container"></div>

        <div class="${config.classPrefix}btn-group">
          <div>
            <button id="prev-btn" class="${config.classPrefix}btn" ${currentProductIndex === 0 ? 'disabled' : ''}>◀ Précédent</button>
            <button id="next-btn" class="${config.classPrefix}btn" ${currentProductIndex === products.length - 1 ? 'disabled' : ''}>Suivant ▶</button>
          </div>
          <button id="export-btn" class="${config.classPrefix}btn ${config.classPrefix}btn-export">Exporter</button>
        </div>
        
        <div class="${config.classPrefix}action-buttons">
          <button id="url-btn" class="${config.classPrefix}btn ${config.classPrefix}btn-url" ${!hasStoredUrl ? 'disabled' : ''}>
            <span class="${config.classPrefix}btn-icon">🔗</span>Page produit
          </button>
          <button id="search-btn" class="${config.classPrefix}btn ${config.classPrefix}btn-search">
            <span class="${config.classPrefix}btn-icon">🔍</span>Rechercher
          </button>
        </div>
      `;

      bindFormEvents();
      loadProductData(product);

      // Informer l'application principale du changement de produit actuel
      sendToMainApp('PRODUCT_CHANGED', {
        currentProductIndex: currentProductIndex,
        product: {
          id: product.id || product._id,
          sku: product.sku,
          designation: product.designation,
        },
      });
    }

    // Bind events on form
    function bindFormEvents() {
      // Focus on inputs sets active-input and focusedInput
      const titleInput = document.getElementById('title');
      const descInput = document.getElementById('description');
      [titleInput, descInput].forEach((input) => {
        input.addEventListener('focus', () => {
          document
            .querySelectorAll('.' + config.classPrefix + 'active-input')
            .forEach((el) => el.classList.remove(config.classPrefix + 'active-input'));
          focusedInput = input;
          focusedInput.classList.add(config.classPrefix + 'active-input');
          showFeedback(`Champ ${input.id} activé`);
        });

        // Envoyer les mises à jour des champs à l'application principale
        input.addEventListener('input', () => {
          const product = products[currentProductIndex];
          product._captured = product._captured || {};
          product._captured[input.id] = input.value;

          sendToMainApp('FIELD_UPDATED', {
            currentProductIndex: currentProductIndex,
            field: input.id,
            value: input.value,
          });
        });
      });

      document.getElementById('prev-btn').addEventListener('click', () => {
        if (currentProductIndex > 0) {
          saveCurrentProduct();
          currentProductIndex--;

          // Demander à l'application principale la navigation vers l'URL du produit précédent
          sendToMainApp('NAVIGATE_TO_PRODUCT_URL', {
            productIndex: currentProductIndex,
          });

          updateForm();
        }
      });

      document.getElementById('next-btn').addEventListener('click', () => {
        if (currentProductIndex < products.length - 1) {
          saveCurrentProduct();
          currentProductIndex++;

          // Demander à l'application principale la navigation vers l'URL du produit suivant
          sendToMainApp('NAVIGATE_TO_PRODUCT_URL', {
            productIndex: currentProductIndex,
          });

          updateForm();
        }
      });

      // Bouton de recherche explicite
      document.getElementById('search-btn').addEventListener('click', () => {
        navigateToProductSearch();
      });

      // Bouton pour retourner à l'URL enregistrée
      const urlBtn = document.getElementById('url-btn');
      if (urlBtn) {
        urlBtn.addEventListener('click', () => {
          const product = products[currentProductIndex];
          const productId = product.id || product._id;

          if (productId && productUrls[productId]) {
            // Sauvegarder l'état actuel avant la navigation
            saveCurrentProduct();

            // Informer l'application principale de la navigation
            sendToMainApp('NAVIGATION_START', {
              currentProductIndex: currentProductIndex,
              targetUrl: productUrls[productId],
            });

            navInProgress = true;

            // Naviguer vers l'URL enregistrée
            window.location.href = productUrls[productId];
            showFeedback('Navigation vers la page produit');
          } else {
            showFeedback('Aucune URL produit enregistrée');
          }
        });
      }

      document.getElementById('export-btn').addEventListener('click', exportProducts);
    }

    // Save current product data
    function saveCurrentProduct() {
      const product = products[currentProductIndex];
      product._captured = product._captured || {};
      product._captured.title = document.getElementById('title').value;
      product._captured.description = document.getElementById('description').value;

      // Save text selections
      product._captured.selections = Array.from(
        document.querySelectorAll('.' + config.classPrefix + 'text-selected')
      ).map((el) => getTextContent(el));

      product._captured.images = Array.from(
        document.getElementById('image-container').children
      ).map((img) => ({ src: img.src, alt: img.alt || '' }));

      // Sauvegarder l'URL actuelle si ce n'est pas une URL système
      const productId = product.id || product._id;
      if (
        productId &&
        window.location.href &&
        !window.location.href.includes('google.com/#APP_PRODUCTS_DATA=') &&
        !window.location.href.includes('qwant.com/?q=')
      ) {
        productUrls[productId] = window.location.href;

        // Informer l'application principale de l'URL sauvegardée
        sendToMainApp('URL_SAVED', {
          productId: productId,
          url: window.location.href,
        });

        // Mettre à jour l'état du bouton URL
        updateUrlButtonState();
      }

      // Envoyer les données capturées à l'application principale
      sendToMainApp('PRODUCT_SAVED', {
        currentProductIndex: currentProductIndex,
        productData: product._captured,
      });
    }

    // Add image thumbnail
    function addImageThumbnail(src, alt) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt;
      img.className = config.classPrefix + 'image-preview';
      img.addEventListener('click', () => {
        img.remove();
        updateImagesCounter();
        document
          .querySelectorAll(`img[src="${src}"]`)
          .forEach((i) => i.classList.remove(config.classPrefix + 'image-selected'));
        showFeedback('Image retirée');

        // Mettre à jour les images enregistrées
        saveCurrentProduct();
      });
      document.getElementById('image-container').appendChild(img);
      updateImagesCounter();
    }

    function updateImagesCounter() {
      document.getElementById('images-counter').textContent =
        `(${document.getElementById('image-container').children.length})`;
    }

    // Load previously captured data
    function loadProductData(product) {
      if (!product._captured) return;
      document.getElementById('title').value = product._captured.title || '';
      document.getElementById('description').value = product._captured.description || '';
      const containerEl = document.getElementById('image-container');
      containerEl.innerHTML = '';
      (product._captured.images || []).forEach((i) => addImageThumbnail(i.src, i.alt));
      // Restore text selections
      (product._captured.selections || []).forEach((txt) => {
        document.querySelectorAll(config.selectors.text).forEach((el) => {
          if (getTextContent(el) === txt) el.classList.add(config.classPrefix + 'text-selected');
        });
      });
    }

    function exportProducts() {
      saveCurrentProduct();
      const exportData = products.map((p) => ({
        id: p.id || p._id || null,
        sku: p.sku || null,
        designation: p.designation || null,
        title: p._captured?.title || null,
        description: p._captured?.description || null,
        selections: p._captured?.selections || [],
        images: p._captured?.images || [],
        capturedUrl: productUrls[p.id || p._id] || null, // Inclure l'URL capturée
      }));

      // Envoyer la demande d'export à l'application principale
      sendToMainApp('EXPORT_PRODUCTS', { products: exportData });

      // Créer aussi l'export local comme avant pour compatibilité
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const filename = `produits_captures_${new Date().toISOString().slice(0, 10)}.json`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showFeedback('Produits exportés !');
    }

    // Hover & selection of text/images
    document.addEventListener('mouseover', (e) => {
      const el = e.target;
      if (el.closest('.' + config.classPrefix + 'product-form')) return;
      if (el.matches(config.selectors.text))
        el.classList.add(config.classPrefix + 'text-highlight');
      else if (config.enableImageSelection && el.matches(config.selectors.image))
        el.classList.add(config.classPrefix + 'image-highlight');
    });

    document.addEventListener('mouseout', (e) => {
      const el = e.target;
      if (el.closest('.' + config.classPrefix + 'product-form')) return;
      if (el.matches(config.selectors.text))
        el.classList.remove(config.classPrefix + 'text-highlight');
      else if (
        config.enableImageSelection &&
        el.matches(config.selectors.image) &&
        !el.classList.contains(config.classPrefix + 'image-selected')
      )
        el.classList.remove(config.classPrefix + 'image-highlight');
    });

    document.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const el = e.target;
      if (el.closest('.' + config.classPrefix + 'product-form')) return;

      if (el.matches(config.selectors.text)) {
        if (!focusedInput) return showFeedback("Sélectionnez d'abord un champ !");
        e.preventDefault();
        e.stopPropagation();
        const txt = getTextContent(el);
        const added = toggleClass(el, config.classPrefix + 'text-selected');
        updateField(focusedInput, txt, !added);
        showFeedback(`Texte ${added ? 'ajouté' : 'retiré'}`);

        // Mettre à jour l'application principale après une sélection de texte
        setTimeout(() => saveCurrentProduct(), 100);
      } else if (config.enableImageSelection && el.matches(config.selectors.image)) {
        e.preventDefault();
        e.stopPropagation();
        const isSel = el.classList.toggle(config.classPrefix + 'image-selected');
        if (isSel) {
          addImageThumbnail(el.src, el.alt);
          showFeedback('Image ajoutée');
        } else {
          const imgs = document.getElementById('image-container');
          Array.from(imgs.children).forEach((img) => {
            if (img.src === el.src) img.remove();
          });
          updateImagesCounter();
          showFeedback('Image retirée');
        }

        // Mettre à jour l'application principale après une sélection d'image
        setTimeout(() => saveCurrentProduct(), 100);
      }
    });

    // Sauvegarder l'URL actuelle dès le chargement initial et mettre à jour l'état du bouton URL
    setTimeout(() => {
      const product = products[currentProductIndex];
      const productId = product.id || product._id;
      if (
        productId &&
        window.location.href &&
        !window.location.href.includes('google.com/#APP_PRODUCTS_DATA=') &&
        !window.location.href.includes('qwant.com/?q=')
      ) {
        productUrls[productId] = window.location.href;

        // Informer l'application principale de l'URL sauvegardée
        sendToMainApp('URL_SAVED', {
          productId: productId,
          url: window.location.href,
        });

        // Mettre à jour l'état du bouton URL
        updateUrlButtonState();
      }
    }, 1000);

    // Demander l'état actuel à l'application principale
    // après un court délai pour s'assurer que les écouteurs sont en place
    setTimeout(requestState, 300);

    // Init
    updateForm();

    // Lancer une recherche lors du premier chargement
    if (isFirstLoad && window.location.href.includes('APP_PRODUCTS_DATA')) {
      // Uniquement si on est sur une nouvelle page (Google par défaut)
      // et qu'on n'est pas sur une page de résultats Qwant
      if (
        window.location.href.includes('google.com') &&
        !window.location.href.includes('qwant.com/?q=')
      ) {
        // Vérifier si on a une URL stockée pour ce produit
        const product = products[currentProductIndex];
        const productId = product.id || product._id;
        if (productId && productUrls[productId]) {
          // Si on a une URL stockée, naviguer directement vers celle-ci
          console.log(`Utilisation de l'URL stockée pour ${productId}:`, productUrls[productId]);
          window.location.href = productUrls[productId];
          showFeedback('Navigation vers la page enregistrée');
        } else {
          // Sinon, lancer une recherche
          setTimeout(navigateToProductSearch, 300);
        }
      }
    }

    showFeedback('Sélecteur de contenu activé !');
    return true;
  } catch (e) {
    console.error('Erreur dans productContentSelector:', e);
    return false;
  }
})(/*PLACEHOLDER_PRODUCTS*/);
