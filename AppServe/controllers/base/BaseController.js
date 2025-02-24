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

    if (imageOptions?.entity) {
      this.imageController = new BaseImageController(imageOptions.entity, {
        type: imageOptions.type || 'single',
      });
      this.setupImageHandlers();
    }
  }

  setupImageHandlers() {
    this.uploadImage = this.imageController.uploadImage.bind(this.imageController);
    this.updateImageMetadata = this.imageController.updateImageMetadata.bind(this.imageController);
    this.deleteImage = this.imageController.deleteImage.bind(this.imageController);
    this.setMainImage = this.imageController.setMainImage.bind(this.imageController); // Ajout de cette ligne
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
      const updated = await this.model.update(req.params.id, req.body);
      if (!updated) return ResponseHandler.notFound(res);

      if (this.shouldSync() && this.wooCommerceService) {
        const updatedItem = await this.model.findById(req.params.id);
        try {
          await this.wooCommerceService.syncToWooCommerce([updatedItem]);
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
      // Détecter le type d'entité et appeler la bonne méthode de suppression
      const entityType = this.model.constructor.name.toLowerCase();
      const deleteMethod = {
        brand: 'deleteBrand',
        category: 'deleteCategory',
        product: 'deleteProduct',
      }[entityType];

      if (deleteMethod && typeof this.wooCommerceService[deleteMethod] === 'function') {
        await this.wooCommerceService[deleteMethod](item._id);
      } else {
        console.error(`Méthode de suppression non trouvée pour l'entité ${entityType}`);
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
