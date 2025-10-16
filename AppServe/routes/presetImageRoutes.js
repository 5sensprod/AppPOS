// AppServer/routes/presetImageRoutes.js
const express = require('express');
const PresetImageController = require('../controllers/PresetImageController');
const { authMiddleware } = require('../utils/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const extractImageDimensions = require('../middleware/upload/dimensionExtractor');

const router = express.Router();
const controller = new PresetImageController();

// Configuration Multer pour les images de presets
const pathManager = require('../utils/PathManager');
const tempPath = path.join(pathManager.getPublicPath('presets'), 'temp');

// S'assurer que le dossier temp existe
if (!fs.existsSync(tempPath)) {
  fs.mkdirSync(tempPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempPath);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueId}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Formats acceptés: JPEG, PNG, GIF, WebP'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 10, // Max 10 fichiers à la fois
  },
  fileFilter: fileFilter,
});

// 📤 Upload d'images (authentification requise)
router.post(
  '/upload',
  authMiddleware,
  upload.array('images', 10),
  extractImageDimensions,
  controller.uploadImages.bind(controller)
);

// 📋 Liste des images (authentification requise)
router.get('/', authMiddleware, controller.listImages.bind(controller));

// 🔍 Info sur une image spécifique
router.get('/:filename', authMiddleware, controller.getImageInfo.bind(controller));

// 🗑️ Suppression d'une image
router.delete('/:filename', authMiddleware, controller.deleteImage.bind(controller));

// 🧹 Nettoyage des images orphelines (admin uniquement)
router.post('/cleanup', authMiddleware, controller.cleanupOrphanImages.bind(controller));

module.exports = router;
