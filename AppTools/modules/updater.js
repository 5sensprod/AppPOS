// modules/updater.js

// Initialiser l'autoUpdater
function initUpdater(autoUpdater) {
  // Options de configuration pour autoUpdater
  autoUpdater.allowPrerelease = false;
  autoUpdater.autoDownload = false;

  console.log('AutoUpdater initialisé avec les options de base');
  return autoUpdater;
}

// Configuration des événements de mise à jour
function setupUpdateEvents(autoUpdater, mainWindow, dialog) {
  // Vérifier si mainWindow est défini
  if (!mainWindow) {
    console.error("setupUpdateEvents: mainWindow n'est pas défini!");
    return;
  }

  // Suppression des anciens écouteurs pour éviter les doublons
  autoUpdater.removeAllListeners('checking-for-update');
  autoUpdater.removeAllListeners('update-available');
  autoUpdater.removeAllListeners('update-not-available');
  autoUpdater.removeAllListeners('error');
  autoUpdater.removeAllListeners('download-progress');
  autoUpdater.removeAllListeners('update-downloaded');

  autoUpdater.on('checking-for-update', () => {
    console.log('Vérification des mises à jour...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-message', {
        message: 'Vérification des mises à jour...',
      });
    }
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Mise à jour disponible:', info);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-message', {
        message: 'Mise à jour disponible',
        info: info,
      });

      dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          title: 'Mise à jour disponible',
          message: `Une nouvelle version (${info.version}) est disponible. Voulez-vous la télécharger maintenant ?`,
          buttons: ['Oui', 'Non'],
          defaultId: 0,
        })
        .then((result) => {
          if (result.response === 0) {
            autoUpdater.downloadUpdate();
          }
        })
        .catch((err) => {
          console.error("Erreur lors de l'affichage de la boîte de dialogue:", err);
        });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Aucune mise à jour disponible:', info);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-message', {
        message: 'Aucune mise à jour disponible',
        info: info,
      });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('Erreur lors de la mise à jour:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-message', {
        message: 'Erreur lors de la mise à jour',
        error: err.toString(),
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`Téléchargement: ${progressObj.percent}%`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-message', {
        message: 'Téléchargement en cours',
        progress: progressObj,
      });
      mainWindow.setProgressBar(progressObj.percent / 100);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Mise à jour téléchargée:', info);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-message', {
        message: 'Mise à jour téléchargée',
        info: info,
      });
      mainWindow.setProgressBar(-1);

      dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          title: 'Mise à jour prête',
          message: "La mise à jour a été téléchargée. L'application redémarrera pour l'installer.",
          buttons: ['Redémarrer maintenant', 'Plus tard'],
          defaultId: 0,
        })
        .then((result) => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall(false, true);
          }
        })
        .catch((err) => {
          console.error("Erreur lors de l'affichage de la boîte de dialogue:", err);
        });
    }
  });

  console.log('Événements de mise à jour configurés avec succès');
}

// Vérifier les mises à jour
function checkForUpdates(autoUpdater) {
  console.log('Vérification des mises à jour manuellement...');
  try {
    autoUpdater.checkForUpdates();
    return true;
  } catch (error) {
    console.error('Erreur lors de la vérification des mises à jour:', error);
    return false;
  }
}

module.exports = {
  initUpdater,
  setupUpdateEvents,
  checkForUpdates,
};
