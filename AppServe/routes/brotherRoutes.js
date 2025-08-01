// AppServe/routes/brotherRoutes.js
const express = require('express');
const router = express.Router();
const BrotherService = require('../services/BrotherService');
const ResponseHandler = require('../handlers/ResponseHandler');
const multer = require('multer');
const path = require('path');

// Configuration multer pour upload des templates
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../data/brother/templates'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/octet-stream' && file.originalname.endsWith('.lbx')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers .lbx sont autorisés'));
    }
  },
});

// Instance du service Brother
const brotherService = new BrotherService();

/**
 * GET /api/brother/health
 * Vérifier si le bridge Brother est disponible
 */
router.get('/health', async (req, res) => {
  try {
    const status = await brotherService.checkHealth();
    return ResponseHandler.success(res, status);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

/**
 * GET /api/brother/printers
 * Lister toutes les imprimantes Brother disponibles
 */
router.get('/printers', async (req, res) => {
  try {
    const printers = await brotherService.getInstalledPrinters();
    return ResponseHandler.success(res, printers);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

/**
 * GET /api/brother/templates
 * Lister tous les templates disponibles
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = await brotherService.getAvailableTemplates();
    return ResponseHandler.success(res, templates);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

/**
 * POST /api/brother/templates/upload
 * Upload d'un nouveau template .lbx
 */
router.post('/templates/upload', upload.single('template'), async (req, res) => {
  try {
    if (!req.file) {
      return ResponseHandler.badRequest(res, 'Aucun fichier template fourni');
    }

    return ResponseHandler.created(res, {
      message: 'Template uploadé avec succès',
      filename: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
    });
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

/**
 * GET /api/brother/templates/:name/objects
 * Analyser les objets disponibles dans un template
 */
router.get('/templates/:name/objects', async (req, res) => {
  try {
    const result = await brotherService.getTemplateObjects(req.params.name);
    return ResponseHandler.success(res, result);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

/**
 * POST /api/brother/print
 * Imprimer une étiquette
 * Body: { template, data, options: { printer?, copies? } }
 */
router.post('/print', async (req, res) => {
  try {
    const { template, data, options = {} } = req.body;

    if (!template) {
      return ResponseHandler.badRequest(res, 'Template requis');
    }
    if (!data) {
      return ResponseHandler.badRequest(res, 'Données requis');
    }

    const result = await brotherService.print(template, data, options);
    return ResponseHandler.success(res, result);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

/**
 * GET /api/brother/settings
 * Obtenir les paramètres de configuration actuels
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await brotherService.getSettings();
    return ResponseHandler.success(res, settings);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

/**
 * PUT /api/brother/settings
 * Mettre à jour les paramètres de configuration
 */
router.put('/settings', async (req, res) => {
  try {
    const updatedSettings = await brotherService.updateSettings(req.body);
    return ResponseHandler.success(res, updatedSettings);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

module.exports = router;
