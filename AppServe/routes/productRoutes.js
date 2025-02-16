const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const validateSchema = require('../validation/validation');
const { createProductSchema, updateProductSchema } = require('../validation/schemas');
const productImageRoutes = require('./image/productImageRoutes');

router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', validateSchema(createProductSchema), productController.create);
router.put('/:id', validateSchema(updateProductSchema), productController.update);
router.delete('/:id', productController.delete);

router.use('/', productImageRoutes);

module.exports = router;
