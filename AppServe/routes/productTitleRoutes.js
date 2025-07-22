// routes/productTitleRoutes.js - Version nettoyée (Gemini direct)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ResponseHandler = require('../handlers/ResponseHandler');

// Importer le service Gemini directement
const geminiService = require('../services/gemini');

// Configuration Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/temp/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Route pour générer un titre (utilisée par WooCommerceTab.jsx)
router.post('/generate', upload.single('image'), async (req, res) => {
  try {
    console.log('🏷️ Génération de titre avec Gemini...');

    const productData = {
      name: req.body.name,
      category: req.body.category,
      brand: req.body.brand,
      price: req.body.price,
      sku: req.body.sku,
      currentDescription: req.body.currentDescription,
      specifications: req.body.specifications ? JSON.parse(req.body.specifications) : {},
    };

    const imagePath = req.file ? req.file.path : null;

    // Appel direct au service Gemini
    const result = await geminiService.generateProductTitle(productData, imagePath);

    console.log('✅ Titre Gemini généré:', result.success ? 'Succès' : 'Échec');
    return ResponseHandler.success(res, result);
  } catch (error) {
    console.error('❌ Erreur génération titre Gemini:', error);
    return ResponseHandler.error(res, error);
  }
});

module.exports = router;
