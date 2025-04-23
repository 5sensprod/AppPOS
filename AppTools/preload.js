const { contextBridge, ipcRenderer } = require('electron');

// Exposer des API sécurisées au processus de rendu
contextBridge.exposeInMainWorld('electronAPI', {
  // Découverte du serveur API via Bonjour
  discoverApiServer: () => ipcRenderer.invoke('discover-api-server'),

  // Découverte mDNS des services
  webServer: {
    getMdnsServices: () => ipcRenderer.invoke('get-mdns-services'),
  },

  // Vérification manuelle des mises à jour
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),

  // Écouteur pour les messages de mise à jour
  onUpdateMessage: (callback) => {
    ipcRenderer.on('update-message', (event, data) => callback(data));
    return () => ipcRenderer.removeListener('update-message', callback);
  },

  // Fonctionnalité WebSocket support
  getWebSocketSupport: () => ({ supported: true }),

  // 🔥 Nouvelle fonctionnalité : ouvrir une fenêtre WebView externe (web capture)
  openWebCaptureWindow: (url, options = {}) =>
    ipcRenderer.send('open-web-capture-window', url, options),
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Preload script exécuté – APIs exposées à window.electronAPI');
});
