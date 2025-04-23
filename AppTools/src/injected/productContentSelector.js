// IIFE injecté dans la page : on passe directement l'objet `products`
(function (products) {
  try {
    const config = {
      selectors: {
        text: 'p,li,div,h1,h2,h3,h4,h5,h6',
        image: 'img',
      },
      enableImageSelection: true,
    };
    let currentProductIndex = 0;
    let focusedInput = null;

    // Feedback flottant
    const feedback = document.createElement('div');
    feedback.className = 'feedback';
    document.body.appendChild(feedback);
    function showFeedback(msg) {
      feedback.textContent = msg;
      feedback.style.opacity = '1';
      setTimeout(() => (feedback.style.opacity = '0'), 2000);
    }

    // Container principal
    const container = document.createElement('div');
    container.className = 'product-form';
    document.body.appendChild(container);

    // Mise à jour du formulaire pour le produit courant
    function updateForm() {
      const product = products[currentProductIndex];
      const sku = product.sku || 'Sans SKU';
      const designation = product.designation || 'Sans désignation';

      container.innerHTML = `
        <div class="nav-row">
          <div>
            <h2 style="margin:0 0 10px">Capture de contenu</h2>
            <div>
              <span class="badge">${currentProductIndex + 1} / ${products.length}</span>
              <span class="badge">${sku}</span>
            </div>
          </div>
        </div>

        <label>Produit actuel</label>
        <input type="text" class="input" value="${designation}" readonly>

        <label>
          Titre
          <button type="button" id="focus-title" class="btn btn-small btn-secondary">
            Sélectionner
          </button>
        </label>
        <input id="title" type="text" class="input" placeholder="Titre du produit">

        <label>
          Description
          <button type="button" id="focus-description" class="btn btn-small btn-secondary">
            Sélectionner
          </button>
        </label>
        <textarea id="description" class="input" rows="6"
          placeholder="Description du produit"></textarea>

        <label>Images <span id="images-counter">(0)</span></label>
        <div id="image-container"
             style="display:flex;flex-wrap:wrap;margin:10px 0"></div>

        <div style="display:flex;margin-top:15px;justify-content:space-between">
          <div>
            <button id="prev-btn" class="btn"
                    ${currentProductIndex === 0 ? 'disabled' : ''}>
              ◀ Précédent
            </button>
            <button id="next-btn" class="btn"
                    ${currentProductIndex === products.length - 1 ? 'disabled' : ''}>
              Suivant ▶
            </button>
          </div>
          <button id="export-btn" class="btn">Exporter</button>
        </div>
      `;

      bindFormEvents();
      loadProductData(product);
    }

    // Liaison des événements sur le formulaire (après innerHTML)
    function bindFormEvents() {
      document.getElementById('focus-title').addEventListener('click', () => {
        focusedInput = document.getElementById('title');
        document
          .querySelectorAll('.active-input')
          .forEach((el) => el.classList.remove('active-input'));
        focusedInput.classList.add('active-input');
        showFeedback('Sélectionnez du texte pour le titre');
      });

      document.getElementById('focus-description').addEventListener('click', () => {
        focusedInput = document.getElementById('description');
        document
          .querySelectorAll('.active-input')
          .forEach((el) => el.classList.remove('active-input'));
        focusedInput.classList.add('active-input');
        showFeedback('Sélectionnez du texte pour la description');
      });

      document.getElementById('prev-btn').addEventListener('click', () => {
        if (currentProductIndex > 0) {
          saveCurrentProduct();
          currentProductIndex--;
          updateForm();
        }
      });

      document.getElementById('next-btn').addEventListener('click', () => {
        if (currentProductIndex < products.length - 1) {
          saveCurrentProduct();
          currentProductIndex++;
          updateForm();
        }
      });

      document.getElementById('export-btn').addEventListener('click', exportProducts);
    }

    // Sauvegarde des champs et vignettes
    function saveCurrentProduct() {
      const product = products[currentProductIndex];
      product._captured = product._captured || {};
      product._captured.title = document.getElementById('title').value;
      product._captured.description = document.getElementById('description').value;
      product._captured.images = Array.from(
        document.getElementById('image-container').children
      ).map((img) => ({ src: img.src, alt: img.alt || '' }));
    }

    // Ajoute une vignette cliquable
    function addImageThumbnail(src, alt) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt;
      img.className = 'image-preview';
      img.addEventListener('click', () => {
        img.remove();
        updateImagesCounter();
        document.querySelectorAll('img').forEach((i) => {
          if (i.src === src) i.classList.remove('image-selected');
        });
        showFeedback('Image retirée');
      });
      document.getElementById('image-container').appendChild(img);
      updateImagesCounter();
    }

    function updateImagesCounter() {
      const count = document.getElementById('image-container').children.length;
      document.getElementById('images-counter').textContent = `(${count})`;
    }

    // Charge ce qui a déjà été capturé
    function loadProductData(product) {
      if (!product._captured) return;
      document.getElementById('title').value = product._captured.title || '';
      document.getElementById('description').value = product._captured.description || '';
      const container = document.getElementById('image-container');
      container.innerHTML = '';
      (product._captured.images || []).forEach((i) => addImageThumbnail(i.src, i.alt));
    }

    // Génère et télécharge le JSON
    function exportProducts() {
      saveCurrentProduct();
      const exportData = products.map((p) => ({
        id: p.id || null,
        sku: p.sku || null,
        designation: p.designation || null,
        title: p._captured?.title || null,
        description: p._captured?.description || null,
        images: p._captured?.images || [],
      }));
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

    // Survol & sélection de texte/images
    document.addEventListener('mouseover', (e) => {
      const el = e.target;
      if (el.closest('.product-form')) return;
      if (el.matches(config.selectors.text)) el.classList.add('text-highlight');
      else if (config.enableImageSelection && el.matches(config.selectors.image))
        el.classList.add('image-highlight');
    });

    document.addEventListener('mouseout', (e) => {
      const el = e.target;
      if (el.closest('.product-form')) return;
      if (el.matches(config.selectors.text)) el.classList.remove('text-highlight');
      else if (
        config.enableImageSelection &&
        el.matches(config.selectors.image) &&
        !el.classList.contains('image-selected')
      )
        el.classList.remove('image-highlight');
    });

    document.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const el = e.target;
      if (el.closest('.product-form')) return;

      if (el.matches(config.selectors.text)) {
        if (!focusedInput) return showFeedback("Sélectionnez d'abord un champ !");
        e.preventDefault();
        e.stopPropagation();
        const txt = el.textContent.trim();
        const curr = focusedInput.value.trim();
        focusedInput.value = curr ? `${curr}\n\n${txt}` : txt;
        showFeedback('Texte ajouté');
      } else if (config.enableImageSelection && el.matches(config.selectors.image)) {
        e.preventDefault();
        e.stopPropagation();
        const isSel = el.classList.toggle('image-selected');
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
      }
    });

    // Lancement
    updateForm();
    showFeedback('Sélecteur de contenu activé !');
    return true;
  } catch (e) {
    console.error('Erreur dans productContentSelector:', e);
    return false;
  }
})(/*PLACEHOLDER_PRODUCTS*/);
