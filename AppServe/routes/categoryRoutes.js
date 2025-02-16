// src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const validateSchema = require('../validation/validation');
const { createCategorySchema, updateCategorySchema } = require('../validation/schemas');
const categoryImageRoutes = require('./image/categoryImageRoutes');

// Routes principales des catégories
router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);
router.post('/', validateSchema(createCategorySchema), categoryController.create);
router.put('/:id', validateSchema(updateCategorySchema), categoryController.update);
router.delete('/:id', categoryController.delete);

// Intégration des routes de gestion d'images
router.use('/', categoryImageRoutes);

module.exports = router;
