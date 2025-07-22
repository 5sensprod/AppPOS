// routes/productDescriptionRoutes.js - Version nettoyée (Gemini direct)
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

// Route principale pour le chat (utilisée par ProductDescription.jsx)
router.post('/chat', (req, res) => {
  const chatUpload = multer({
    storage: storage,
  }).any();

  chatUpload(req, res, async (err) => {
    if (err) {
      console.error('Erreur Multer:', err);
      return ResponseHandler.error(res, err);
    }

    try {
      console.log('🔄 Traitement de la requête chat Gemini...');

      const productData = {
        name: req.body.name,
        category: req.body.category,
        brand: req.body.brand,
        price: req.body.price,
        sku: req.body.sku,
        currentDescription: req.body.currentDescription,
        specifications: req.body.specifications ? JSON.parse(req.body.specifications) : {},
      };

      const userMessage = req.body.message || '';

      let conversation = [];
      try {
        if (req.body.conversation) {
          conversation = JSON.parse(req.body.conversation);
        }
      } catch (e) {
        console.warn('Erreur parsing conversation:', e);
      }

      const files = req.files || [];
      const filePaths = files.map((file) => file.path);

      // Appel direct au service Gemini
      const result = await geminiService.generateChatResponse(
        productData,
        userMessage,
        conversation,
        filePaths
      );

      console.log('✅ Réponse Gemini générée avec succès');
      return ResponseHandler.success(res, result);
    } catch (error) {
      console.error('❌ Erreur chat Gemini:', error);
      return ResponseHandler.error(res, error);
    }
  });
});

module.exports = router;
