// AppTools\src\injected\modules\productSelectorUI.js
const ProductSelectorUI = (config, communication) => {
  // Variables d'état
  let container = null;
  let focusedInput = null;

  // Créer les éléments d'UI principaux
  function createUI() {
    // Feedback flottant
    const feedback = document.createElement('div');
    feedback.className = config.classPrefix + 'feedback';
    document.body.appendChild(feedback);

    // Conteneur principal
    container = document.createElement('div');
    container.className = config.classPrefix + 'product-form';
    document.body.appendChild(container);

    // Garder une référence à ces éléments dans le DOM
    window._productSelectorElements = {
      feedback,
      container,
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

  // Ajouter une vignette d'image
  function addImageThumbnail(src, alt, onRemove) {
    const container = document.getElementById('image-container');
    if (!container) return null;

    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.className = config.classPrefix + 'image-preview';
    img.addEventListener('click', () => {
      img.remove();
      updateImagesCounter();

      // Notifier le callback de suppression si fourni
      if (typeof onRemove === 'function') {
        onRemove(src);
      }

      showFeedback('Image retirée');
    });

    container.appendChild(img);
    updateImagesCounter();
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
  };
};

// Export pour le contexte global
window.ProductSelectorUI = ProductSelectorUI;
