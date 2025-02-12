// controllers/supplierController.js
const Supplier = require('../models/Supplier');

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
