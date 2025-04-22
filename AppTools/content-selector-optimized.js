// ==UserScript==
// @name         Web Content Selector et Form Manager Optimisé
// @version      2.3
// @description  Sélectionne et copie du contenu web avec gestion de formulaire automatique (version optimisée, nom de fichier dynamique)
// @author       You
// ==/UserScript==

(function () {
  'use strict';

  // --- Configuration ---
  const config = {
    selectors: {
      text: 'li,div,p,h1,h2,h3,h4,h5,h6,ul,ol,dl,blockquote,pre,table,article,section',
      image: 'img',
    },
    feedbackTimeout: 2000,
    formOnRight: true,
    enableImageSelection: true,
    enableForm: true,
    formFields: [
      { id: 'title', label: 'Titre', placeholder: 'Titre' },
      {
        id: 'description',
        label: 'Description',
        placeholder: 'Description',
        isTextarea: true,
        rows: 10,
      },
      {
        id: 'imageLinks',
        label: 'Liens des images',
        placeholder: 'Liens des images sélectionnées',
        isTextarea: true,
        rows: 5,
        isImageField: true,
      },
      {
        id: 'source',
        label: 'Source',
        placeholder: 'URL source',
        defaultValue: window.location.href,
      },
    ],
  };

  // --- Inject CSS ---
  const css = `
      .text-block-highlight{background:rgba(255,255,0,0.2)!important;border-radius:3px;cursor:pointer}
      .text-block-copied{background:rgba(255,105,180,0.2)!important;border-radius:3px}
      .image-highlight{outline:3px solid rgba(0,255,255,0.7)!important;cursor:pointer;filter:brightness(1.1)}
      .image-copied{outline:3px solid rgba(0,128,255,0.7)!important}
      .copy-feedback{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:8px 16px;border-radius:4px;z-index:10000;opacity:0;transition:opacity .3s}
      #content-form-container{position:fixed;top:0;${config.formOnRight ? 'right' : 'left'}:0;width:300px;height:100%;background:#fff;box-shadow:${config.formOnRight ? '-5px' : '5px'} 0 15px rgba(0,0,0,0.1);z-index:9999;overflow-y:auto;transform:translateX(${config.formOnRight ? '100%' : '-100%'});transition:transform .3s;padding:20px}
      #content-form-container.visible{transform:translateX(0)}
      #content-form-container h2{margin:0 0 20px;color:#333;border-bottom:2px solid #eee;padding-bottom:10px}
      #content-form-container label{display:block;margin-bottom:5px;font-weight:bold;color:#555}
      #content-form-container input,#content-form-container textarea{width:100%;padding:8px;margin-bottom:15px;border:1px solid #ddd;border-radius:4px;resize:vertical}
      #content-form-container button{padding:8px 15px;background:#4CAF50;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-right:5px}
      #content-form-container button.secondary{background:#9e9e9e}
      #content-form-container button.secondary:hover{background:#7d7d7d}
      .active-input{border:2px solid #4CAF50!important;background:rgba(76,175,80,0.05)!important;box-shadow:0 0 5px rgba(76,175,80,0.3)!important}
      .image-thumbnail-wrapper{position:relative;width:80px;height:80px;overflow:hidden;border:1px solid #ccc;border-radius:4px;margin:0 5px 10px 0}
      .image-thumbnail-wrapper img{width:100%;height:100%;object-fit:cover}
      .thumbnail-remove{position:absolute;top:2px;right:2px;width:20px;height:20px;background:rgba(255,0,0,0.7);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:14px;line-height:20px;text-align:center}
      #image-thumbnails-container{display:flex;flex-wrap:wrap;margin-bottom:20px}
    `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // --- Feedback Element ---
  const feedback = document.createElement('div');
  feedback.className = 'copy-feedback';
  document.body.appendChild(feedback);
  function showFeedback(msg) {
    feedback.textContent = msg;
    feedback.style.opacity = '1';
    setTimeout(() => (feedback.style.opacity = '0'), config.feedbackTimeout);
  }

  // --- Create Form UI ---
  let focusedInput = null;
  if (config.enableForm) {
    const container = document.createElement('div');
    container.id = 'content-form-container';
    container.className = 'visible';
    container.innerHTML = `
        <h2>Contenu Sélectionné</h2>
        <form id="content-form">
          ${config.formFields
            .map(
              (f) => `
            <label for="${f.id}">${f.label}</label>
            ${
              f.isTextarea
                ? `<textarea id="${f.id}" rows="${f.rows}" placeholder="${f.placeholder}">${f.defaultValue || ''}</textarea>`
                : `<input id="${f.id}" type="text" placeholder="${f.placeholder}" value="${f.defaultValue || ''}">`
            }
          `
            )
            .join('')}
          <div>
            <button type="button" id="save">Enregistrer</button>
            <button type="button" id="clear" class="secondary">Effacer</button>
          </div>
        </form>
      `;
    document.body.appendChild(container);

    // Track focus for active-input styling
    container.addEventListener('focusin', (e) => {
      if (e.target.matches('input,textarea')) {
        focusedInput = e.target;
        focusedInput.classList.add('active-input');
      }
    });
    container.addEventListener('focusout', (e) => {
      if (e.target === focusedInput) {
        focusedInput.classList.remove('active-input');
        focusedInput = null;
      }
    });

    // Save / Clear buttons
    document.getElementById('save').addEventListener('click', exportFormData);
    document.getElementById('clear').addEventListener('click', clearForm);
  }

  // --- Helpers ---
  function getTextContent(el) {
    if (el.tagName === 'LI') return el.textContent.trim();
    if (['UL', 'OL'].includes(el.tagName)) {
      return Array.from(el.querySelectorAll('li'))
        .map((li) => '• ' + li.textContent.trim())
        .join('\n');
    }
    return el.textContent.trim();
  }

  function toggleClass(el, cls) {
    el.classList.toggle(cls);
    return el.classList.contains(cls);
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

  // --- Image Links Management ---
  function updateImageLinks(imgEl, srcToRemove) {
    const field = document.getElementById('imageLinks');
    if (!field) return;
    let thumbnails = document.getElementById('image-thumbnails-container');
    if (!thumbnails) {
      thumbnails = document.createElement('div');
      thumbnails.id = 'image-thumbnails-container';
      field.parentNode.insertBefore(thumbnails, field.nextSibling);
    }
    if (imgEl) {
      const src = imgEl.src;
      if (!field.value.includes(src)) {
        const line = `${imgEl.alt || 'Sans description'}: ${src}`;
        field.value = field.value.trim() ? field.value + '\n' + line : line;
      }
      if (!Array.from(thumbnails.querySelectorAll('img')).some((i) => i.dataset.src === src)) {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-thumbnail-wrapper';
        const thumb = document.createElement('img');
        thumb.src = src;
        thumb.dataset.src = src;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'thumbnail-remove';
        btn.textContent = '×';
        btn.addEventListener('click', () => {
          wrapper.remove();
          updateImageLinks(null, src);
          document
            .querySelectorAll(`img[src="${src}"]`)
            .forEach((i) => i.classList.remove('image-copied'));
          showFeedback('Image retirée');
        });
        wrapper.append(thumb, btn);
        thumbnails.appendChild(wrapper);
      }
    } else if (srcToRemove) {
      field.value = field.value
        .split('\n')
        .filter((l) => !l.includes(srcToRemove))
        .join('\n');
      thumbnails.querySelectorAll('img').forEach((i) => {
        if (i.dataset.src === srcToRemove) i.parentNode.remove();
      });
    }
    thumbnails.style.display = thumbnails.children.length ? 'flex' : 'none';
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // --- Event Delegation pour hover & click ---
  document.body.addEventListener('mouseover', (e) => {
    const el = e.target;
    if (el.matches(config.selectors.text)) el.classList.add('text-block-highlight');
    else if (config.enableImageSelection && el.matches(config.selectors.image))
      el.classList.add('image-highlight');
  });
  document.body.addEventListener('mouseout', (e) => {
    const el = e.target;
    if (el.matches(config.selectors.text)) el.classList.remove('text-block-highlight');
    else if (
      config.enableImageSelection &&
      el.matches(config.selectors.image) &&
      !el.classList.contains('image-copied')
    )
      el.classList.remove('image-highlight');
  });
  document.body.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const el = e.target;
    if (
      el.matches(config.selectors.text) ||
      (config.enableImageSelection && el.matches(config.selectors.image))
    ) {
      e.preventDefault();
      e.stopPropagation();
      if (!focusedInput) {
        showFeedback('Sélectionnez d’abord un champ du formulaire !');
        return;
      }
      if (el.matches(config.selectors.text)) {
        const txt = getTextContent(el);
        const added = toggleClass(el, 'text-block-copied');
        updateField(focusedInput, txt, !added);
        showFeedback(`Texte ${added ? 'ajouté' : 'retiré'} au champ ${focusedInput.id}`);
      } else {
        const added = toggleClass(el, 'image-copied');
        if (added) {
          updateImageLinks(el);
          showFeedback('Image ajoutée');
        } else {
          updateImageLinks(null, el.src);
          showFeedback('Image retirée');
        }
      }
    }
  });

  // --- Export (JSON) & Clear Form ---
  function exportFormData() {
    // Préparation des données
    const data = {};
    config.formFields.forEach((f) => {
      data[f.id] = document.getElementById(f.id)?.value || '';
    });
    data.images = Array.from(document.querySelectorAll('#image-thumbnails-container img')).map(
      (i) => ({
        src: i.dataset.src,
        alt: i.alt || '',
        width: i.naturalWidth,
        height: i.naturalHeight,
      })
    );

    // Conversion en JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    // Génération du nom de fichier depuis le titre
    let title = document.getElementById('title')?.value.trim();
    // Nettoyage des caractères invalides et espaces
    title = title
      ? title.replace(/[\\\/:*?"<>|]+/g, '').replace(/\s+/g, '_')
      : new Date().toISOString().slice(0, 10);
    const filename = `${title}.json`;

    // Téléchargement
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    showFeedback('Données enregistrées !');
  }

  function clearForm() {
    config.formFields.forEach((f) => {
      const el = document.getElementById(f.id);
      if (el) el.value = f.defaultValue || '';
    });
    const thumbs = document.getElementById('image-thumbnails-container');
    if (thumbs) {
      thumbs.innerHTML = '';
      thumbs.style.display = 'none';
    }
    document.querySelectorAll('.text-block-copied, .image-copied').forEach((el) => {
      el.classList.remove('text-block-copied', 'image-copied');
    });
    showFeedback('Formulaire effacé !');
  }

  // --- Init ---
  showFeedback('Web Content Selector activé !');
})();
