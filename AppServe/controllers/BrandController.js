// controllers/brandController.js
const Brand = require('../models/Brand');

const brandController = {
  async getAll(req, res) {
    try {
      const brands = await Brand.findAll();
      res.json(brands);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const brand = await Brand.findById(req.params.id);
      if (!brand) return res.status(404).json({ message: 'Marque non trouvée' });
      res.json(brand);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      const newBrand = await Brand.create(req.body);
      res.status(201).json(newBrand);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const updated = await Brand.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: 'Marque non trouvée' });
      res.json({ message: 'Marque mise à jour' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await Brand.delete(req.params.id);
      if (!deleted) return res.status(404).json({ message: 'Marque non trouvée' });
      res.json({ message: 'Marque supprimée' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = brandController;
