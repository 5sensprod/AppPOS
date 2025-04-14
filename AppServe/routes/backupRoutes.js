// routes/backupRoutes.js
const express = require('express');
const router = express.Router();
const { performBackup } = require('../backup');
const { performImagesBackup } = require('../backup-images');
const ResponseHandler = require('../handlers/ResponseHandler');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

// Route pour déclencher une sauvegarde manuelle des bases de données
router.post('/run', async (req, res) => {
  try {
    console.log('Sauvegarde manuelle des bases de données demandée');
    await performBackup();
    return ResponseHandler.success(res, {
      message: 'Sauvegarde des bases de données effectuée avec succès',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde manuelle:', error);
    return ResponseHandler.error(res, error);
  }
});

// Route pour déclencher une sauvegarde manuelle des images
router.post('/images/run', async (req, res) => {
  try {
    console.log('Sauvegarde manuelle des images demandée');
    await performImagesBackup();
    return ResponseHandler.success(res, {
      message: 'Sauvegarde des images effectuée avec succès',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde manuelle des images:', error);
    return ResponseHandler.error(res, error);
  }
});

// Route pour déclencher une sauvegarde complète manuelle (BDD + images)
router.post('/complete/run', async (req, res) => {
  try {
    console.log('Sauvegarde complète manuelle demandée');

    // Sauvegarder les bases de données
    await performBackup();

    // Sauvegarder les images
    await performImagesBackup();

    return ResponseHandler.success(res, {
      message: 'Sauvegarde complète effectuée avec succès',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde complète manuelle:', error);
    return ResponseHandler.error(res, error);
  }
});

// Route pour obtenir l'état des sauvegardes
router.get('/status', async (req, res) => {
  try {
    const backupFolder = path.join(__dirname, '..', 'backups');
    let dbBackups = [];
    let imageBackups = [];

    // Vérifier si le dossier existe
    if (fs.existsSync(backupFolder)) {
      // Lire tous les fichiers de sauvegarde
      const fileList = fs.readdirSync(backupFolder);

      // Filtrer les fichiers de sauvegarde de base de données
      dbBackups = fileList
        .filter((file) => file.startsWith('appos_backup_') && file.endsWith('.zip'))
        .map((file) => {
          const filePath = path.join(backupFolder, file);
          const stats = fs.statSync(filePath);

          // Extraire la date du nom de fichier
          const dateMatch = file.match(/backup_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})\.zip/);
          let formattedDate = '';

          if (dateMatch && dateMatch[1]) {
            formattedDate = moment(dateMatch[1], 'YYYY-MM-DD_HH-mm').format('DD/MM/YYYY HH:mm');
          }

          return {
            filename: file,
            size: (stats.size / 1024 / 1024).toFixed(2) + ' Mo',
            created: formattedDate || stats.birthtime.toISOString(),
            path: filePath,
          };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));

      // Filtrer les fichiers de sauvegarde d'images
      imageBackups = fileList
        .filter((file) => file.startsWith('appos_images_backup_') && file.endsWith('.zip'))
        .map((file) => {
          const filePath = path.join(backupFolder, file);
          const stats = fs.statSync(filePath);

          // Extraire la date du nom de fichier
          const dateMatch = file.match(/backup_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})\.zip/);
          let formattedDate = '';

          if (dateMatch && dateMatch[1]) {
            formattedDate = moment(dateMatch[1], 'YYYY-MM-DD_HH-mm').format('DD/MM/YYYY HH:mm');
          }

          return {
            filename: file,
            size: (stats.size / 1024 / 1024).toFixed(2) + ' Mo',
            created: formattedDate || stats.birthtime.toISOString(),
            path: filePath,
          };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));
    }

    return ResponseHandler.success(res, {
      databases: {
        lastBackup: dbBackups.length > 0 ? dbBackups[0] : null,
        backupCount: dbBackups.length,
        backups: dbBackups,
      },
      images: {
        lastBackup: imageBackups.length > 0 ? imageBackups[0] : null,
        backupCount: imageBackups.length,
        backups: imageBackups,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du statut des sauvegardes:', error);
    return ResponseHandler.error(res, error);
  }
});

// Route pour vérifier la connexion SFTP
router.get('/check-connection', async (req, res) => {
  try {
    const Client = require('ssh2-sftp-client');
    const sftp = new Client();

    const sftpConfig = {
      host: process.env.SFTP_HOST,
      port: parseInt(process.env.SFTP_PORT, 10) || 22,
      username: process.env.SFTP_USERNAME,
      password: process.env.SFTP_PASSWORD,
    };

    await sftp.connect(sftpConfig);
    console.log('Connexion SFTP réussie');

    // Vérifier l'existence du dossier de sauvegarde
    let backupFolderExists = false;
    try {
      backupFolderExists = await sftp.exists('/backups');
    } catch (error) {
      console.log("Le dossier /backups n'existe pas encore sur le serveur SFTP");
    }

    // Obtenir la liste des sauvegardes distantes si le dossier existe
    let remoteBackups = [];
    if (backupFolderExists) {
      const fileList = await sftp.list('/backups');
      remoteBackups = fileList
        .filter(
          (item) =>
            item.type === '-' && item.name.startsWith('appos_') && item.name.endsWith('.zip')
        )
        .map((item) => ({
          name: item.name,
          size: (item.size / 1024 / 1024).toFixed(2) + ' Mo',
          lastModified: new Date(item.modifyTime).toISOString(),
          type: item.name.includes('images') ? 'images' : 'database',
        }))
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    }

    await sftp.end();

    return ResponseHandler.success(res, {
      connection: 'success',
      host: sftpConfig.host,
      username: sftpConfig.username,
      backupFolderExists,
      remoteBackups,
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de la connexion SFTP:', error);
    return ResponseHandler.error(res, {
      connection: 'failed',
      message: error.message,
      error: error.toString(),
    });
  }
});

module.exports = router;
