// base/BaseController.js
const ResponseHandler = require('../../handlers/ResponseHandler');
const BaseImageController = require('../image/BaseImageController');
const fs = require('fs').promises;
const path = require('path');
const { getEntityEventService } = require('../../services/events/entityEvents');

class BaseController {
  constructor(model, wooCommerceService, options = {}) {
    if (!model) throw new Error('Un modèle est requis pour le contrôleur de base');

    this.model = model;
    this.wooCommerceService = wooCommerceService;
    this.entityName = this.buildEntityName(model);
    this.eventService = getEntityEventService(this.entityName);

    if (options.image) {
      this.imageController = new BaseImageController(this.entityName, options.image);
      this.setupImageHandlers();
    }
  }

  buildEntityName(model) {
    const name = model.constructor.name.toLowerCase().replace('model', '');
    const entityMap = {
      category: 'categories',
      supplier: 'suppliers',
      brand: 'brands',
    };
    return entityMap[name] || (name.endsWith('s') ? name : `${name}s`);
  }

  setupImageHandlers() {
    this.uploadImage = this.imageController.uploadImage.bind(this.imageController);
    this.updateImageMetadata = this.imageController.updateImageMetadata.bind(this.imageController);
    this.deleteImage = this.imageController.deleteImage.bind(this.imageController);
    this.setMainImage = this.imageController.setMainImage.bind(this.imageController);
  }

  async getAll(req, res) {
    try {
      const items = await this.model.findAll();
      return ResponseHandler.success(res, items);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getById(req, res) {
    try {
      const item = await this.model.findById(req.params.id);
      if (!item) return ResponseHandler.notFound(res);
      return ResponseHandler.success(res, item);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getByIdOr404(id, res) {
    const item = await this.model.findById(id);
    if (!item) {
      ResponseHandler.notFound(res);
      return null;
    }
    return item;
  }

  async create(req, res) {
    try {
      const newItem = await this.model.create(req.body);
      this.eventService.created(newItem);

      const syncResponse = await this.syncIfNeeded([newItem], res);
      if (syncResponse) return syncResponse;

      return ResponseHandler.created(res, newItem);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const id = req.params.id;
      const updateData = { ...req.body };
      const existing = await this.getByIdOr404(id, res);
      if (!existing) return;

      if (existing.woo_id) updateData.pending_sync = true;

      await this.model.update(id, updateData);
      const updatedItem = await this.model.findById(id);

      this.eventService.updated(id, updatedItem);

      const syncResponse = await this.syncIfNeeded([updatedItem], res);
      if (syncResponse) return syncResponse;

      return ResponseHandler.success(res, updatedItem);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const item = await this.getByIdOr404(req.params.id, res);
      if (!item) return;

      const wooId = item.woo_id;

      await this.handleImageDeletion(item);

      if (wooId) {
        try {
          await this.handleWooCommerceDelete(item);
        } catch (wcError) {
          console.error(`Erreur lors de la suppression sur WooCommerce:`, wcError);
        }
      }

      await this.model.delete(req.params.id);
      this.eventService.deleted(req.params.id);

      return ResponseHandler.success(res, {
        message: 'Item deleted successfully',
        wooDeleteStatus: wooId ? 'completed' : 'not_applicable',
      });
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

  async handleWooCommerceDelete(item) {
    if (!item.woo_id) return;

    const deleteMap = {
      products: 'deleteProduct',
      categories: 'deleteCategory',
      brands: 'deleteBrand',
    };

    const method = deleteMap[this.entityName];
    if (!method) {
      console.warn(`Aucune méthode de suppression WooCommerce définie pour ${this.entityName}`);
      return;
    }

    try {
      const service = require(`../../services/${this.entityName.slice(0, -1)}WooCommerceService`);
      if (typeof service[method] === 'function') {
        await service[method](item._id);
      }
    } catch (error) {
      console.error(`Erreur WooCommerce (${this.entityName}):`, error);
      throw error;
    }
  }

  async syncIfNeeded(entities, res = null) {
    if (!this.shouldSync() || !this.wooCommerceService) return;
    try {
      const result = await this.wooCommerceService.syncToWooCommerce(entities);
      if (result.errors?.length > 0 && res) {
        return ResponseHandler.partialSuccess(res, entities[0], {
          message: result.errors.join(', '),
        });
      }
    } catch (err) {
      if (res) return ResponseHandler.partialSuccess(res, entities[0], err);
    }
  }

  shouldSync() {
    return false;
  }
}

module.exports = BaseController;
