// File: AppTools/modules/webCaptureHandler.js
const { ipcMain, BrowserWindow } = require('electron');

function setupWebCaptureListener(ipcMainInstance) {
  ipcMain.on('open-web-capture-window', (event, url) => {
    if (!url) return;

    const captureWindow = new BrowserWindow({
      width: 1000,
      height: 800,
      title: 'Web Capture Tool',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: true,
      },
    });

    const match = url.match(/#APP_PRODUCTS_DATA=([^&]+)/);
    let selectedProducts = [];

    if (match && match[1]) {
      try {
        selectedProducts = JSON.parse(decodeURIComponent(match[1]));
      } catch (err) {
        console.error('Erreur parsing produits:', err);
      }
    }

    captureWindow.loadURL(url);

    captureWindow.webContents.on('did-finish-load', () => {
      const script = `
        (function() {
          const products = ${JSON.stringify(selectedProducts)};
          
          if (!products || products.length === 0) {
            console.log("Aucun produit à afficher");
            return;
          }

          console.log("Affichage de", products.length, "produits");
          
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
            item.style.cssText = 'padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; cursor: pointer;';
            if (index === products.length - 1) {
              item.style.borderBottom = 'none';
            }
            
            const designation = product.designation || 'Sans désignation';
            const sku = product.sku || 'Sans SKU';
            
            item.innerHTML = '<strong>' + designation + '</strong><br>' + 
                           '<span style="color: #666;">SKU: ' + sku + '</span>';
            
            // Ajouter un effet de survol
            item.addEventListener('mouseover', function() {
              this.style.backgroundColor = '#f0f0f0';
            });
            
            item.addEventListener('mouseout', function() {
              this.style.backgroundColor = '';
            });
            
            // Ajouter l'action de clic pour relancer la recherche
            item.addEventListener('click', function() {
              const searchTerm = designation || sku;
              const baseUrl = window.location.href.split('#')[0].split('?')[0];
              const newUrl = baseUrl + '?q=' + encodeURIComponent(searchTerm);
              window.location.href = newUrl;
            });
            
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
        })();
      `;

      captureWindow.webContents
        .executeJavaScript(script)
        .catch((err) => console.error("Erreur d'injection:", err));
    });
  });
}

module.exports = { setupWebCaptureListener };
