// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Variables globales pour stocker les URLs
global.cachedNetworkUrls = [];

// Exposer des API sécurisées au processus de rendu
contextBridge.exposeInMainWorld('electronAPI', {
  // Fonction pour vérifier les mises à jour
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),

  // Écouter les messages de mise à jour
  onUpdateMessage: (callback) => {
    ipcRenderer.on('update-message', (event, data) => callback(data));
    return () => ipcRenderer.removeListener('update-message', callback);
  },

  // Ajout des fonctions pour le serveur web
  webServer: {
    onServerUrls: (callback) => {
      console.log('Enregistrement du listener pour web-server-urls');
      ipcRenderer.on('web-server-urls', (event, urls) => {
        console.log('web-server-urls reçu:', urls);
        // Stocker les URLs dans la variable globale
        global.cachedNetworkUrls = urls;
        callback(urls);
      });
      return () => ipcRenderer.removeListener('web-server-urls', callback);
    },

    // Fonction pour demander les URLs
    requestNetworkUrls: () => {
      console.log('Demande des URLs réseau');
      ipcRenderer.send('request-network-urls');
    },

    // Nouvelle fonction pour obtenir les URLs directement (synchrone)
    getUrls: () => {
      console.log('Récupération des URLs réseau depuis le cache:', global.cachedNetworkUrls);
      return global.cachedNetworkUrls;
    },
  },
});

// Écouter pour les URLs du serveur web et les mettre en cache
ipcRenderer.on('web-server-urls', (_, urls) => {
  console.log('URLs mises en cache:', urls);
  global.cachedNetworkUrls = urls;
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded - Preload script executed');
});
