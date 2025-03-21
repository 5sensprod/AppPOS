const ResponseHandler = require('../../handlers/ResponseHandler');
const BaseImageController = require('../image/BaseImageController');
const fs = require('fs').promises;
const path = require('path');
const { getEntityEventService } = require('../../services/events/entityEvents');

class BaseController {
  constructor(model, wooCommerceService, imageOptions = null) {
    if (!model) {
      throw new Error('Un modèle est requis pour le contrôleur de base');
    }

    this.model = model;
    this.wooCommerceService = wooCommerceService;

    // Standardisation : toujours en pluriel
    const singularName = model.constructor.name.toLowerCase().replace('model', '');
    const entityMap = {
      category: 'categories',
      supplier: 'suppliers',
    };
    this.entityName =
      entityMap[singularName] || (singularName.endsWith('s') ? singularName : `${singularName}s`);

    this.eventService = getEntityEventService(this.entityName);

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

      // Utiliser le service d'événements
      this.eventService.created(newItem);

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

      await this.model.update(id, updateData);
      const updatedItem = await this.model.findById(id);

      // Utiliser le service d'événements
      this.eventService.updated(id, updatedItem);

      if (this.shouldSync() && this.wooCommerceService) {
        try {
          await this.wooCommerceService.syncToWooCommerce([updatedItem]);
          await this.model.update(id, { pending_sync: false });
        } catch (syncError) {
          return ResponseHandler.partialSuccess(res, updatedItem, syncError);
        }
      }

      return ResponseHandler.success(res, updatedItem);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const item = await this.model.findById(req.params.id);
      if (!item) return ResponseHandler.notFound(res);

      // Sauvegarder l'ID WooCommerce avant suppression
      const wooId = item.woo_id;

      // Supprimer les images associées
      await this.handleImageDeletion(item);

      // Supprimer l'entité sur WooCommerce si elle y existe
      if (wooId) {
        try {
          await this.handleWooCommerceDelete(item);
          console.log(
            `Entité ${this.entityName} (ID: ${req.params.id}) supprimée sur WooCommerce (woo_id: ${wooId})`
          );
        } catch (wcError) {
          console.error(`Erreur lors de la suppression sur WooCommerce:`, wcError);
          // On continue malgré l'erreur pour supprimer en local
        }
      }

      // Supprimer l'entité dans la base de données
      await this.model.delete(req.params.id);

      // Utiliser le service d'événements
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

    try {
      const entityType = this.entityName;

      // Service WooCommerce approprié selon le type d'entité
      let wooService;
      let deleteMethod;

      switch (entityType) {
        case 'products':
          wooService = require('../../services/ProductWooCommerceService');
          deleteMethod = 'deleteProduct';
          break;
        case 'categories':
          wooService = require('../../services/CategoryWooCommerceService');
          deleteMethod = 'deleteCategory';
          break;
        case 'brands':
          wooService = require('../../services/BrandWooCommerceService');
          deleteMethod = 'deleteBrand';
          break;
        default:
          console.error(`Type d'entité non géré pour la suppression: ${entityType}`);
          return;
      }

      // Appel de la méthode de suppression
      if (wooService && typeof wooService[deleteMethod] === 'function') {
        await wooService[deleteMethod](item._id);
        console.log(`${entityType} ${item._id} supprimé de WooCommerce`);
      }
    } catch (error) {
      console.error(`Erreur lors de la suppression WooCommerce (${this.entityName}):`, error);
      throw error;
    }
  }

  shouldSync() {
    return false;
  }
}

module.exports = BaseController;
