// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Configuration standard des APIs exposées à la fenêtre
contextBridge.exposeInMainWorld('electronAPI', {
  setAuthToken: (token) => {
    console.log('[preload] → set-auth-token', token);
    ipcRenderer.send('set-auth-token', token);
  },

  openWebCaptureWindow: (url, options = {}) =>
    ipcRenderer.send('open-web-capture-window', url, options),

  updateProductName: (productId, name) => {
    ipcRenderer.send('update-product-name', { productId, name });
  },

  updateProductDescription: (productId, description) => {
    console.log('[preload] envoi update-product-description', productId, description);
    ipcRenderer.send('update-product-description', { productId, description });
  },

  updateProductImages: (productId, images) => {
    ipcRenderer.send('update-product-images', { productId, images });
  },

  onCapturedProductUpdate: (callback) =>
    ipcRenderer.on('captured-product-update', (_, data) => callback(data)),

  onUpdateMessage: (callback) => ipcRenderer.on('update-message', (_, data) => callback(data)),
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
