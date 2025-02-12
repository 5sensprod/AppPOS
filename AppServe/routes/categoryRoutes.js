// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const validateSchema = require('../middleware/validation');
const { categorySchema } = require('../validation/schemas');
const upload = require('../middleware/upload');

router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);
router.post('/:id/upload', upload.single('image'), categoryController.uploadImage);
router.post('/', validateSchema(categorySchema), categoryController.create);
router.put('/:id', validateSchema(categorySchema), categoryController.update);
router.delete('/:id', categoryController.delete);

module.exports = router;
