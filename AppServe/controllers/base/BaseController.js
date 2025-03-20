// controllers/base/BaseController.js
const ResponseHandler = require('../../handlers/ResponseHandler');
const BaseImageController = require('../image/BaseImageController');
const fs = require('fs').promises;
const path = require('path');

class BaseController {
  constructor(model, wooCommerceService, imageOptions = null) {
    if (!model) {
      throw new Error('Un modèle est requis pour le contrôleur de base');
    }

    this.model = model;
    this.wooCommerceService = wooCommerceService;

    const singularName = model.constructor.name.toLowerCase().replace('model', '');
    const entityMap = {
      category: 'categories',
      supplier: 'suppliers',
    };
    this.entityName =
      entityMap[singularName] || (singularName.endsWith('s') ? singularName : `${singularName}s`);

    if (imageOptions?.entity) {
      this.imageController = new BaseImageController(this.entityName, {
        type: imageOptions.type || 'single',
      });
      this.setupImageHandlers();
    }
  }

  setupImageHandlers() {
    this.uploadImage = this.imageController.uploadImage.bind(this.imageController);
    this.updateImageMetadata = this.imageController.updateImageMetadata.bind(this.imageController);
    this.deleteImage = this.imageController.deleteImage.bind(this.imageController);
    this.setMainImage = this.imageController.setMainImage.bind(this.imageController);
  }

  _getService() {
    throw new Error('_getService doit être implémenté dans les sous-classes');
  }

  async getAll(req, res) {
    try {
      const service = this._getService();
      const items = await service.findAll();
      return ResponseHandler.success(res, items);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getById(req, res) {
    try {
      const service = this._getService();
      const item = await service.findById(req.params.id);
      if (!item) return ResponseHandler.notFound(res);
      return ResponseHandler.success(res, item);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async create(req, res) {
    try {
      const service = this._getService();
      const newItem = await service.create(req.body);
      return ResponseHandler.created(res, newItem);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const service = this._getService();
      const updated = await service.update(req.params.id, req.body);
      return ResponseHandler.success(res, updated);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const service = this._getService();
      const item = await service.findById(req.params.id);
      if (!item) return ResponseHandler.notFound(res);

      // Supprimer les images associées
      await this.handleImageDeletion(item);

      // Supprimer l'entité
      const result = await service.delete(req.params.id);

      return ResponseHandler.success(res, result);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async handleImageDeletion(item) {
    const imageDir = path.join(process.cwd(), 'public', this.model.imageFolder, item._id);
    try {
      await fs.rm(imageDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Erreur suppression répertoire:', error);
    }
  }

  shouldSync() {
    return false;
  }
}

module.exports = BaseController;
