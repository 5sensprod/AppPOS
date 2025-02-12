// routes/supplierRoutes.js
const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const validateSchema = require('../middleware/validation');
const { supplierSchema } = require('../validation/schemas');

router.get('/', supplierController.getAll);
router.get('/:id', supplierController.getById);
router.post('/', validateSchema(supplierSchema), supplierController.create);
router.put('/:id', validateSchema(supplierSchema), supplierController.update);
router.delete('/:id', supplierController.delete);

module.exports = router;
