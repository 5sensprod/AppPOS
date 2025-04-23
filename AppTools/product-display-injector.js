// File: AppTools/product-display-injector.js
const { ipcMain } = require('electron');

/**
 * Crée un script pour afficher la liste des produits dans la fenêtre de capture web
 */
function createProductDisplayScript() {
  return `
  // Script injecté pour afficher les produits sélectionnés
  (function() {
    // Extraire les données des produits de l'URL
    function extractProductsData() {
      const url = window.location.href;
      const appDataMatch = url.match(/#APP_PRODUCTS_DATA=([^&#]+)/);
      
      if (!appDataMatch || !appDataMatch[1]) return null;
      
      try {
        return JSON.parse(decodeURIComponent(appDataMatch[1]));
      } catch (err) {
        console.error('Erreur parsing produits:', err);
        return null;
      }
    }
    
    // Créer et injecter l'élément d'affichage
    function injectProductDisplay(products) {
      if (!products || products.length === 0) return;
      
      console.log("Produits trouvés:", products);
      
      const container = document.createElement('div');
      container.id = 'app-selected-products';
      container.style.cssText = 'position: fixed; top: 10px; right: 10px; background: white; ' +
        'border: 1px solid #ccc; border-radius: 5px; padding: 15px; z-index: 9999; ' +
        'width: 300px; max-height: 400px; overflow-y: auto; box-shadow: 0 0 10px rgba(0,0,0,0.2);';
      
      const title = document.createElement('h3');
      title.textContent = 'Produits sélectionnés (' + products.length + ')';
      title.style.cssText = 'margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #333;';
      container.appendChild(title);
      
      const list = document.createElement('ul');
      list.style.cssText = 'list-style: none; padding: 0; margin: 0;';
      
      products.forEach((product, index) => {
        const item = document.createElement('li');
        item.style.cssText = 'padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px;';
        if (index === products.length - 1) {
          item.style.borderBottom = 'none';
        }
        
        const designation = product.designation || 'Sans désignation';
        const sku = product.sku || 'Sans SKU';
        const id = product.id || '';
        
        item.innerHTML = '<strong>' + designation + '</strong><br>' + 
                         '<span style="color: #666;">SKU: ' + sku + '</span>' +
                         (id ? '<br><small style="color: #999;">ID: ' + id + '</small>' : '');
        list.appendChild(item);
      });
      
      container.appendChild(list);
      
      const closeButton = document.createElement('button');
      closeButton.textContent = '×';
      closeButton.style.cssText = 'position: absolute; top: 5px; right: 8px; background: none; ' +
        'border: none; font-size: 18px; cursor: pointer; color: #999;';
      closeButton.onclick = function() {
        document.body.removeChild(container);
      };
      container.appendChild(closeButton);
      
      document.body.appendChild(container);
    }
    
    // Exécuter au chargement
    function checkAndDisplayProducts() {
      const productsData = extractProductsData();
      if (productsData) {
        console.log("Données produits trouvées dans l'URL");
        injectProductDisplay(productsData);
      } else {
        console.warn("Aucune donnée produit trouvée dans l'URL");
      }
    }
    
    // Vérifier si le DOM est déjà chargé
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkAndDisplayProducts);
    } else {
      // DOM déjà chargé
      checkAndDisplayProducts();
    }
  })();
  `;
}

/**
 * Configure l'injection du script d'affichage des produits
 * @param {BrowserWindow} captureWindow - La fenêtre de capture web Electron
 */
function injectProductDisplayScript(captureWindow) {
  const script = createProductDisplayScript();
  captureWindow.webContents
    .executeJavaScript(script)
    .catch((err) => console.error('Erreur injection script:', err));
}

module.exports = { injectProductDisplayScript };
