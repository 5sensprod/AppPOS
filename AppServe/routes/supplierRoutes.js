// routes/supplierRoutes.js
const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const validateSchema = require('../validation/validation');
const { createSupplierSchema, updateSupplierSchema } = require('../validation/schemas');
const supplierImageRoutes = require('./image/supplierImageRoutes');
const { buildSupplierTree } = require('../services/supplierService');
const ResponseHandler = require('../handlers/ResponseHandler');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Brand = require('../models/Brand');

router.get('/hierarchical', async (req, res) => {
  try {
    const tree = await buildSupplierTree();
    return ResponseHandler.success(res, tree);
  } catch (error) {
    console.error('[supplierRoutes] /hierarchical error:', error);
    return ResponseHandler.error(res, error);
  }
});

router.get('/', supplierController.getAll);
router.get('/:id', supplierController.getById);
router.post('/', validateSchema(createSupplierSchema), supplierController.create);
router.put('/:id', validateSchema(updateSupplierSchema), supplierController.update);

// Route de suppression personnalisée pour vérifier les produits dans les marques
// Dans la route delete de supplierRoutes.js
router.delete('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return ResponseHandler.notFound(res, 'Fournisseur non trouvé');
    }

    // Vérifier si le fournisseur a des produits directement associés
    const linkedProducts = await Product.find({ supplier_id: supplier._id });
    if (linkedProducts && linkedProducts.length > 0) {
      // Créer une liste détaillée des produits liés
      const productDetails = linkedProducts.map((p) => ({
        _id: p._id,
        name: p.name,
        sku: p.sku || null,
      }));

      return ResponseHandler.badRequest(res, {
        message: `Impossible de supprimer ce fournisseur : ${linkedProducts.length} produit(s) encore lié(s)`,
        linkedProducts: productDetails,
      });
    }

    // Vérifier si des marques liées ont des produits
    const brands = supplier.brands || [];
    if (brands.length > 0) {
      const brandsWithProducts = [];

      for (const brandId of brands) {
        const brand = await Brand.findById(brandId);
        if (brand && brand.products_count > 0) {
          const brandProducts = await Product.find({ brand_id: brandId });
          brandsWithProducts.push({
            _id: brand._id,
            name: brand.name,
            productCount: brand.products_count,
            products: brandProducts.map((p) => ({
              _id: p._id,
              name: p.name,
              sku: p.sku || null,
            })),
          });
        }
      }

      if (brandsWithProducts.length > 0) {
        return ResponseHandler.badRequest(res, {
          message: 'Le fournisseur contient une/des marques avec des produits associés',
          brandsWithProducts,
        });
      }
    }

    // Si pas de produits ni marques avec produits, procéder à la suppression
    return supplierController.delete(req, res);
  } catch (error) {
    return ResponseHandler.error(res, error);
  }
});

router.use('/', supplierImageRoutes);

module.exports = router;
