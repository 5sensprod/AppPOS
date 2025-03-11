const ResponseHandler = require('../../handlers/ResponseHandler');
const BaseImageController = require('../image/BaseImageController');
const fs = require('fs').promises;
const path = require('path');
const websocketManager = require('../../websocket/websocketManager');

class BaseController {
  constructor(model, wooCommerceService, imageOptions = null) {
    if (!model) {
      throw new Error('Un modèle est requis pour le contrôleur de base');
    }

    this.model = model;
    this.wooCommerceService = wooCommerceService;

    // Standardisation : toujours en pluriel
    const singularName = model.constructor.name.toLowerCase().replace('model', '');
    this.entityName = singularName.endsWith('s') ? singularName : `${singularName}s`;

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

  async create(req, res) {
    try {
      const newItem = await this.model.create(req.body);

      // Standardisation des notifications WebSocket (toujours pluriel)
      websocketManager.notifyEntityCreated(this.entityName, newItem);

      if (this.shouldSync() && this.wooCommerceService) {
        try {
          const syncResult = await this.wooCommerceService.syncToWooCommerce([newItem]);
          if (syncResult.errors.length > 0) {
            return ResponseHandler.partialSuccess(res, newItem, {
              message: syncResult.errors.join(', '),
            });
          }
        } catch (syncError) {
          return ResponseHandler.partialSuccess(res, newItem, syncError);
        }
      }

      return ResponseHandler.created(res, newItem);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const id = req.params.id;
      const updateData = req.body;

      const existing = await this.model.findById(id);
      if (!existing) return ResponseHandler.notFound(res);

      if (existing.woo_id) {
        updateData.pending_sync = true;
      }

      const updated = await this.model.update(id, updateData);
      const updatedItem = await this.model.findById(id);

      // Standardisation des notifications WebSocket
      websocketManager.notifyEntityUpdated(this.entityName, id, updatedItem);

      if (this.shouldSync() && this.wooCommerceService) {
        try {
          await this.wooCommerceService.syncToWooCommerce([updatedItem]);
          await this.model.update(id, { pending_sync: false });
        } catch (syncError) {
          return ResponseHandler.partialSuccess(res, updated, syncError);
        }
      }

      return ResponseHandler.success(res, updated);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const item = await this.model.findById(req.params.id);
      if (!item) return ResponseHandler.notFound(res);

      await this.handleImageDeletion(item);
      await this.handleWooCommerceDelete(item);
      await this.model.delete(req.params.id);

      // Standardisation des notifications WebSocket
      websocketManager.notifyEntityDeleted(this.entityName, req.params.id);

      return ResponseHandler.success(res, { message: 'Item deleted successfully' });
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
    if (!this.shouldSync() || !this.wooCommerceService) return;

    try {
      const entityType = this.model.constructor.name.toLowerCase();
      const deleteMethod = {
        brands: 'deleteBrand',
        categories: 'deleteCategory',
        products: 'deleteProduct',
      }[this.entityName];

      if (deleteMethod && typeof this.wooCommerceService[deleteMethod] === 'function') {
        await this.wooCommerceService[deleteMethod](item._id);
      } else {
        console.error(`Méthode de suppression non trouvée pour l'entité ${this.entityName}`);
      }
    } catch (error) {
      console.error('Erreur suppression WooCommerce:', error);
      throw error;
    }
  }

  shouldSync() {
    return process.env.SYNC_ON_CHANGE === 'true';
  }
}

module.exports = BaseController;
