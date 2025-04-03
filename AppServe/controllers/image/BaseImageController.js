// controllers/image/BaseImageController.js
const ImageService = require('../../services/image/ImageService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const websocketManager = require('../../websocket/websocketManager');
const { getEntityEventService } = require('../../services/events/entityEvents');

class BaseImageController {
  constructor(entity, options = { type: 'single' }) {
    this.validateOptions(options);
    this.entityName = entity.endsWith('s') ? entity : `${entity}s`;
    this.imageService = new ImageService(this.entityName, options.type);
    this.eventService = getEntityEventService(this.entityName);
  }

  validateOptions(options) {
    const validTypes = ['single', 'gallery'];
    if (!validTypes.includes(options.type)) {
      throw new Error(`Type d'image invalide. Valeurs autorisées : ${validTypes.join(', ')}`);
    }
  }

  validateAndGetFiles(req) {
    if (!this.imageService.imageHandler.isGallery) {
      if (req.file) return [req.file];
      if (req.files && req.files.length > 0) return [req.files[0]];
      throw new Error('Aucune image fournie');
    }
    if ((!req.file && !req.files) || (req.files && req.files.length === 0)) {
      throw new Error('Aucune image fournie');
    }
    return req.files || [req.file];
  }

  async processFiles(files, id, syncOptions = { syncToWordPress: false }) {
    return Promise.all(files.map((file) => this.imageService.processUpload(file, id, syncOptions)));
  }

  async uploadImage(req, res) {
    try {
      const files = this.validateAndGetFiles(req);
      const syncOptions = {
        syncToWordPress: req.query.sync_wp === 'true',
      };

      const results = await this.processFiles(files, req.params.id, syncOptions);
      const Model = this.imageService._getModelByEntity();
      const item = await Model.findById(req.params.id);

      if (item?.woo_id) {
        await Model.update(req.params.id, { pending_sync: true });
      }

      const updatedItem = await Model.findById(req.params.id);
      this.eventService.imageUpdated(req.params.id, updatedItem);

      return ResponseHandler.success(res, {
        message: 'Images téléversées avec succès',
        data: results,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async updateImageMetadata(req, res) {
    try {
      const updateData = await this.imageService.updateMetadata(req.params.id, req.body);
      return ResponseHandler.success(res, {
        message: 'Métadonnées mises à jour avec succès',
        data: updateData,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async deleteImage(req, res) {
    try {
      await this.imageService.deleteImage(req.params.id);
      const Model = this.imageService._getModelByEntity();
      const item = await Model.findById(req.params.id);

      if (item?.woo_id) {
        await Model.update(req.params.id, { pending_sync: true });
      }

      const updatedItem = await Model.findById(req.params.id);
      this.eventService.imageUpdated(req.params.id, updatedItem);

      return ResponseHandler.success(res, {
        message: 'Image supprimée avec succès',
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async deleteGalleryImage(req, res) {
    try {
      const { id, imageId } = req.params;
      await this.imageService.deleteGalleryImage(id, imageId, { localOnly: true });
      const Model = this.imageService._getModelByEntity();
      const updatedItem = await Model.findById(id);

      websocketManager.notifyEntityUpdated(this.entityName, id, updatedItem);

      return ResponseHandler.success(res, {
        message: 'Image supprimée de la galerie localement avec succès',
        pendingSync: true,
        note: 'Pour mettre à jour WooCommerce, veuillez effectuer une synchronisation manuelle',
        data: updatedItem,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async setMainImage(req, res) {
    try {
      const { id: entityId } = req.params;
      const { imageId, imageIndex } = req.body;
      const Model = this.imageService._getModelByEntity();
      const item = await Model.findById(entityId);

      if (!item) return ResponseHandler.error(res, new Error(`${this.entityName} non trouvé`));

      let targetImage = imageId
        ? item.gallery_images?.find((img) => img._id === imageId)
        : item.gallery_images?.[imageIndex];

      if (!targetImage) {
        return ResponseHandler.error(res, new Error('Image non trouvée dans la galerie'));
      }

      const updateData = { image: targetImage };
      if (item.woo_id) updateData.pending_sync = true;

      await Model.update(entityId, updateData);
      const updatedItem = await Model.findById(entityId);

      websocketManager.notifyEntityUpdated(this.entityName, entityId, updatedItem);

      return ResponseHandler.success(res, {
        message: 'Image principale mise à jour avec succès',
        data: updateData.image,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

module.exports = BaseImageController;
