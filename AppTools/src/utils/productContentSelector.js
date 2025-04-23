// src/utils/productContentSelector.js
/**
 * Génère un script de sélection de contenu adapté aux produits
 * @param {Array} products - Liste des produits
 * @returns {string} Script à injecter
 */
function generateProductContentSelector(products) {
  return `
      (function() {
        try {
          // Config
          const config = {
            selectors: {
              text: 'p,li,div,h1,h2,h3,h4,h5,h6',
              image: 'img'
            },
            enableImageSelection: true
          };
          
          // Données
          const products = ${JSON.stringify(products)};
          let currentProductIndex = 0;
          let focusedInput = null;
          
          // CSS
          const style = document.createElement('style');
          style.textContent = '.product-form{position:fixed;top:0;right:0;width:350px;height:100%;background:#fff;box-shadow:-5px 0 15px rgba(0,0,0,0.1);z-index:9999;padding:20px;overflow-y:auto;} .nav-row{display:flex;justify-content:space-between;margin-bottom:15px;padding-bottom:10px;border-bottom:1px solid #eee} .badge{padding:4px 8px;background:#e0e0e0;border-radius:4px;font-size:12px;margin-right:5px} .btn{padding:8px 15px;background:#4CAF50;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-right:5px;font-size:13px} .btn-small{padding:2px 5px;font-size:11px;float:right;margin:0} .btn-secondary{background:#9e9e9e} .btn:disabled{opacity:0.5;cursor:not-allowed} .input{width:100%;padding:8px;margin-bottom:10px;border:1px solid #ddd;border-radius:4px} .active-input{border:2px solid #4CAF50!important;background:rgba(76,175,80,0.05)!important} .text-highlight{background:rgba(255,255,0,0.2)!important;border-radius:3px;cursor:pointer} .image-highlight{outline:3px solid rgba(0,255,255,0.7)!important;cursor:pointer} .image-selected{outline:3px solid rgba(0,128,255,0.7)!important} .feedback{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:8px 16px;border-radius:4px;z-index:10000;opacity:0;transition:opacity .3s} .image-preview{max-width:80px;max-height:80px;margin:5px;border:1px solid #ddd}';
          document.head.appendChild(style);
          
          // Feedback
          const feedback = document.createElement('div');
          feedback.className = 'feedback';
          document.body.appendChild(feedback);
          
          function showFeedback(msg) {
            feedback.textContent = msg;
            feedback.style.opacity = '1';
            setTimeout(function() { feedback.style.opacity = '0'; }, 2000);
          }
          
          // Conteneur
          const container = document.createElement('div');
          container.className = 'product-form';
          document.body.appendChild(container);
          
          // Mise à jour formulaire
          function updateForm() {
            const product = products[currentProductIndex];
            
            container.innerHTML = '<div class="nav-row">' +
              '<div>' +
                '<h2 style="margin:0 0 10px">Capture de contenu</h2>' +
                '<div>' +
                  '<span class="badge">' + (currentProductIndex + 1) + ' / ' + products.length + '</span>' +
                  '<span class="badge">' + (product.sku || 'Sans SKU') + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            
            '<label>Produit actuel</label>' +
            '<input type="text" class="input" value="' + (product.designation || 'Sans désignation') + '" readonly>' +
            
            '<label>Description <button type="button" id="focus-description" class="btn btn-small btn-secondary">Sélectionner</button></label>' +
            '<textarea id="description" class="input" rows="6" placeholder="Description du produit"></textarea>' +
            
            '<label>Spécifications <button type="button" id="focus-specifications" class="btn btn-small btn-secondary">Sélectionner</button></label>' +
            '<textarea id="specifications" class="input" rows="6" placeholder="Caractéristiques techniques"></textarea>' +
            
            '<label>Images <span id="images-counter">(0)</span></label>' +
            '<div id="image-container" style="display:flex;flex-wrap:wrap;margin:10px 0"></div>' +
            
            '<div style="display:flex;margin-top:15px;justify-content:space-between">' +
              '<div>' +
                '<button id="prev-btn" class="btn" ' + (currentProductIndex === 0 ? 'disabled' : '') + '>◀ Précédent</button>' +
                '<button id="next-btn" class="btn" ' + (currentProductIndex === products.length - 1 ? 'disabled' : '') + '>Suivant ▶</button>' +
              '</div>' +
              '<button id="export-btn" class="btn">Exporter</button>' +
            '</div>';
            
            // FIX IMPORTANT: Attacher les événements après avoir ajouté le contenu au DOM
            setTimeout(function() {
              // Événements des boutons de focus
              document.getElementById('focus-description').addEventListener('click', function() {
                focusedInput = document.getElementById('description');
                document.querySelectorAll('.active-input').forEach(function(el) { 
                  el.classList.remove('active-input'); 
                });
                focusedInput.classList.add('active-input');
                showFeedback('Sélectionnez du texte pour la description');
              });
              
              document.getElementById('focus-specifications').addEventListener('click', function() {
                focusedInput = document.getElementById('specifications');
                document.querySelectorAll('.active-input').forEach(function(el) { 
                  el.classList.remove('active-input'); 
                });
                focusedInput.classList.add('active-input');
                showFeedback('Sélectionnez du texte pour les spécifications');
              });
              
              // Boutons de navigation
              document.getElementById('prev-btn').addEventListener('click', function() {
                if (currentProductIndex > 0) {
                  saveCurrentProduct();
                  currentProductIndex--;
                  updateForm();
                }
              });
              
              document.getElementById('next-btn').addEventListener('click', function() {
                if (currentProductIndex < products.length - 1) {
                  saveCurrentProduct();
                  currentProductIndex++;
                  updateForm();
                }
              });
              
              document.getElementById('export-btn').addEventListener('click', exportProducts);
              
              // Charger données existantes
              loadProductData(product);
            }, 100);
          }
          
          // Sauvegarder produit
          function saveCurrentProduct() {
            const product = products[currentProductIndex];
            if (!product._captured) product._captured = {};
            
            product._captured.description = document.getElementById('description').value;
            product._captured.specifications = document.getElementById('specifications').value;
            
            // Sauvegarder les images
            const imgContainer = document.getElementById('image-container');
            if (imgContainer) {
              product._captured.images = Array.from(imgContainer.children).map(function(img) {
                return { src: img.src, alt: img.alt || '' };
              });
            }
          }
          
          // Ajouter miniature d'image
          function addImageThumbnail(src, alt) {
            const imgContainer = document.getElementById('image-container');
            
            const img = document.createElement('img');
            img.src = src;
            img.alt = alt || '';
            img.className = 'image-preview';
            img.addEventListener('click', function() {
              this.remove();
              updateImagesCounter();
              document.querySelectorAll('img').forEach(function(i) {
                if (i.src === src) i.classList.remove('image-selected');
              });
              showFeedback('Image retirée');
            });
            
            imgContainer.appendChild(img);
            updateImagesCounter();
          }
          
          // Mettre à jour compteur images
          function updateImagesCounter() {
            const count = document.getElementById('image-container').children.length;
            document.getElementById('images-counter').textContent = '(' + count + ')';
          }
          
          // Charger données
          function loadProductData(product) {
            if (product._captured) {
              document.getElementById('description').value = product._captured.description || '';
              document.getElementById('specifications').value = product._captured.specifications || '';
              
              const imgContainer = document.getElementById('image-container');
              imgContainer.innerHTML = '';
              
              if (product._captured.images && product._captured.images.length) {
                product._captured.images.forEach(function(img) {
                  addImageThumbnail(img.src, img.alt);
                  
                  // Marquer les images déjà sélectionnées
                  document.querySelectorAll('img').forEach(function(i) {
                    if (i.src === img.src && !i.classList.contains('image-preview')) {
                      i.classList.add('image-selected');
                    }
                  });
                });
              }
              
              updateImagesCounter();
            }
          }
          
          // Exportation
          function exportProducts() {
            saveCurrentProduct();
            
            const exportData = products.map(function(p) {
              return {
                id: p.id || null,
                sku: p.sku || null,
                designation: p.designation || null,
                description: p._captured ? p._captured.description || null : null,
                specifications: p._captured ? p._captured.specifications || null : null,
                images: p._captured && p._captured.images ? p._captured.images : []
              };
            });
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
            const filename = 'produits_captures_' + new Date().toISOString().slice(0, 10) + '.json';
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            
            showFeedback('Produits exportés !');
          }
          
          // Sélection de texte et images (capture des événements)
          document.addEventListener('mouseover', function(e) {
            const el = e.target;
            if (el.matches(config.selectors.text)) {
              el.classList.add('text-highlight');
            } else if (config.enableImageSelection && el.matches(config.selectors.image) && !el.closest('.product-form')) {
              el.classList.add('image-highlight');
            }
          });
          
          document.addEventListener('mouseout', function(e) {
            const el = e.target;
            if (el.matches(config.selectors.text)) {
              el.classList.remove('text-highlight');
            } else if (config.enableImageSelection && el.matches(config.selectors.image) && !el.classList.contains('image-selected')) {
              el.classList.remove('image-highlight');
            }
          });
          
          // CHANGEMENT IMPORTANT : utiliser mousedown au lieu de click
          document.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return; // Ignore les clicks autres que le bouton gauche
            
            const el = e.target;
            
            // Ignorer les clics sur le formulaire
            if (el.closest('.product-form')) return;
            
            // Texte
            if (el.matches(config.selectors.text)) {
              e.preventDefault();
              e.stopPropagation();
              
              if (!focusedInput) {
                showFeedback('Sélectionnez d\\'abord un champ !');
                return;
              }
              
              const text = el.textContent.trim();
              const currentValue = focusedInput.value.trim();
              focusedInput.value = currentValue ? currentValue + '\\n\\n' + text : text;
              showFeedback('Texte ajouté');
            }
            // Image
            else if (config.enableImageSelection && el.matches(config.selectors.image) && !el.closest('.product-form')) {
              e.preventDefault();
              e.stopPropagation();
              
              const isSelected = el.classList.toggle('image-selected');
              
              if (isSelected) {
                addImageThumbnail(el.src, el.alt);
                showFeedback('Image ajoutée');
              } else {
                // Retirer l'image
                const imgContainer = document.getElementById('image-container');
                Array.from(imgContainer.children).forEach(function(img) {
                  if (img.src === el.src) {
                    img.remove();
                  }
                });
                updateImagesCounter();
                showFeedback('Image retirée');
              }
            }
          });
          
          // Initialiser
          updateForm();
          showFeedback('Sélecteur de contenu activé !');
          return true;
        } catch(e) {
          console.error("Erreur:", e);
          return false;
        }
      })();
    `;
}

/**
 * Injecte le sélecteur de contenu produit
 * @param {Object} webContents - L'objet webContents d'Electron
 * @param {Array} products - Les produits à traiter
 * @returns {Promise} Une promesse résolue après l'injection
 */
async function injectProductContentSelector(webContents, products) {
  try {
    // Vérifiez que products est bien un tableau
    if (!Array.isArray(products)) {
      console.error('Les produits doivent être un tableau');
      products = [];
    }

    const script = generateProductContentSelector(products);
    console.log('Script généré, longueur:', script.length);

    // Ajout d'un script de débogage
    await webContents.executeJavaScript('console.log("Test d\'injection avant script principal");');

    const result = await webContents.executeJavaScript(script);
    console.log('Script exécuté avec succès');
    return result;
  } catch (err) {
    console.error("Erreur d'injection du sélecteur de contenu:", err);
    return false;
  }
}

module.exports = {
  generateProductContentSelector,
  injectProductContentSelector,
};
