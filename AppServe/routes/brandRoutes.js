// routes/brandRoutes.js
const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const validateSchema = require('../middleware/validation');
const { brandSchema } = require('../validation/schemas');

router.get('/', brandController.getAll);
router.get('/:id', brandController.getById);
router.post('/', validateSchema(brandSchema), brandController.create);
router.put('/:id', validateSchema(brandSchema), brandController.update);
router.delete('/:id', brandController.delete);

module.exports = router;
