// controllers/categoryController.js
const BaseController = require('./base/BaseController');
const Category = require('../models/Category');
const categoryWooCommerceService = require('../services/CategoryWooCommerceService');
const categoryService = require('../services/CategoryService');
const ResponseHandler = require('../handlers/ResponseHandler');

class CategoryController extends BaseController {
  constructor() {
    super(Category, categoryWooCommerceService, {
      entity: 'categories',
      type: 'single',
    });
  }

  async update(req, res) {
    try {
      const category = await this.model.findById(req.params.id);
      if (!category) {
        return ResponseHandler.notFound(res, 'Catégorie non trouvée');
      }

      // Mise à jour des données via le service
      const updatedData = await categoryService.prepareUpdateData(req.body, category);

      // Mettre à jour req.body avec les données préparées
      req.body = updatedData;

      // Appeler la méthode parent avec req et res inchangés
      const result = await super.update(req, res);

      // Après le retour de super.update(), ne pas continuer car la réponse a déjà été envoyée
      // Notification WebSocket sans passer toute la réponse
      const updatedCategory = await this.model.findById(req.params.id);
      categoryService.notifyCategoryChanges(req.params.id, updatedCategory, 'update');

      // Ne pas retourner de nouvelle réponse
      return;
    } catch (error) {
      console.error('[WS-DEBUG] Erreur dans update() de categoryController:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const categoryId = req.params.id;
      const validationResult = await categoryService.validateDeletion(categoryId);

      if (!validationResult.canDelete) {
        return ResponseHandler.error(res, {
          status: 400,
          message: validationResult.message,
        });
      }

      // Supprimer de WooCommerce si nécessaire
      if (validationResult.category.woo_id) {
        await categoryService.deleteFromWooCommerce(validationResult.category);
      }

      // Supprimer les images et la catégorie
      await this.handleImageDeletion(validationResult.category);
      await this.model.delete(categoryId);

      // Notifications WebSocket via le service
      categoryService.notifyCategoryChanges(categoryId, null, 'delete');

      return ResponseHandler.success(res, {
        message: 'Catégorie supprimée avec succès',
        woo_status: validationResult.category.woo_id ? 'synchronized' : 'not_applicable',
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

async function getHierarchicalCategories(req, res) {
  try {
    const { search = '' } = req.query;
    const hierarchicalData = await categoryService.getHierarchicalData(search);
    return ResponseHandler.success(res, hierarchicalData);
  } catch (error) {
    console.error('Erreur dans getHierarchicalCategories:', error);
    return ResponseHandler.error(res, error);
  }
}

const categoryController = new CategoryController();
module.exports = {
  getAll: categoryController.getAll.bind(categoryController),
  getById: categoryController.getById.bind(categoryController),
  create: categoryController.create.bind(categoryController),
  update: categoryController.update.bind(categoryController),
  delete: categoryController.delete.bind(categoryController),
  uploadImage: categoryController.uploadImage,
  updateImageMetadata: categoryController.updateImageMetadata,
  deleteImage: categoryController.deleteImage,
  getHierarchicalCategories: getHierarchicalCategories,
};
