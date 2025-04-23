// File: modules/webCaptureHandler.js
const { ipcMain, BrowserWindow } = require('electron');
const { injectProductDisplay } = require('../src/utils/productDisplayInjector');
const { injectProductContentSelector } = require('../src/utils/productContentSelector');

function setupWebCaptureListener(ipcMainInstance) {
  ipcMainInstance.on('open-web-capture-window', (event, url, options = {}) => {
    if (!url) return;
    console.log('Web capture options:', options);

    const captureWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // Ajoutez ces lignes pour permettre le débogage
        devTools: true,
        webSecurity: false, // Temporairement pour le développement
      },
    });

    // Ouvrir les devtools pour déboguer
    captureWindow.webContents.openDevTools();

    // Extraire les produits
    const match = url.match(/#APP_PRODUCTS_DATA=([^&]+)/);
    let selectedProducts = [];

    if (match && match[1]) {
      try {
        selectedProducts = JSON.parse(decodeURIComponent(match[1]));
        console.log('Produits analysés correctement:', selectedProducts.length);
      } catch (err) {
        console.error('Erreur parsing produits:', err);
      }
    } else {
      console.warn("Aucune donnée de produit trouvée dans l'URL");
    }

    captureWindow.loadURL(url);

    captureWindow.webContents.on('did-finish-load', async () => {
      try {
        console.log('Mode de capture:', options.mode || 'content-capture (default)');
        // Forcer le mode content-capture si non défini
        await injectProductContentSelector(captureWindow.webContents, selectedProducts);
      } catch (error) {
        console.error("Erreur lors de l'injection:", error);
      }
    });
  });
}

module.exports = { setupWebCaptureListener };
