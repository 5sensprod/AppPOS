// controllers/categoryController.js
const BaseController = require('./base/BaseController');
const Category = require('../models/Category');
const categoryWooCommerceService = require('../services/CategoryWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');
const { calculateLevel } = require('../utils/categoryHelpers');

class CategoryController extends BaseController {
  constructor() {
    super(Category, categoryWooCommerceService, {
      entity: 'categories',
      type: 'single',
    });
  }

  async create(req, res) {
    try {
      req.body.level = await calculateLevel(req.body.parent_id);
      return super.create(req, res);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      if (req.body.parent_id) {
        req.body.level = await calculateLevel(req.body.parent_id);
      }
      return super.update(req, res);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const item = await this.model.findById(req.params.id);
      if (!item) return ResponseHandler.notFound(res);

      // Vérification des sous-catégories
      if (item.level === 0) {
        const allCategories = await this.model.findAll();
        const children = allCategories.filter((cat) => cat.parent_id === req.params.id);
        if (children.length > 0) {
          return ResponseHandler.error(res, {
            status: 400,
            message: `Impossible de supprimer la catégorie : ${children.length} sous-catégorie(s) existante(s)`,
          });
        }
      }

      // Vérification des produits liés
      const Product = require('../models/Product');
      const allProducts = await Product.findAll();
      const linkedProducts = allProducts.filter(
        (product) =>
          (product.categories?.length > 0 && product.categories.includes(item._id)) ||
          (product.category_id && product.category_id === item._id)
      );

      if (linkedProducts.length > 0) {
        return ResponseHandler.error(res, {
          status: 400,
          message: `Impossible de supprimer la catégorie : ${linkedProducts.length} produit(s) lié(s)`,
        });
      }

      // Si l'entité est synchronisée avec WooCommerce, la supprimer d'abord de WC
      if (item.woo_id) {
        try {
          console.log(
            `[WS-DEBUG] Suppression de la catégorie ${item._id} de WooCommerce (woo_id: ${item.woo_id})`
          );
          const categoryWooService = require('../services/CategoryWooCommerceService');
          await categoryWooService.deleteCategory(item._id);
          console.log(`[WS-DEBUG] Catégorie supprimée de WooCommerce avec succès`);
        } catch (wcError) {
          console.error(`[WS-DEBUG] Erreur lors de la suppression WooCommerce:`, wcError);
          // On continue malgré l'erreur pour supprimer en local
        }
      }

      await this.handleImageDeletion(item);
      await this.model.delete(req.params.id);

      // Notification WebSocket
      const websocketManager = require('../websocket/websocketManager');
      websocketManager.notifyEntityDeleted('categories', req.params.id);

      return ResponseHandler.success(res, {
        message: 'Catégorie supprimée avec succès',
        woo_status: item.woo_id ? 'synchronized' : 'not_applicable',
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
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
};
