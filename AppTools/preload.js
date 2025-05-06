// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Exposer des API sécurisées au processus de rendu
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
  onDescriptionEnhancementStart: (callback) => {
    ipcRenderer.on('description-enhancement-start', (_, data) => callback(data));
  },
  onDescriptionEnhanced: (callback) => {
    ipcRenderer.on('description-enhanced', (_, data) => callback(data));
  },
  discoverApiServer: () => ipcRenderer.invoke('discover-api-server'),
  webServer: {
    getMdnsServices: () => ipcRenderer.invoke('get-mdns-services'),
  },
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  onUpdateMessage: (callback) => {
    ipcRenderer.on('update-message', (event, data) => callback(data));
    return () => ipcRenderer.removeListener('update-message', callback);
  },
  getWebSocketSupport: () => ({ supported: true }),
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded - Preload script executed');
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
