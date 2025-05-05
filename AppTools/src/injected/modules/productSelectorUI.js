// AppTools\src\injected\modules\productSelectorUI.js
const ProductSelectorUI = (config, communication) => {
  // Variables d'état
  let container = null;
  let focusedInput = null;
  let panel = null;

  // Créer les éléments d'UI principaux
  function createUI() {
    // Initialiser le panneau latéral
    panel = ProductSelectorUIPanel(config).initialize();

    // Feedback flottant
    const feedback = document.createElement('div');
    feedback.className = config.classPrefix + 'feedback';
    document.body.appendChild(feedback);

    // Créer le conteneur du formulaire
    container = document.createElement('div');
    container.className = config.classPrefix + 'product-form';

    // Placer le conteneur dans le panneau
    const formContainer = ProductSelectorUIPanel(config).getContainer();
    if (formContainer) {
      formContainer.appendChild(container);
    } else {
      // Si le panneau n'est pas disponible, fallback au body
      document.body.appendChild(container);
    }

    // Garder une référence à ces éléments dans le DOM
    window._productSelectorElements = {
      feedback,
      container,
      panel,
    };
  }

  // Afficher un message de feedback
  function showFeedback(msg) {
    const feedback = window._productSelectorElements.feedback;
    feedback.textContent = msg;
    feedback.style.opacity = '1';
    setTimeout(() => (feedback.style.opacity = '0'), 2000);
  }

  // Mettre à jour le formulaire pour un produit
  function updateForm(product, currentProductIndex, totalProducts, hasStoredUrl) {
    // Vérifier que le conteneur existe
    if (!container) return;

    const sku = product.sku || 'Sans SKU';
    const designation = product.designation || 'Sans désignation';

    container.innerHTML = `
        <div class="${config.classPrefix}nav-row">
          <div>
            <h2>Capture de contenu</h2>
            <div>
              <span class="${config.classPrefix}badge">${currentProductIndex + 1} / ${totalProducts}</span>
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
            <button id="next-btn" class="${config.classPrefix}btn" ${currentProductIndex === totalProducts - 1 ? 'disabled' : ''}>Suivant ▶</button>
          </div>
        </div>
        
        <div class="${config.classPrefix}action-buttons">
          <button id="url-btn" class="${config.classPrefix}btn ${config.classPrefix}btn-url" ${!hasStoredUrl ? 'disabled' : ''}>
            <span class="${config.classPrefix}btn-icon">🔗</span>Page produit
          </button>
          <button id="search-btn" class="${config.classPrefix}btn ${config.classPrefix}btn-search">
            <span class="${config.classPrefix}btn-icon">🔍</span>Rechercher
          </button>
          <button id="toggle-css-btn" class="${config.classPrefix}btn">
            <span class="${config.classPrefix}btn-icon">🎨</span>Basculer CSS
          </button>
        </div>
      `;

    // Ajouter l'écouteur d'événement pour le nouveau bouton
    const toggleCssBtn = document.getElementById('toggle-css-btn');
    if (toggleCssBtn) {
      toggleCssBtn.addEventListener('click', toggleStyleSheets);
    }

    // Émettre un événement pour indiquer que le formulaire a été mis à jour
    document.dispatchEvent(new CustomEvent('form-updated'));
  }

  // Mettre à jour l'état du bouton URL
  function updateUrlButtonState(hasUrl) {
    const urlBtn = document.getElementById('url-btn');
    if (!urlBtn) return;

    if (hasUrl) {
      urlBtn.disabled = false;
      urlBtn.title = 'Aller à la page produit enregistrée';
    } else {
      urlBtn.disabled = true;
      urlBtn.title = 'Aucune URL de produit enregistrée';
    }
  }

  // Gérer les événements de focus sur les champs
  function handleFieldFocus(event) {
    const input = event.target;

    document
      .querySelectorAll('.' + config.classPrefix + 'active-input')
      .forEach((el) => el.classList.remove(config.classPrefix + 'active-input'));

    focusedInput = input;
    focusedInput.classList.add(config.classPrefix + 'active-input');
    showFeedback(`Champ ${input.id} activé`);
  }

  // Mettre à jour le compteur d'images
  function updateImagesCounter() {
    const counter = document.getElementById('images-counter');
    if (!counter) return;

    const container = document.getElementById('image-container');
    if (!container) return;

    counter.textContent = `(${container.children.length})`;
  }

  /**
   * Extrait et retourne les informations des images depuis un conteneur
   * @param {HTMLElement} containerEl - Le conteneur des images
   * @returns {Array} Un tableau d'objets contenant les informations des images
   */
  function extractImagesInfo(containerEl) {
    if (!containerEl) return [];

    console.log("Extraction des infos d'images, nombre d'éléments:", containerEl.children.length);

    const images = [];

    // Parcourir tous les éléments enfants du conteneur
    Array.from(containerEl.children).forEach((wrapper) => {
      // Trouver l'image à l'intérieur du wrapper
      const img = wrapper.querySelector('img');

      if (img) {
        // Utiliser d'abord dataset.originalSrc, puis src comme fallback
        const imgSrc = img.dataset.originalSrc || img.src;
        console.log('Image trouvée avec URL:', imgSrc);

        images.push({
          src: imgSrc,
          alt: img.alt || '',
          width: img.dataset.width,
          height: img.dataset.height,
          sizeKB: img.dataset.sizeKB,
        });
      }
    });

    console.log('Images extraites:', images.length);
    return images;
  }

  // Ajouter une miniature d'image au conteneur
  function addImageThumbnail(src, alt, onRemove) {
    const container = document.getElementById('image-container');
    if (!container) return null;

    // Utiliser la structure originale mais ajouter un attribut data pour stocker les dimensions
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.className = config.classPrefix + 'image-preview';
    img.dataset.originalSrc = src; // Stocker l'URL originale pour être sûr

    // Ajouter un style pour positionner l'info de taille
    img.style.position = 'relative';
    img.style.maxWidth = '100px';
    img.style.maxHeight = '100px';
    img.style.margin = '5px';
    img.style.border = '1px solid #ccc';
    img.style.borderRadius = '4px';

    // Créer un div pour les infos de taille qui sera positionné par-dessus l'image
    const sizeInfo = document.createElement('div');
    sizeInfo.className = config.classPrefix + 'image-size-info';
    sizeInfo.style.position = 'absolute';
    sizeInfo.style.bottom = '0';
    sizeInfo.style.left = '0';
    sizeInfo.style.right = '0';
    sizeInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    sizeInfo.style.color = 'white';
    sizeInfo.style.fontSize = '10px';
    sizeInfo.style.padding = '2px 4px';
    sizeInfo.style.textAlign = 'center';
    sizeInfo.textContent = 'Chargement...';

    // Conteneur pour l'image et l'info de taille
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.appendChild(img);
    wrapper.appendChild(sizeInfo);

    // Obtenir les dimensions réelles
    const tempImg = new Image();
    tempImg.onload = function () {
      const width = this.width;
      const height = this.height;
      const approxSizeKB = Math.round((width * height * 4) / 1024);
      sizeInfo.textContent = `${width}×${height} (~${approxSizeKB} KB)`;

      // Stocker les infos comme attributs data
      img.dataset.width = width;
      img.dataset.height = height;
      img.dataset.sizeKB = approxSizeKB;
    };
    tempImg.onerror = function () {
      sizeInfo.textContent = 'Dimension inconnue';
    };
    tempImg.src = src;

    // Gestionnaire de clic pour la suppression
    wrapper.addEventListener('click', () => {
      wrapper.remove();
      updateImagesCounter();

      if (typeof onRemove === 'function') {
        onRemove(src);
      }

      showFeedback('Image retirée');
    });

    container.appendChild(wrapper);
    updateImagesCounter();

    // CRUCIAL: Conserver l'URL dans la propriété src de l'image
    console.log('Miniature ajoutée avec URL:', src);

    return img;
  }

  // Mettre à jour le contenu d'un champ texte
  function updateField(input, text, remove = false) {
    if (!input) return;

    let val = input.value.trim();
    if (!remove) {
      input.value = val ? val + '\n\n' + text : text;
    } else {
      input.value = val.split(text).join('').trim();
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(() => input.focus(), 0);
  }

  // Obtenir le champ actuellement focalisé
  function getFocusedInput() {
    return focusedInput;
  }

  // Créer une fonction pour basculer l'état des feuilles de style
  function toggleStyleSheets() {
    var styleSheets = document.styleSheets;
    var allDisabled = true;

    // Vérifier si toutes les feuilles de style sont déjà désactivées
    for (var i = 0; i < styleSheets.length; i++) {
      if (!styleSheets[i].disabled) {
        allDisabled = false;
        break;
      }
    }

    // Basculer l'état de toutes les feuilles de style
    for (var i = 0; i < styleSheets.length; i++) {
      try {
        styleSheets[i].disabled = !allDisabled;
      } catch (e) {
        console.log('Erreur avec la feuille de style ' + i, e);
      }
    }

    // Important : S'assurer que les styles du panneau restent appliqués
    const panel = document.getElementById('app-tools-panel');
    if (panel) {
      // Réappliquer les styles inline pour s'assurer que le panneau reste visible
      Object.assign(panel.style, {
        position: 'fixed',
        top: '0',
        right: '0',
        width: '380px',
        height: '100vh',
        background: '#fff',
        zIndex: '2147483647',
        boxShadow: '-2px 0 6px rgba(0,0,0,.15)',
        display: 'flex',
        flexDirection: 'column',
      });

      // S'assurer que le document reste décalé
      document.documentElement.style.marginRight = '380px';
    }

    console.log(allDisabled ? 'Styles CSS réactivés !' : 'Styles CSS désactivés !');

    // Montrer un feedback à l'utilisateur
    showFeedback(allDisabled ? 'Styles CSS réactivés !' : 'Styles CSS désactivés !');

    return !allDisabled; // Retourne le nouvel état (true = désactivé, false = activé)
  }

  // API publique
  return {
    createUI,
    showFeedback,
    updateForm,
    updateUrlButtonState,
    handleFieldFocus,
    updateImagesCounter,
    addImageThumbnail,
    updateField,
    getFocusedInput,
    extractImagesInfo,
    toggleStyleSheets,
    getPanel: () => panel,
  };
};

// Export pour le contexte global
window.ProductSelectorUI = ProductSelectorUI;
