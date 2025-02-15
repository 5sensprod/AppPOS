// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const validateSchema = require('../middleware/validation');
const { createProductSchema, updateProductSchema } = require('../validation/schemas'); // ✅ Import corrigé
const upload = require('../middleware/upload');

router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/:id/upload', upload.single('image'), productController.uploadImage);

// ✅ Utilisation des nouveaux schémas
router.post('/', validateSchema(createProductSchema), productController.create);
router.put('/:id', validateSchema(updateProductSchema), productController.update);
router.delete('/:id', productController.delete);

module.exports = router;
