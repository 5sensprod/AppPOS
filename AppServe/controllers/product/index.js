// ===== controllers/product/index.js =====
const productController = require('./productController');
const productBatchController = require('./productBatchController');
const productImageController = require('./productImageController');
const productSearchController = require('./productSearchController');
const productStatsController = require('./productStatsController');
const productStockController = require('./productStockController');

// Agrégation de tous les contrôleurs
module.exports = {
  // CRUD & Gestion de base
  ...productController,

  // Opérations par lot
  ...productBatchController,

  // Gestion des images
  ...productImageController,

  // Recherche & Identification
  ...productSearchController,

  // Statistiques & Analytics
  ...productStatsController,

  // Gestion du stock
  ...productStockController,
};
