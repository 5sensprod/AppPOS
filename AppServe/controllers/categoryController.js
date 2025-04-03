// controllers/categoryController.js
const BaseController = require('./base/BaseController');
const Category = require('../models/Category');
const categoryWooCommerceService = require('../services/CategoryWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');
const {
  calculateLevel,
  hasChildren,
  getLinkedProducts,
  removeCategoryFromProducts,
  buildCategoryTree,
} = require('../services/categoryService');
const { getEntityEventService } = require('../services/events/entityEvents');

class CategoryController extends BaseController {
  constructor() {
    super(Category, categoryWooCommerceService, {
      image: { type: 'single' },
      deleteFromWoo: (id) => categoryWooCommerceService.deleteCategory(id),
    });
    this.eventService = getEntityEventService(this.entityName);
  }

  async create(req, res) {
    try {
      if (req.body.parent_id) {
        req.body.level = await calculateLevel(req.body.parent_id);
      } else {
        req.body.level = 0;
      }

      const newCategory = await this.model.create(req.body);
      this.eventService.created(newCategory);

      const syncResult = await this.syncIfNeeded([newCategory], res);
      if (syncResult) return syncResult;

      return ResponseHandler.created(res, newCategory);
    } catch (error) {
      console.error('[WS-DEBUG] Erreur dans create() de categoryController:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const category = await this.getByIdOr404(req.params.id, res);
      if (!category) return;

      if (req.body.parent_id && req.body.parent_id !== category.parent_id) {
        req.body.level = await calculateLevel(req.body.parent_id);
      }

      const updateData = { ...req.body };
      if (category.woo_id) updateData.pending_sync = true;

      await this.model.update(req.params.id, updateData);
      const updatedItem = await this.model.findById(req.params.id);

      this.eventService.updated(req.params.id, updatedItem);

      const syncResult = await this.syncIfNeeded([updatedItem], res);
      if (syncResult) return syncResult;

      return ResponseHandler.success(res, updatedItem);
    } catch (error) {
      console.error('[WS-DEBUG] Erreur dans update() de categoryController:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const category = await this.getByIdOr404(req.params.id, res);
      if (!category) return;

      const hasChildrenCat = await hasChildren(category._id);
      if (hasChildrenCat) {
        return ResponseHandler.error(res, {
          status: 400,
          message: `Impossible de supprimer la catégorie : des sous-catégories existent`,
        });
      }

      const linkedProducts = await getLinkedProducts(category._id);
      if (linkedProducts.length > 0) {
        return ResponseHandler.error(res, {
          status: 400,
          message: `Impossible de supprimer la catégorie : ${linkedProducts.length} produit(s) lié(s)`,
        });
      }

      await this.handleImageDeletion(category);
      await removeCategoryFromProducts(category._id);
      await this.handleWooCommerceDelete(category);
      await this.model.delete(req.params.id);

      this.eventService.deleted(req.params.id);

      return ResponseHandler.success(res, {
        message: 'Catégorie supprimée avec succès',
        woo_status: category.woo_id ? 'synchronized' : 'not_applicable',
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

async function getHierarchicalCategories(req, res) {
  try {
    const allCategories = await Category.findAll();
    const Product = require('../models/Product');
    const allProducts = await Product.findAll();

    const tree = buildCategoryTree(allCategories, allProducts);
    return ResponseHandler.success(res, tree);
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
  getHierarchicalCategories,
};
