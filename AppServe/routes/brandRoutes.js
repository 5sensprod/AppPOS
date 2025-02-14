// routes/brandRoutes.js
const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const validateSchema = require('../middleware/validation');
const { createBrandSchema, updateBrandSchema } = require('../validation/schemas');
const brandImageRoutes = require('./image/brandImageRoutes');

// Routes principales
router.get('/', brandController.getAll);
router.get('/:id', brandController.getById);
router.get('/supplier/:supplierId', brandController.getBySupplier);
router.post('/', validateSchema(createBrandSchema), brandController.create);
router.put('/:id', validateSchema(updateBrandSchema), brandController.update);
router.delete('/:id', brandController.delete);

// Routes images
router.use('/', brandImageRoutes);

module.exports = router;
