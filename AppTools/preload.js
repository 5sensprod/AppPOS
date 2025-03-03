// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Exposer des API sécurisées au processus de rendu
contextBridge.exposeInMainWorld('electronAPI', {
  // Fonction pour vérifier les mises à jour
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),

  // Écouter les messages de mise à jour
  onUpdateMessage: (callback) => {
    ipcRenderer.on('update-message', (event, data) => callback(data));
    return () => ipcRenderer.removeListener('update-message', callback);
  },
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded - Preload script executed');
});
