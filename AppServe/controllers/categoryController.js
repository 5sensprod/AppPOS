// controllers/CategoryController.js
const BaseController = require('./base/BaseController');
const Category = require('../models/Category');
const categoryService = require('../services/CategoryService');
const ResponseHandler = require('../handlers/ResponseHandler');
const categoryWooCommerceService = require('../services/CategoryWooCommerceService');

class CategoryController extends BaseController {
  constructor() {
    super(Category, categoryWooCommerceService, {
      entity: 'categories',
      type: 'single',
    });
  }

  _getService() {
    return categoryService;
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
