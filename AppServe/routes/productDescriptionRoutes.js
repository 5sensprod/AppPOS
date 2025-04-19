// routes/productDescriptionRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ResponseHandler = require('../handlers/ResponseHandler');
const fs = require('fs');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const Product = require('../models/Product');

// Importer le service Gemini depuis la nouvelle structure
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

// Route pour générer une description de produit
router.post('/generate', upload.single('image'), async (req, res) => {
  try {
    // Préparation des données du produit
    const productData = {
      name: req.body.name,
      category: req.body.category,
      brand: req.body.brand,
      price: req.body.price,
      sku: req.body.sku, // Ajout du SKU/référence du produit
      currentDescription: req.body.currentDescription,
      specifications: req.body.specifications ? JSON.parse(req.body.specifications) : {},
    };

    // Chemin de l'image téléchargée
    const imagePath = req.file ? req.file.path : null;

    // Générer la description en utilisant le service importé
    const result = await geminiService.generateProductDescription(productData, imagePath);

    return ResponseHandler.success(res, result);
  } catch (error) {
    console.error('Erreur lors de la génération de description:', error);
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
      // Récupérer les informations de base du produit
      const productData = {
        name: req.body.name,
        category: req.body.category,
        brand: req.body.brand,
        price: req.body.price,
        sku: req.body.sku, // Ajout du SKU/référence
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

router.post('/raw-response', async (req, res) => {
  try {
    // Récupérer seulement la description fournie
    const { description } = req.body;

    if (!description) {
      return ResponseHandler.error(res, new Error('La description est requise'));
    }

    // Préparer une requête minimale à l'API Gemini
    const axios = require('axios');
    const apiConfig = require('../services/gemini/config/apiConfig');

    // Utilisation des mêmes paramètres de configuration que le service existant
    const apiKey = process.env.GEMINI_API_KEY;
    const apiBaseUrl = apiConfig.baseUrl;
    const modelName = apiConfig.modelName;

    // Création d'une requête simple avec juste la description comme prompt
    const requestData = {
      contents: [
        {
          role: 'user',
          parts: [{ text: description }],
        },
      ],
      generationConfig: apiConfig.defaultGenerationConfig,
      safetySettings: apiConfig.safetySettings,
    };

    // Envoi direct à l'API Gemini sans transformation
    const apiUrl = `${apiBaseUrl}/${modelName}:generateContent?key=${apiKey}`;
    const response = await axios.post(apiUrl, requestData, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Retourner la réponse brute complète, sans aucune transformation
    return res.status(200).json({
      raw_gemini_response: response.data,
      success: true,
      message: "Réponse brute de l'API Gemini",
    });
  } catch (error) {
    console.error("Erreur lors de la requête à l'API Gemini:", error);
    return ResponseHandler.error(res, error);
  }
});

router.post('/batch', upload.single('input_csv'), async (req, res) => {
  // Vérifier si le fichier a été téléchargé
  if (!req.file) {
    return ResponseHandler.error(res, new Error('Le fichier CSV est requis'));
  }

  // Option pour mettre à jour directement les produits (par défaut: true)
  const updateProducts = req.body.update_products !== 'false';

  const inputFile = req.file;
  const tempOutputPath = `uploads/temp/output_${Date.now()}.csv`;

  try {
    // 1. Charger les données du CSV
    const inputData = await parseCSV(inputFile.path);
    if (!inputData.length) {
      return ResponseHandler.error(res, new Error('Aucune donnée trouvée dans le CSV'));
    }

    // 2. Préparer le tableau de résultats
    const results = [];

    // 3. Traiter chaque ligne du CSV
    for (const row of inputData) {
      // Vérifier les colonnes nécessaires
      const productId = row._id || row.id;
      const customText = row.text || '';

      if (!productId) {
        console.warn('ID de produit manquant dans une ligne');
        results.push({
          _id: 'ERREUR',
          description: '',
          status: 'Erreur: ID manquant',
          error: 'ID de produit manquant',
        });
        continue;
      }

      try {
        // Récupérer les informations du produit avec le modèle Product
        const productWithCategories = await Product.findByIdWithCategoryInfo(productId);

        if (!productWithCategories) {
          console.warn(`Produit avec ID ${productId} non trouvé`);
          results.push({
            _id: productId,
            description: '',
            status: 'Erreur: Produit non trouvé',
            error: 'Produit non trouvé',
          });
          continue;
        }

        // Préparer les données pour la génération
        const productData = {
          name: productWithCategories.name,
          // Utiliser la catégorie primaire si disponible
          category:
            productWithCategories.category_info?.primary?.path_string ||
            productWithCategories.category_name ||
            'Non catégorisé',
          brand: productWithCategories.brand_ref?.name || productWithCategories.brand_name || '',
          price: productWithCategories.price || '',
          sku: productWithCategories.sku || productWithCategories.reference || '',
          // Utiliser le texte personnalisé du CSV ou la description existante
          currentDescription: customText || productWithCategories.description || '',
          specifications: productWithCategories.specifications || {},
        };

        // Générer la description avec le service Gemini
        const result = await geminiService.generateProductDescription(productData, null);

        // Si l'option de mise à jour est activée, mettre à jour le produit
        let updateStatus = 'Description générée uniquement';

        if (updateProducts) {
          // Mettre à jour le produit avec la nouvelle description
          await Product.update(productId, {
            description: result.description,
          });
          updateStatus = 'Produit mis à jour avec succès';
        }

        // Ajouter le résultat
        results.push({
          _id: productId,
          name: productWithCategories.name,
          description: result.description,
          status: updateStatus,
          error: '',
        });

        // Log pour le suivi
        console.log(
          `Description générée pour le produit ${productId}: ${productWithCategories.name} - ${updateStatus}`
        );

        // Petite pause pour éviter de surcharger l'API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Erreur lors du traitement du produit ${productId}:`, error);
        results.push({
          _id: productId,
          description: '',
          status: 'Erreur lors du traitement',
          error: error.message || 'Erreur inconnue',
        });
      }
    }

    // 4. Générer le CSV de sortie
    const parser = new Parser({ fields: ['_id', 'name', 'description', 'status', 'error'] });
    const csv = parser.parse(results);
    await writeFileAsync(tempOutputPath, csv);

    // 5. Renvoyer le fichier CSV
    res.download(
      tempOutputPath,
      `descriptions_generees_${updateProducts ? 'avec_maj' : 'sans_maj'}.csv`,
      async (err) => {
        // Nettoyer le fichier temporaire après envoi
        if (fs.existsSync(tempOutputPath)) {
          try {
            await unlinkAsync(tempOutputPath);
          } catch (e) {
            console.error('Erreur lors de la suppression du fichier temporaire:', e);
          }
        }
      }
    );
  } catch (error) {
    console.error('Erreur lors du traitement par lots:', error);
    return ResponseHandler.error(res, error);
  } finally {
    // Nettoyer le fichier d'entrée
    cleanupFiles([inputFile.path]);
  }
});

// Fonction pour parser un fichier CSV
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Fonction pour nettoyer les fichiers temporaires
async function cleanupFiles(filePaths) {
  for (const path of filePaths) {
    if (fs.existsSync(path)) {
      try {
        await unlinkAsync(path);
      } catch (e) {
        console.error(`Erreur lors de la suppression du fichier ${path}:`, e);
      }
    }
  }
}

module.exports = router;
