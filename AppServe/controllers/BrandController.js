// controllers/BrandController.js
const BaseController = require('./base/BaseController');
const Brand = require('../models/Brand');
const brandWooCommerceService = require('../services/BrandWooCommerceService');
const BaseImageController = require('./image/BaseImageController');

class BrandController extends BaseController {
  constructor() {
    super(Brand, brandWooCommerceService);
    this.imageController = new BaseImageController('brands');
    this.uploadImage = this.imageController.uploadImage.bind(this.imageController);
    this.updateImageMetadata = this.imageController.updateImageMetadata.bind(this.imageController);
    this.deleteImage = this.imageController.deleteImage.bind(this.imageController);
  }

  async getBySupplier(req, res) {
    try {
      const brands = await this.model.findBySupplier(req.params.supplierId);
      res.json(brands);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

const brandController = new BrandController();
module.exports = {
  getAll: brandController.getAll.bind(brandController),
  getById: brandController.getById.bind(brandController),
  create: brandController.create.bind(brandController),
  update: brandController.update.bind(brandController),
  delete: brandController.delete.bind(brandController),
  getBySupplier: brandController.getBySupplier.bind(brandController),
  uploadImage: brandController.uploadImage,
  updateImageMetadata: brandController.updateImageMetadata,
  deleteImage: brandController.deleteImage,
};
