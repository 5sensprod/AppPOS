// AppTools/modules/webCaptureHandler.js

const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const { injectProductContentSelector } = require('../src/utils/productContentSelector');

function setupWebCaptureListener(ipcMainInstance) {
  ipcMainInstance.on('open-web-capture-window', (event, url, options = {}) => {
    if (!url) return;
    console.log('Web capture options:', options);

    // 1) Crée la fenêtre qui va naviguer normalement
    const captureWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: true,
        webSecurity: false,
      },
    });

    // Pour déboguer
    captureWindow.webContents.openDevTools();

    // 2) Extrait la liste des produits depuis l'URL
    const match = url.match(/#APP_PRODUCTS_DATA=([^&]+)/);
    let selectedProducts = [];
    if (match && match[1]) {
      try {
        selectedProducts = JSON.parse(decodeURIComponent(match[1]));
        console.log('Produits analysés correctement :', selectedProducts.length);
      } catch (err) {
        console.error('Erreur parsing produits :', err);
      }
    } else {
      console.warn("Aucune donnée de produit trouvée dans l'URL");
    }

    const wc = captureWindow.webContents;

    // 3) À CHAQUE chargement complet, on réinjecte l'UI avec l'état en mémoire
    wc.on('did-finish-load', async () => {
      try {
        console.log(
          'Injection du sélecteur de contenu (mode:',
          options.mode || 'content-capture',
          ')'
        );
        await injectProductContentSelector(wc, selectedProducts);
      } catch (error) {
        console.error('Erreur lors de l’injection du sélecteur :', error);
      }
    });

    // 4) Charge l’URL (la première injection se fera à did-finish-load)
    captureWindow.loadURL(url);
  });
}

module.exports = { setupWebCaptureListener };
