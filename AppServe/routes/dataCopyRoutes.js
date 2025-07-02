// routes/dataCopyRoutes.js
const express = require('express');
const router = express.Router();
const dataCopyService = require('../services/dataCopyService');

/**
 * GET /api/data-copy/statistics
 * Obtient les statistiques des données prod vs dev
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = dataCopyService.getDataStatistics();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/data-copy/databases
 * Copie uniquement les bases de données NeDB
 */
router.post('/databases', async (req, res) => {
  try {
    console.log('🔄 Début copie bases de données prod -> dev');

    const results = await dataCopyService.copyDatabases();

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    res.json({
      success: successCount === totalCount,
      message: `Copie terminée: ${successCount}/${totalCount} bases de données`,
      data: {
        results,
        summary: {
          total: totalCount,
          success: successCount,
          failed: totalCount - successCount,
        },
      },
    });
  } catch (error) {
    console.error('Erreur copie bases de données:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/data-copy/images
 * Copie uniquement les images
 */
router.post('/images', async (req, res) => {
  try {
    console.log('🔄 Début copie images prod -> dev');

    const results = await dataCopyService.copyImages();

    res.json({
      success: results.errors.length === 0,
      message: `Images copiées: ${results.copiedFiles}/${results.totalFiles}`,
      data: results,
    });
  } catch (error) {
    console.error('Erreur copie images:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/data-copy/all
 * Copie complète: bases de données + images
 */
router.post('/all', async (req, res) => {
  try {
    console.log('🔄 Début copie complète prod -> dev');

    const results = await dataCopyService.copyAll();

    const dbSuccess = results.databases.filter((db) => db.success).length;
    const dbTotal = results.databases.length;
    const imgSuccess = results.images.copiedFiles;
    const imgTotal = results.images.totalFiles;

    res.json({
      success: results.success,
      message: `Copie complète terminée en ${results.duration}ms`,
      data: {
        databases: {
          success: dbSuccess,
          total: dbTotal,
          results: results.databases,
        },
        images: {
          success: imgSuccess,
          total: imgTotal,
          errors: results.images.errors,
          details: results.images.details,
        },
        duration: results.duration,
      },
    });
  } catch (error) {
    console.error('Erreur copie complète:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/data-copy/check
 * Vérifie la disponibilité des données de production
 */
router.get('/check', (req, res) => {
  try {
    const prodCheck = dataCopyService.checkProductionPaths();

    res.json({
      success: true,
      data: {
        production: {
          dataPath: prodCheck.prodDataPath,
          publicPath: prodCheck.prodPublicPath,
          dataExists: prodCheck.dataExists,
          publicExists: prodCheck.publicExists,
        },
        canCopy: prodCheck.dataExists || prodCheck.publicExists,
        recommendations: {
          databases: prodCheck.dataExists
            ? 'Disponible pour copie'
            : 'Données de production non trouvées',
          images: prodCheck.publicExists
            ? 'Disponible pour copie'
            : 'Images de production non trouvées',
        },
      },
    });
  } catch (error) {
    console.error('Erreur vérification données prod:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
