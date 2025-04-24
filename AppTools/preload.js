// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Configuration standard des APIs exposées à la fenêtre
contextBridge.exposeInMainWorld('electronAPI', {
  // Vos fonctions API existantes...
  openWebCaptureWindow: (url, options) => ipcRenderer.send('open-web-capture-window', url, options),

  // NOUVELLES FONCTIONS POUR LA GESTION DES PRODUITS CAPTURÉS

  // Envoyer des données de produit capturées au processus principal
  sendCapturedProductData: (data) => ipcRenderer.send('captured-product-data', data),

  onUpdateMessage: (callback) => ipcRenderer.on('update-message', (_, data) => callback(data)),

  // Écouter les mises à jour de produits capturés
  onCapturedProductUpdate: (callback) =>
    ipcRenderer.on('captured-product-update', (_, data) => callback(data)),

  // Demander l'état actuel des produits capturés
  requestCapturedProductsState: () => ipcRenderer.send('request-captured-products-state'),

  // Exporter les produits capturés
  exportCapturedProducts: (products) => ipcRenderer.send('export-captured-products', products),
});

// Configurer la communication entre la WebView et l'application principale
window.addEventListener('message', (event) => {
  // Vérifier que le message vient du sélecteur de contenu
  if (event.data && event.data.source === 'product-content-selector') {
    // Relayer le message au processus principal
    ipcRenderer.send('product-content-selector-message', event.data);
  }
});

// Écouter les messages du processus principal pour les relayer à la WebView
ipcRenderer.on('main-to-webview', (_, data) => {
  // Relayer le message à la WebView
  window.postMessage(
    {
      source: 'main-app',
      ...data,
    },
    '*'
  );
});
