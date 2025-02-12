// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const validateSchema = require('../middleware/validation');
const { productSchema } = require('../validation/schemas');
const upload = require('../middleware/upload');

router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/:id/upload', upload.single('image'), productController.uploadImage);
router.post('/', validateSchema(productSchema), productController.create);
router.put('/:id', validateSchema(productSchema), productController.update);
router.delete('/:id', productController.delete);

module.exports = router;
