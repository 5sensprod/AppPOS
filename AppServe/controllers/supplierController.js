// controllers/supplierController.js
const Supplier = require('../models/Supplier');
const fs = require('fs').promises;
const path = require('path');

const supplierController = {
  async getAll(req, res) {
    try {
      const suppliers = await Supplier.findAll();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const supplier = await Supplier.findById(req.params.id);
      if (!supplier) return res.status(404).json({ message: 'Fournisseur non trouvé' });
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async uploadImage(req, res) {
    try {
      if (!req.file) return res.status(400).json({ message: 'No image provided' });

      const imagePath = `/public/suppliers/${req.params.id}/${req.file.filename}`;
      const localPath = path.join(
        path.resolve(__dirname, '../public'),
        'suppliers',
        req.params.id,
        req.file.filename
      );

      await Product.update(req.params.id, { image: { local_path: localPath, src: imagePath } });

      res.json({ message: 'Image uploaded successfully', src: imagePath });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      const newSupplier = await Supplier.create(req.body);
      res.status(201).json(newSupplier);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const updated = await Supplier.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: 'Fournisseur non trouvé' });
      res.json({ message: 'Fournisseur mis à jour' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await Supplier.delete(req.params.id);
      if (!deleted) return res.status(404).json({ message: 'Fournisseur non trouvé' });
      res.json({ message: 'Fournisseur supprimé' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = supplierController;
