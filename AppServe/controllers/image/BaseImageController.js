// controllers/image/BaseImageController.js
const ImageService = require('../../services/image/ImageService');
const ResponseHandler = require('../../handlers/ResponseHandler');

class BaseImageController {
  constructor(entity, options = { type: 'single' }) {
    this.validateOptions(options);
    this.imageService = new ImageService(entity, options.type);
  }

  validateOptions(options) {
    const validTypes = ['single', 'gallery'];
    if (!validTypes.includes(options.type)) {
      throw new Error(`Type d'image invalide. Valeurs autorisées : ${validTypes.join(', ')}`);
    }
  }

  validateAndGetFiles(req) {
    if ((!req.file && !req.files) || req.files?.length === 0) {
      throw new Error('Aucune image fournie');
    }
    return req.files || [req.file];
  }

  async processFiles(files, id) {
    return Promise.all(
      files.map((file) =>
        this.imageService.processUpload(file, id, {
          syncToWordPress: process.env.SYNC_ON_CHANGE === 'true',
        })
      )
    );
  }

  async uploadImage(req, res) {
    try {
      const files = this.validateAndGetFiles(req);
      const results = await this.processFiles(files, req.params.id);

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
      await this.imageService.deleteGalleryImage(id, imageId);
      return ResponseHandler.success(res, { message: 'Image supprimée de la galerie avec succès' });
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

      if (!item) {
        return ResponseHandler.error(res, new Error(`${this.imageService.entity} non trouvé`));
      }

      let targetImage = null;

      // Recherche uniquement par _id local ou index
      if (imageId) {
        // Recherche par _id (UUID) uniquement
        targetImage = item.gallery_images?.find((img) => img._id === imageId);
      } else if (imageIndex !== undefined) {
        // Mode local: recherche par index dans gallery_images
        targetImage = item.gallery_images?.[imageIndex];
      }

      if (!targetImage) {
        return ResponseHandler.error(res, new Error('Image non trouvée dans la galerie'));
      }

      // Mettre à jour l'image principale
      const updateData = {
        image: targetImage,
      };

      await Model.update(entityId, updateData);

      // Synchroniser avec WooCommerce si nécessaire
      if (this.imageService.entity === 'products' && process.env.SYNC_ON_CHANGE === 'true') {
        const service = require('../../services/ProductWooCommerceService');
        const updatedDoc = await Model.findById(entityId);
        await service.syncToWooCommerce(updatedDoc);
      }

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
