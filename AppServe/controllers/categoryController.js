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

      // Mettre à jour la catégorie avec le chemin de l'image
      await Category.update(req.params.id, {
        image: {
          local_path: localPath,
          src: imagePath,
        },
      });

      if (process.env.SYNC_ON_CHANGE === 'true') {
        const category = await Category.findById(req.params.id);
        const syncResult = await woocommerceService.syncToWooCommerce([category]);

        if (syncResult.errors.length > 0) {
          return res.status(207).json({
            message: 'Image téléversée mais erreur de synchronisation',
            src: imagePath,
            sync_errors: syncResult.errors,
          });
        }
      }

      res.json({ message: 'Image téléversée avec succès', src: imagePath });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async updateImageMetadata(req, res) {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({ message: 'Catégorie non trouvée' });
      }

      if (!category.image) {
        return res.status(400).json({ message: "Cette catégorie n'a pas d'image" });
      }

      // Mise à jour des métadonnées tout en conservant les chemins
      const updatedImage = {
        ...category.image,
        ...req.body,
      };

      const updated = await Category.update(req.params.id, {
        image: updatedImage,
      });

      if (process.env.SYNC_ON_CHANGE === 'true') {
        await woocommerceService.syncToWooCommerce([updated]);
      }

      res.json({
        message: "Métadonnées de l'image mises à jour",
        image: updatedImage,
      });
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
            // La catégorie est créée en local mais la synchro a échoué
            return res.status(207).json({
              category: newCategory,
              sync_status: 'failed',
              sync_errors: syncResult.errors,
            });
          }
        } catch (syncError) {
          // La catégorie est créée en local mais la synchro a échoué
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
};

module.exports = categoryController;
