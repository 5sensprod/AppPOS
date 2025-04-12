const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ResponseHandler = require('../handlers/ResponseHandler');
const geminiService = require('../services/gemini');

// Configuration de Multer pour le stockage temporaire des fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/temp/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

/**
 * Route pour générer uniquement un titre de produit
 * POST /api/product-title/generate
 */
router.post('/generate', upload.single('image'), async (req, res) => {
  try {
    // Préparation des données du produit
    const productData = {
      name: req.body.name,
      category: req.body.category,
      brand: req.body.brand,
      price: req.body.price,
      sku: req.body.sku,
      currentDescription: req.body.currentDescription,
      specifications: req.body.specifications ? JSON.parse(req.body.specifications) : {},
      targetAudience: req.body.targetAudience || 'consommateurs',
    };

    // Chemin de l'image téléchargée
    const imagePath = req.file ? req.file.path : null;

    // Générer uniquement le titre en utilisant le service
    const result = await geminiService.generateProductTitle(productData, imagePath);

    return ResponseHandler.success(res, result);
  } catch (error) {
    console.error('Erreur lors de la génération du titre:', error);
    return ResponseHandler.error(res, error);
  }
});

router.post('/generate-json', express.json(), async (req, res) => {
  try {
    // Récupérer les données directement depuis req.body qui est déjà un objet JSON
    const productData = req.body;

    // Générer uniquement le titre en utilisant le service
    const result = await geminiService.generateProductTitle(productData);

    return ResponseHandler.success(res, result);
  } catch (error) {
    console.error('Erreur lors de la génération du titre:', error);
    return ResponseHandler.error(res, error);
  }
});

module.exports = router;
