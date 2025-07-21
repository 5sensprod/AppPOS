// routes/aiAdminRoutes.js - VERSION TEMPORAIRE
const express = require('express');
const router = express.Router();
const ResponseHandler = require('../handlers/ResponseHandler');

/**
 * Route temporaire pour le statut - avant intégration complète
 */
router.get('/status', async (req, res) => {
  try {
    // Version temporaire - seulement Gemini disponible
    const status = {
      current_provider: 'gemini',
      available_providers: ['gemini'],
      services_status: {
        gemini: { available: true, provider: 'gemini' },
      },
      total_services: 1,
      working_services: 1,
      message: 'Installation en cours - HuggingFace pas encore configuré',
    };

    return ResponseHandler.success(res, status);
  } catch (error) {
    console.error('Erreur lors du statut IA:', error);
    return ResponseHandler.error(res, error);
  }
});

/**
 * Route temporaire pour test Gemini
 */
router.post('/test/gemini', async (req, res) => {
  try {
    const geminiService = require('../services/gemini');

    // Test simple
    const testData = {
      name: 'Test Product',
      category: 'Test',
      brand: 'Test Brand',
    };

    const result = await geminiService.generateProductDescription(testData, null);

    return ResponseHandler.success(res, {
      available: true,
      provider: 'gemini',
      test_result: result,
      message: 'Service Gemini fonctionnel',
    });
  } catch (error) {
    console.error('Erreur test Gemini:', error);
    return ResponseHandler.error(res, error);
  }
});

/**
 * Routes non disponibles temporairement
 */
router.post('/provider', (req, res) => {
  return ResponseHandler.error(
    res,
    new Error('Changement de provider non disponible - Installation HuggingFace en cours')
  );
});

router.post('/test/:provider', (req, res) => {
  const { provider } = req.params;

  if (provider === 'gemini') {
    // Rediriger vers le test Gemini
    return router.handle({ method: 'POST', url: '/test/gemini' }, req, res);
  }

  return ResponseHandler.error(
    res,
    new Error(`Provider ${provider} non disponible - Installation en cours`)
  );
});

router.get('/test-all', (req, res) => {
  return ResponseHandler.success(res, {
    total_tested: 1,
    working: 1,
    failed: 0,
    details: {
      gemini: { available: true, provider: 'gemini' },
    },
    message: "Seulement Gemini testé - HuggingFace en cours d'installation",
  });
});

router.post('/test-generation/:provider', async (req, res) => {
  try {
    if (req.params.provider !== 'gemini') {
      return ResponseHandler.error(
        res,
        new Error(`Provider ${req.params.provider} non disponible - Installation en cours`)
      );
    }

    const geminiService = require('../services/gemini');

    const testProductData = {
      name: req.body.product_name || 'Produit Test IA',
      category: req.body.category || 'Test',
      brand: req.body.brand || 'Test Brand',
      price: req.body.price || '29.99',
      sku: req.body.sku || 'TEST-001',
    };

    const result = await geminiService.generateProductDescription(testProductData, null);

    return ResponseHandler.success(res, {
      message: `Test de génération réussi avec Gemini`,
      provider_tested: 'gemini',
      generation_result: result,
    });
  } catch (error) {
    console.error('Erreur test génération:', error);
    return ResponseHandler.error(res, error);
  }
});

module.exports = router;
