// routes/brandRoutes.js
const express = require('express');
const router = express.Router();
const brandController = require('../controllers/BrandController');
const validateSchema = require('../validation/validation');
const { createBrandSchema, updateBrandSchema } = require('../validation/schemas');
const brandImageRoutes = require('./image/brandImageRoutes');
const wooSyncMiddleware = require('../middleware/wooSyncMiddleware');
const Brand = require('../models/Brand');
const Product = require('../models/Product');
const ResponseHandler = require('../handlers/ResponseHandler');

// Routes principales
router.get('/', brandController.getAll);
router.get('/:id', brandController.getById);
router.get('/supplier/:supplierId', brandController.getBySupplier);
router.post('/', validateSchema(createBrandSchema), brandController.create);
router.put('/:id', validateSchema(updateBrandSchema), brandController.update);

// Route de suppression avec vérification du compteur de produits
router.delete('/:id', async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return ResponseHandler.notFound(res, 'Marque non trouvée');
    }

    // Rechercher les produits liés à cette marque
    const linkedProducts = await Product.find({ brand_id: brand._id });

    if (linkedProducts && linkedProducts.length > 0) {
      // Préparation de la liste détaillée des produits
      const productDetails = linkedProducts.map((p) => ({
        _id: p._id,
        name: p.name,
        sku: p.sku || null,
        supplier_id: p.supplier_id,
      }));

      return ResponseHandler.badRequest(res, {
        message: 'La marque contient un/des produits associés à un fournisseur',
        linkedProducts: productDetails,
      });
    }

    // Si pas de produits, procéder à la suppression
    return brandController.delete(req, res);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

// Route de synchronisation
router.post(
  '/:id/sync',
  (req, res, next) => {
    req.model = Brand;
    next();
  },
  wooSyncMiddleware({ forceSync: true, manualSync: true })
);

// Routes images
router.use('/', brandImageRoutes);

module.exports = router;
