// routes/supplierRoutes.js
const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const validateSchema = require('../middleware/validation');
const { createSupplierSchema, updateSupplierSchema } = require('../validation/schemas');
const supplierImageRoutes = require('./image/supplierImageRoutes');

router.get('/', supplierController.getAll);
router.get('/:id', supplierController.getById);
router.post('/', validateSchema(createSupplierSchema), supplierController.create);
router.put('/:id', validateSchema(updateSupplierSchema), supplierController.update);
router.delete('/:id', supplierController.delete);

router.use('/', supplierImageRoutes);

module.exports = router;
