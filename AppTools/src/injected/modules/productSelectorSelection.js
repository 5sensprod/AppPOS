// AppTools\src\injected\modules\productSelectorSelection.js
const ProductSelectorSelection = (config, communication, ui) => {
  // Initialiser les écouteurs pour la sélection de contenu
  function initialize() {
    // Survol des éléments texte et images
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    // Sélection des éléments texte et images
    document.addEventListener('mousedown', handleMouseDown);
  }

  // Gérer le survol des éléments
  function handleMouseOver(e) {
    const el = e.target;
    if (el.closest('.' + config.classPrefix + 'product-form')) return;

    if (el.matches(config.selectors.text)) {
      el.classList.add(config.classPrefix + 'text-highlight');
    } else if (config.behavior.enableImageSelection && el.matches(config.selectors.image)) {
      el.classList.add(config.classPrefix + 'image-highlight');
    }
  }

  // Gérer la fin du survol des éléments
  function handleMouseOut(e) {
    const el = e.target;
    if (el.closest('.' + config.classPrefix + 'product-form')) return;

    if (el.matches(config.selectors.text)) {
      el.classList.remove(config.classPrefix + 'text-highlight');
    } else if (
      config.behavior.enableImageSelection &&
      el.matches(config.selectors.image) &&
      !el.classList.contains(config.classPrefix + 'image-selected')
    ) {
      el.classList.remove(config.classPrefix + 'image-highlight');
    }
  }

  // Gérer le clic sur les éléments sélectionnables
  function handleMouseDown(e) {
    if (e.button !== 0) return; // Seulement le clic gauche

    const el = e.target;
    if (el.closest('.' + config.classPrefix + 'product-form')) return;

    // Sélection de texte
    if (el.matches(config.selectors.text)) {
      handleTextSelection(e, el);
    }
    // Sélection d'image
    else if (config.behavior.enableImageSelection && el.matches(config.selectors.image)) {
      handleImageSelection(e, el);
    }
  }

  // Gérer la sélection de texte
  function handleTextSelection(e, el) {
    const focusedInput = ui.getFocusedInput();

    if (!focusedInput) {
      ui.showFeedback("Sélectionnez d'abord un champ !");
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const txt = getTextContent(el);
    const added = toggleClass(el, config.classPrefix + 'text-selected');

    ui.updateField(focusedInput, txt, !added);
    ui.showFeedback(`Texte ${added ? 'ajouté' : 'retiré'}`);

    // Mettre à jour l'application principale après une sélection de texte
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('save-current-product'));
    }, 100);
  }

  // Gérer la sélection d'image
  function handleImageSelection(e, el) {
    e.preventDefault();
    e.stopPropagation();

    // Vérifier les dimensions avant la sélection
    const tempImg = new Image();
    tempImg.onload = function () {
      const width = this.width;
      const height = this.height;

      // Vérifier si l'image est assez grande (min 1024x1024)
      if (width < 1024 || height < 1024) {
        ui.showFeedback(`Image trop petite (${width}x${height}). Minimum requis: 1024x1024px`);
        return;
      }

      // Continuer le processus normal de sélection
      const isSel = toggleClass(el, config.classPrefix + 'image-selected');

      if (isSel) {
        ui.addImageThumbnail(el.src, el.alt, (src) => {
          // Callback lors de la suppression d'image
          document
            .querySelectorAll(`img[src="${src}"]`)
            .forEach((img) => img.classList.remove(config.classPrefix + 'image-selected'));
        });
        ui.showFeedback('Image ajoutée');
      } else {
        const imgs = document.getElementById('image-container');
        Array.from(imgs.children).forEach((img) => {
          if (img.querySelector('img')?.src === el.src || img.src === el.src) {
            img.remove();
          }
        });
        ui.updateImagesCounter();
        ui.showFeedback('Image retirée');
      }

      // Mettre à jour l'application principale après une sélection d'image
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('save-current-product'));
      }, 100);
    };

    tempImg.onerror = function () {
      ui.showFeedback("Impossible de vérifier les dimensions de l'image");
    };

    tempImg.src = el.src;
  }

  // Récupérer le contenu texte d'un élément
  function getTextContent(el) {
    if (el.tagName === 'LI') return el.textContent.trim();
    if (['UL', 'OL'].includes(el.tagName)) {
      return Array.from(el.querySelectorAll('li'))
        .map((li) => '• ' + li.textContent.trim())
        .join('\n');
    }
    return el.textContent.trim();
  }

  // Basculer une classe sur un élément
  function toggleClass(el, cls) {
    el.classList.toggle(cls);
    return el.classList.contains(cls);
  }

  // Récupérer tous les éléments de texte sélectionnés
  function getSelectedTextElements() {
    return document.querySelectorAll('.' + config.classPrefix + 'text-selected');
  }

  // API publique
  return {
    initialize,
    getSelectedTextElements,
    getTextContent,
  };
};

// Export pour le contexte global
window.ProductSelectorSelection = ProductSelectorSelection;
