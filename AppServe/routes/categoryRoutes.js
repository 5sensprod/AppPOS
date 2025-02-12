// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const validateSchema = require('../middleware/validation');
const { categorySchema } = require('../validation/schemas');

router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);
router.post('/', validateSchema(categorySchema), categoryController.create);
router.put('/:id', validateSchema(categorySchema), categoryController.update);
router.delete('/:id', categoryController.delete);

module.exports = router;
