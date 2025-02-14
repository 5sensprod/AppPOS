// controllers/categoryController.js
const Category = require('../models/Category');
const woocommerceService = require('../services/woocommerceService');
const { calculateLevel } = require('../utils/categoryHelpers');
const BaseImageController = require('./image/BaseImageController');

const imageController = new BaseImageController('categories');

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

  async create(req, res) {
    try {
      const level = await calculateLevel(req.body.parent_id);
      const newCategory = await Category.create({ ...req.body, level });

      if (process.env.SYNC_ON_CHANGE === 'true') {
        try {
          const syncResult = await woocommerceService.syncToWooCommerce([newCategory]);

          if (syncResult.errors.length > 0) {
            return res.status(207).json({
              category: newCategory,
              sync_status: 'failed',
              sync_errors: syncResult.errors,
            });
          }
        } catch (syncError) {
          return res.status(207).json({
            category: newCategory,
            sync_status: 'failed',
            sync_error: syncError.message,
          });
        }
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

  // Les méthodes de gestion d'images sont maintenant déléguées au BaseImageController
  uploadImage: imageController.uploadImage.bind(imageController),
  updateImageMetadata: imageController.updateImageMetadata.bind(imageController),
  deleteImage: imageController.deleteImage.bind(imageController),
};

module.exports = categoryController;
