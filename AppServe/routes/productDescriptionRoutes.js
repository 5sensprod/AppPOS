// routes/productDescriptionRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ResponseHandler = require('../handlers/ResponseHandler');
const GeminiDescriptionService = require('../services/GeminiDescriptionService');

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

// Route pour générer une description de produit
router.post('/generate', upload.single('image'), async (req, res) => {
  try {
    const geminiService = new GeminiDescriptionService();

    // Préparation des données du produit
    const productData = {
      name: req.body.name,
      category: req.body.category,
      brand: req.body.brand,
      price: req.body.price,
      currentDescription: req.body.currentDescription, // AJOUT: récupérer la description actuelle
      specifications: req.body.specifications ? JSON.parse(req.body.specifications) : {},
    };

    // Chemin de l'image téléchargée
    const imagePath = req.file ? req.file.path : null;

    // Générer la description
    const result = await geminiService.generateProductDescription(productData, imagePath);

    return ResponseHandler.success(res, result);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

module.exports = router;
