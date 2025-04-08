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

// Route pour l'interaction via chat
router.post('/chat', (req, res) => {
  // Utiliser une instance Multer plus permissive pour le traitement de cette route
  const chatUpload = multer({
    storage: storage,
    // Ne pas spécifier de fieldname pour accepter tous les champs de fichiers
  }).any();

  chatUpload(req, res, async (err) => {
    if (err) {
      console.error('Erreur Multer:', err);
      return ResponseHandler.error(res, err);
    }

    try {
      const geminiService = new GeminiDescriptionService();

      // Récupérer les informations de base du produit
      const productData = {
        name: req.body.name,
        category: req.body.category,
        brand: req.body.brand,
        price: req.body.price,
        currentDescription: req.body.currentDescription,
        specifications: req.body.specifications ? JSON.parse(req.body.specifications) : {},
      };

      // Récupérer le message de l'utilisateur
      const userMessage = req.body.message || '';

      // Récupérer l'historique de conversation si disponible
      let conversation = [];
      try {
        if (req.body.conversation) {
          conversation = JSON.parse(req.body.conversation);
        }
      } catch (e) {
        console.warn('Erreur lors du parsing de la conversation:', e);
      }

      // Traiter les fichiers téléchargés (maintenant disponibles dans req.files)
      const files = req.files || [];
      const filePaths = files.map((file) => file.path);

      // Générer une réponse et une description basées sur le chat
      const result = await geminiService.generateChatResponse(
        productData,
        userMessage,
        conversation,
        filePaths
      );

      return ResponseHandler.success(res, result);
    } catch (error) {
      console.error('Erreur lors du traitement de la demande chat:', error);
      return ResponseHandler.error(res, error);
    }
  });
});

module.exports = router;
