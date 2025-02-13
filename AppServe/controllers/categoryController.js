// controllers/categoryController.js
const Category = require('../models/Category');
const woocommerceService = require('../services/woocommerceService');
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
      if (!req.file) return res.status(400).json({ message: 'Aucune image fournie' });

      const imagePath = `/public/categories/${req.params.id}/${req.file.filename}`;
      const localPath = path.join(
        path.resolve(__dirname, '../public'),
        'categories',
        req.params.id,
        req.file.filename
      );

      await Category.update(req.params.id, {
        image: {
          local_path: localPath,
          src: imagePath,
        },
      });

      if (process.env.SYNC_ON_CHANGE === 'true') {
        await woocommerceService.syncToWooCommerce([await Category.findById(req.params.id)]);
      }

      res.json({ message: 'Image téléversée avec succès', src: imagePath });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      const level = await calculateLevel(req.body.parent_id);
      const newCategory = await Category.create({ ...req.body, level });

      if (process.env.SYNC_ON_CHANGE === 'true') {
        await woocommerceService.syncToWooCommerce([newCategory]);
      }

      res.status(201).json(newCategory);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const level = req.body.parent_id ? await calculateLevel(req.body.parent_id) : undefined;
      const updateData = level ? { ...req.body, level } : req.body;

      const updated = await Category.update(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: 'Catégorie non trouvée' });

      if (process.env.SYNC_ON_CHANGE === 'true') {
        await woocommerceService.syncToWooCommerce([await Category.findById(req.params.id)]);
      }

      res.json({ message: 'Catégorie mise à jour' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req, res) {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) return res.status(404).json({ message: 'Catégorie non trouvée' });

      // Vérifier si la catégorie est "non-classe"
      if (category.slug === 'non-classe') {
        return res
          .status(403)
          .json({ message: 'Impossible de supprimer la catégorie par défaut WooCommerce.' });
      }

      if (process.env.SYNC_ON_CHANGE === 'true') {
        await woocommerceService.deleteCategory(req.params.id);
      } else {
        await Category.delete(req.params.id);
      }

      res.json({ message: 'Catégorie supprimée' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = categoryController;
