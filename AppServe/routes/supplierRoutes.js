// routes/supplierRoutes.js
const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const validateSchema = require('../validation/validation');
const { createSupplierSchema, updateSupplierSchema } = require('../validation/schemas');
const supplierImageRoutes = require('./image/supplierImageRoutes');
const { buildSupplierTree } = require('../services/supplierService');
const ResponseHandler = require('../handlers/ResponseHandler');

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
router.delete('/:id', supplierController.delete);

router.use('/', supplierImageRoutes);

module.exports = router;
