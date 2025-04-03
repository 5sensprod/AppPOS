const BaseController = require('./base/BaseController');
const Category = require('../models/Category');
const categoryWooCommerceService = require('../services/CategoryWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');
const {
  buildCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
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
      const category = await createCategory(req.body);
      const syncResult = await this.syncIfNeeded([category], res);
      if (syncResult) return syncResult;

      return ResponseHandler.created(res, category);
    } catch (error) {
      console.error('[CategoryController] Erreur create:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const existing = await this.getByIdOr404(req.params.id, res);
      if (!existing) return;

      const updated = await updateCategory(req.params.id, req.body);
      const syncResult = await this.syncIfNeeded([updated], res);
      if (syncResult) return syncResult;

      return ResponseHandler.success(res, updated);
    } catch (error) {
      console.error('[CategoryController] Erreur update:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const category = await this.getByIdOr404(req.params.id, res);
      if (!category) return;

      await this.handleImageDeletion(category);
      await this.handleWooCommerceDelete(category);

      const result = await deleteCategory(category);
      return ResponseHandler.success(res, result);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

// 🔁 Route personnalisée : arborescence hiérarchique
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

const exportController = require('../utils/exportController');

module.exports = {
  ...exportController(categoryController, [
    'getAll',
    'getById',
    'create',
    'update',
    'delete',
    'uploadImage',
    'updateImageMetadata',
    'deleteImage',
  ]),
  getHierarchicalCategories,
};
