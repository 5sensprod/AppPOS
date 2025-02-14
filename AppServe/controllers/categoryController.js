const BaseController = require('./base/BaseController');
const Category = require('../models/Category');
const woocommerceService = require('../services/woocommerceService');
const { calculateLevel } = require('../utils/categoryHelpers');
const BaseImageController = require('./image/BaseImageController');

class CategoryController extends BaseController {
  constructor() {
    super(Category, woocommerceService);
    this.imageController = new BaseImageController('categories');
    this.uploadImage = this.imageController.uploadImage.bind(this.imageController);
    this.updateImageMetadata = this.imageController.updateImageMetadata.bind(this.imageController);
    this.deleteImage = this.imageController.deleteImage.bind(this.imageController);
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
