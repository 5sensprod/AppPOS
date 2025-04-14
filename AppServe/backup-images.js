// backup-images.js
// Script de sauvegarde des images du dossier public
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const Client = require('ssh2-sftp-client');
const moment = require('moment');
require('dotenv').config();

// Configuration
const IMAGES_FOLDER = path.join(__dirname, 'public'); // Dossier contenant les images
const BACKUP_FOLDER = path.join(__dirname, 'backups'); // Dossier temporaire pour les sauvegardes
const PREFIX = 'appos_images_';
const RETENTION_DAYS = 7; // Nombre de jours à conserver les sauvegardes

// Configuration SFTP
const sftpConfig = {
  host: process.env.SFTP_HOST,
  port: parseInt(process.env.SFTP_PORT, 10) || 22,
  username: process.env.SFTP_USERNAME,
  password: process.env.SFTP_PASSWORD,
};

// Créer le dossier de sauvegarde s'il n'existe pas
if (!fs.existsSync(BACKUP_FOLDER)) {
  fs.mkdirSync(BACKUP_FOLDER, { recursive: true });
}

// Fonction pour créer une archive ZIP des images
async function createImagesArchive() {
  const timestamp = moment().format('YYYY-MM-DD_HH-mm');
  const backupFileName = `${PREFIX}backup_${timestamp}.zip`;
  const backupPath = path.join(BACKUP_FOLDER, backupFileName);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Niveau de compression maximal
    });

    output.on('close', () => {
      console.log(`Archive des images créée: ${backupPath} (${archive.pointer()} octets)`);
      resolve(backupPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Vérifier si le dossier public existe
    if (fs.existsSync(IMAGES_FOLDER)) {
      // Ajouter le contenu du dossier public à l'archive
      archive.directory(IMAGES_FOLDER, 'public');
    } else {
      console.log("Le dossier public n'existe pas, création d'une archive vide");
    }

    archive.finalize();
  });
}

// Fonction pour envoyer l'archive vers le serveur SFTP
async function uploadToSftp(backupPath) {
  const sftp = new Client();
  const backupFileName = path.basename(backupPath);
  const remotePath = `/backups/${backupFileName}`;

  try {
    console.log('Connexion au serveur SFTP...');
    await sftp.connect(sftpConfig);

    // Vérifier si le dossier de destination existe, sinon le créer
    try {
      await sftp.mkdir('/backups', true);
      console.log('Dossier /backups créé ou déjà existant sur le serveur');
    } catch (err) {
      console.error('Erreur lors de la création du dossier distant:', err);
    }

    // Envoyer le fichier
    console.log(`Envoi de ${backupPath} vers ${remotePath}...`);
    await sftp.put(backupPath, remotePath);
    console.log('Sauvegarde des images téléchargée avec succès');

    // Nettoyer les anciennes sauvegardes sur le serveur SFTP
    await cleanupOldRemoteBackups(sftp);

    return true;
  } catch (err) {
    console.error("Erreur lors de l'envoi SFTP:", err);
    throw err;
  } finally {
    sftp.end();
  }
}

// Fonction pour nettoyer les anciennes sauvegardes sur le serveur SFTP
async function cleanupOldRemoteBackups(sftp) {
  try {
    console.log("Nettoyage des anciennes sauvegardes d'images...");
    const remoteFiles = await sftp.list('/backups');

    // Filtrer uniquement nos fichiers de sauvegarde d'images
    const backupFiles = remoteFiles
      .filter(
        (item) => item.type === '-' && item.name.startsWith(PREFIX) && item.name.endsWith('.zip')
      )
      .map((item) => ({
        name: item.name,
        date: extractDateFromFilename(item.name),
      }))
      .filter((item) => item.date !== null);

    // Trier par date (plus récent en premier)
    backupFiles.sort((a, b) => b.date - a.date);

    // Supprimer les fichiers plus anciens que RETENTION_DAYS
    const cutoffDate = moment().subtract(RETENTION_DAYS, 'days').toDate();

    for (const file of backupFiles) {
      if (file.date < cutoffDate) {
        const remotePath = `/backups/${file.name}`;
        console.log(`Suppression de l'ancienne sauvegarde d'images: ${file.name}`);
        await sftp.delete(remotePath);
      }
    }

    console.log('Nettoyage terminé');
  } catch (err) {
    console.error("Erreur lors du nettoyage des anciennes sauvegardes d'images:", err);
  }
}

// Fonction pour extraire la date d'un nom de fichier de sauvegarde
function extractDateFromFilename(filename) {
  const match = filename.match(/backup_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})\.zip/);
  if (match && match[1]) {
    return moment(match[1], 'YYYY-MM-DD_HH-mm').toDate();
  }
  return null;
}

// Fonction pour nettoyer les anciens fichiers locaux
function cleanupLocalBackups() {
  try {
    console.log("Nettoyage des sauvegardes locales d'images...");
    const files = fs.readdirSync(BACKUP_FOLDER);

    for (const file of files) {
      if (file.startsWith(PREFIX) && file.endsWith('.zip')) {
        const filePath = path.join(BACKUP_FOLDER, file);
        fs.unlinkSync(filePath);
        console.log(`Fichier local d'images supprimé: ${file}`);
      }
    }
  } catch (err) {
    console.error("Erreur lors du nettoyage des sauvegardes locales d'images:", err);
  }
}

// Fonction principale
async function performImagesBackup() {
  try {
    console.log('Démarrage de la sauvegarde des images...');

    // Créer l'archive de sauvegarde
    const backupPath = await createImagesArchive();

    // Envoyer l'archive vers le serveur SFTP
    await uploadToSftp(backupPath);

    // Nettoyer les fichiers locaux
    cleanupLocalBackups();

    console.log('Sauvegarde des images terminée avec succès');
    return { success: true };
  } catch (err) {
    console.error('Erreur lors de la sauvegarde des images:', err);
    return { success: false, error: err.message };
  }
}

// Si le script est exécuté directement
if (require.main === module) {
  performImagesBackup();
}

// Exporter la fonction
module.exports = { performImagesBackup };
