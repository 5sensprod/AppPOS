// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Configuration standard des APIs exposées à la fenêtre
contextBridge.exposeInMainWorld('electronAPI', {
  openWebCaptureWindow: (url, options) => ipcRenderer.send('open-web-capture-window', url, options),

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
