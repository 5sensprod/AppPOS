// controllers/categoryController.js
const Category = require('../models/Category');
const { calculateLevel } = require('../utils/categoryHelpers');
const fs = require('fs').promises;
const path = require('path');

const categoryController = {
  async getAll(req, res) {
    try {
      const categories = await Category.findAll();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) return res.status(404).json({ message: 'Catégorie non trouvée' });
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  async uploadImage(req, res) {
    try {
      if (!req.file) return res.status(400).json({ message: 'No image provided' });

      const imagePath = `/public/categories/${req.params.id}/${req.file.filename}`;
      const localPath = path.join(
        path.resolve(__dirname, '../public'),
        'categories',
        req.params.id,
        req.file.filename
      );

      await Category.update(req.params.id, { image: { local_path: localPath, src: imagePath } });

      res.json({ message: 'Image uploaded successfully', src: imagePath });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      const level = await calculateLevel(req.body.parent_id);
      const newCategory = await Category.create({ ...req.body, level });
      res.status(201).json(newCategory);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const updated = await Category.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: 'Catégorie non trouvée' });
      res.json({ message: 'Catégorie mise à jour' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await Category.delete(req.params.id);
      if (!deleted) return res.status(404).json({ message: 'Catégorie non trouvée' });
      res.json({ message: 'Catégorie supprimée' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = categoryController;
