// controllers/categoryController.js
const BaseController = require('./base/BaseController');
const Category = require('../models/Category');
const categoryWooCommerceService = require('../services/CategoryWooCommerceService');
const { calculateLevel } = require('../utils/categoryHelpers');

class CategoryController extends BaseController {
  constructor() {
    const imageOptions = {
      entity: 'categories',
      type: 'single',
    };
    super(Category, categoryWooCommerceService, imageOptions);
  }

  async create(req, res) {
    try {
      const level = await calculateLevel(req.body.parent_id);
      req.body.level = level;
      await super.create(req, res);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      if (req.body.parent_id) {
        const level = await calculateLevel(req.body.parent_id);
        req.body.level = level;
      }
      await super.update(req, res);
    } catch (error) {
      res.status(500).json({ error: error.message });
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
