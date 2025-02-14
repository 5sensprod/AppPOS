// src/middleware/upload/config.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const createMulterConfig = (imageHandler) => {
  // Création des dossiers nécessaires
  const ensureDirectories = () => {
    const config = imageHandler.getUploadConfig();
    const tempPath = path.join(process.cwd(), 'public', 'categories', 'temp');

    // Créer le dossier temp s'il n'existe pas
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }
  };

  // S'assurer que les dossiers existent
  ensureDirectories();

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const tempPath = path.join(process.cwd(), 'public', 'categories', 'temp');
      cb(null, tempPath);
    },
    filename: (req, file, cb) => {
      const uniqueId = uuidv4();
      const extension = path.extname(file.originalname);
      cb(null, `${uniqueId}${extension}`);
    },
  });

  return {
    storage,
    limits: {
      fileSize: imageHandler.maxSize,
      files: imageHandler.maxFiles,
    },
    fileFilter: (req, file, cb) => {
      try {
        imageHandler.validateFile(file);
        cb(null, true);
      } catch (error) {
        cb(new Error(error.message));
      }
    },
  };
};

module.exports = createMulterConfig;
