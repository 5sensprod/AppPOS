(function (products) {
  try {
    // --- Inject Violet-Pink CSS for selected text blocks and active inputs (border only) ---
    const runtimeStyle = document.createElement('style');
    runtimeStyle.textContent = `
      .text-selected { 
        background: rgba(255, 105, 180, 0.2) !important; 
        border-radius: 3px; 
        cursor: pointer; 
      }
      .active-input { 
        border: 2px solid #FF69B4 !important; 
      }
    `;
    document.head.appendChild(runtimeStyle);

    const config = {
      selectors: {
        text: 'p,li,div,h1,h2,h3,h4,h5,h6',
        image: 'img',
      },
      enableImageSelection: true,
    };
    let currentProductIndex = 0;
    let focusedInput = null;

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
    feedback.className = 'feedback';
    document.body.appendChild(feedback);
    function showFeedback(msg) {
      feedback.textContent = msg;
      feedback.style.opacity = '1';
      setTimeout(() => (feedback.style.opacity = '0'), 2000);
    }

    // Main container
    const container = document.createElement('div');
    container.className = 'product-form';
    document.body.appendChild(container);

    // Update form UI for current product
    function updateForm() {
      // Clear lingering text highlights
      document
        .querySelectorAll('.text-selected')
        .forEach((el) => el.classList.remove('text-selected'));

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

        <label>Titre</label>
        <input id="title" type="text" class="input" placeholder="Titre du produit">

        <label>Description</label>
        <textarea id="description" class="input" rows="6" placeholder="Description du produit"></textarea>

        <label>Images <span id="images-counter">(0)</span></label>
        <div id="image-container" style="display:flex;flex-wrap:wrap;margin:10px 0"></div>

        <div style="display:flex;margin-top:15px;justify-content:space-between">
          <div>
            <button id="prev-btn" class="btn" ${currentProductIndex === 0 ? 'disabled' : ''}>◀ Précédent</button>
            <button id="next-btn" class="btn" ${currentProductIndex === products.length - 1 ? 'disabled' : ''}>Suivant ▶</button>
          </div>
          <button id="export-btn" class="btn">Exporter</button>
        </div>
      `;

      bindFormEvents();
      loadProductData(product);
    }

    // Bind events on form
    function bindFormEvents() {
      // Focus on inputs sets active-input and focusedInput
      const titleInput = document.getElementById('title');
      const descInput = document.getElementById('description');
      [titleInput, descInput].forEach((input) => {
        input.addEventListener('focus', () => {
          document
            .querySelectorAll('.active-input')
            .forEach((el) => el.classList.remove('active-input'));
          focusedInput = input;
          focusedInput.classList.add('active-input');
          showFeedback(`Champ ${input.id} activé`);
        });
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

    // Save current product data
    function saveCurrentProduct() {
      const product = products[currentProductIndex];
      product._captured = product._captured || {};
      product._captured.title = document.getElementById('title').value;
      product._captured.description = document.getElementById('description').value;
      // Save text selections
      product._captured.selections = Array.from(document.querySelectorAll('.text-selected')).map(
        (el) => getTextContent(el)
      );
      product._captured.images = Array.from(
        document.getElementById('image-container').children
      ).map((img) => ({ src: img.src, alt: img.alt || '' }));
    }

    // Add image thumbnail
    function addImageThumbnail(src, alt) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt;
      img.className = 'image-preview';
      img.addEventListener('click', () => {
        img.remove();
        updateImagesCounter();
        document
          .querySelectorAll(`img[src="${src}"]`)
          .forEach((i) => i.classList.remove('image-selected'));
        showFeedback('Image retirée');
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
          if (getTextContent(el) === txt) el.classList.add('text-selected');
        });
      });
    }

    function exportProducts() {
      saveCurrentProduct();
      const exportData = products.map((p) => ({
        id: p.id || null,
        sku: p.sku || null,
        designation: p.designation || null,
        title: p._captured?.title || null,
        description: p._captured?.description || null,
        selections: p._captured?.selections || [],
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

    // Hover & selection of text/images
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
        const txt = getTextContent(el);
        const added = toggleClass(el, 'text-selected');
        updateField(focusedInput, txt, !added);
        showFeedback(`Texte ${added ? 'ajouté' : 'retiré'}`);
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

    // Init
    updateForm();
    showFeedback('Sélecteur de contenu activé !');
    return true;
  } catch (e) {
    console.error('Erreur dans productContentSelector:', e);
    return false;
  }
})(/*PLACEHOLDER_PRODUCTS*/);
