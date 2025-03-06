// modules/updater.js

// Configuration des événements de mise à jour
function setupUpdateEvents(autoUpdater, mainWindow, dialog) {
  autoUpdater.on('checking-for-update', () => {
    console.log('Vérification des mises à jour...');
    if (mainWindow) {
      mainWindow.webContents.send('update-message', {
        message: 'Vérification des mises à jour...',
      });
    }
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Mise à jour disponible:', info);
    if (mainWindow) {
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
        });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Aucune mise à jour disponible:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-message', {
        message: 'Aucune mise à jour disponible',
        info: info,
      });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('Erreur lors de la mise à jour:', err);
    if (mainWindow) {
      mainWindow.webContents.send('update-message', {
        message: 'Erreur lors de la mise à jour',
        error: err.toString(),
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`Téléchargement: ${progressObj.percent}%`);
    if (mainWindow) {
      mainWindow.webContents.send('update-message', {
        message: 'Téléchargement en cours',
        progress: progressObj,
      });
      mainWindow.setProgressBar(progressObj.percent / 100);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Mise à jour téléchargée:', info);
    if (mainWindow) {
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
        });
    }
  });
}

module.exports = {
  setupUpdateEvents,
};
