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
 * Copie uniquement les bases de données NeDB (prod -> dev)
 */
router.post('/databases', async (req, res) => {
  try {
    console.log('🔄 Début copie bases de données PROD → DEV');

    const results = await dataCopyService.copyDatabases();

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    res.json({
      success: successCount === totalCount,
      message: `Copie PROD → DEV terminée: ${successCount}/${totalCount} bases de données`,
      data: {
        results,
        summary: {
          total: totalCount,
          success: successCount,
          failed: totalCount - successCount,
          direction: 'PROD → DEV',
        },
      },
    });
  } catch (error) {
    console.error('Erreur copie bases de données PROD → DEV:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/data-copy/databases/reverse
 * Copie uniquement les bases de données NeDB (dev -> prod)
 */
router.post('/databases/reverse', async (req, res) => {
  try {
    console.log('🔄 Début copie bases de données DEV → PROD');

    const results = await dataCopyService.copyDatabasesReverse();

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    res.json({
      success: successCount === totalCount,
      message: `Copie DEV → PROD terminée: ${successCount}/${totalCount} bases de données`,
      data: {
        results,
        summary: {
          total: totalCount,
          success: successCount,
          failed: totalCount - successCount,
          direction: 'DEV → PROD',
        },
      },
    });
  } catch (error) {
    console.error('Erreur copie bases de données DEV → PROD:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/data-copy/images
 * Copie uniquement les images (prod -> dev)
 */
router.post('/images', async (req, res) => {
  try {
    console.log('🔄 Début copie images PROD → DEV');

    const results = await dataCopyService.copyImages();

    res.json({
      success: results.errors.length === 0,
      message: `Images copiées PROD → DEV: ${results.copiedFiles}/${results.totalFiles}`,
      data: results,
    });
  } catch (error) {
    console.error('Erreur copie images PROD → DEV:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/data-copy/images/reverse
 * Copie uniquement les images (dev -> prod)
 */
router.post('/images/reverse', async (req, res) => {
  try {
    console.log('🔄 Début copie images DEV → PROD');

    const results = await dataCopyService.copyImagesReverse();

    res.json({
      success: results.errors.length === 0,
      message: `Images copiées DEV → PROD: ${results.copiedFiles}/${results.totalFiles}`,
      data: results,
    });
  } catch (error) {
    console.error('Erreur copie images DEV → PROD:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/data-copy/all
 * Copie complète: bases de données + images (prod -> dev)
 */
router.post('/all', async (req, res) => {
  try {
    console.log('🔄 Début copie complète PROD → DEV');

    const results = await dataCopyService.copyAll();

    const dbSuccess = results.databases.filter((db) => db.success).length;
    const dbTotal = results.databases.length;
    const imgSuccess = results.images.copiedFiles;
    const imgTotal = results.images.totalFiles;

    res.json({
      success: results.success,
      message: `Copie complète PROD → DEV terminée en ${results.duration}ms`,
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
        direction: 'PROD → DEV',
      },
    });
  } catch (error) {
    console.error('Erreur copie complète PROD → DEV:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/data-copy/all/reverse
 * Copie complète: bases de données + images (dev -> prod)
 */
router.post('/all/reverse', async (req, res) => {
  try {
    console.log('🔄 Début copie complète DEV → PROD');

    const results = await dataCopyService.copyAllReverse();

    const dbSuccess = results.databases.filter((db) => db.success).length;
    const dbTotal = results.databases.length;
    const imgSuccess = results.images.copiedFiles;
    const imgTotal = results.images.totalFiles;

    res.json({
      success: results.success,
      message: `Copie complète DEV → PROD terminée en ${results.duration}ms`,
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
        direction: 'DEV → PROD',
      },
    });
  } catch (error) {
    console.error('Erreur copie complète DEV → PROD:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/data-copy/check
 * Vérifie la disponibilité des données dans les deux directions
 */
router.get('/check', (req, res) => {
  try {
    const prodCheck = dataCopyService.checkProductionPaths();
    const devCheck = dataCopyService.checkDevelopmentPaths();

    res.json({
      success: true,
      data: {
        production: {
          dataPath: prodCheck.prodDataPath,
          publicPath: prodCheck.prodPublicPath,
          dataExists: prodCheck.dataExists,
          publicExists: prodCheck.publicExists,
        },
        development: {
          dataPath: devCheck.devDataPath,
          publicPath: devCheck.devPublicPath,
          dataExists: devCheck.dataExists,
          publicExists: devCheck.publicExists,
        },
        copyOptions: {
          prodToDev: {
            canCopyDatabases: prodCheck.dataExists,
            canCopyImages: prodCheck.publicExists,
            canCopyAll: prodCheck.dataExists || prodCheck.publicExists,
          },
          devToProd: {
            canCopyDatabases: devCheck.dataExists,
            canCopyImages: devCheck.publicExists,
            canCopyAll: devCheck.dataExists || devCheck.publicExists,
          },
        },
        recommendations: {
          prodToDev: {
            databases: prodCheck.dataExists
              ? 'Disponible pour copie PROD → DEV'
              : 'Données de production non trouvées',
            images: prodCheck.publicExists
              ? 'Disponible pour copie PROD → DEV'
              : 'Images de production non trouvées',
          },
          devToProd: {
            databases: devCheck.dataExists
              ? 'Disponible pour copie DEV → PROD'
              : 'Données de développement non trouvées',
            images: devCheck.publicExists
              ? 'Disponible pour copie DEV → PROD'
              : 'Images de développement non trouvées',
          },
        },
      },
    });
  } catch (error) {
    console.error('Erreur vérification données:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
