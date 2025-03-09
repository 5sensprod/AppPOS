// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Exposer des API sécurisées au processus de rendu
contextBridge.exposeInMainWorld('electronAPI', {
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
