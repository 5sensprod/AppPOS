// AppServer/controllers/PresetImageController.js
const PresetImageHandler = require('../models/images/PresetImageHandler');
const ResponseHandler = require('../handlers/ResponseHandler');
const UserPresetModel = require('../models/UserPresetModel');

class PresetImageController {
  constructor() {
    this.imageHandler = new PresetImageHandler();
    this.presetModel = new UserPresetModel();
  }

  /**
   * POST /api/presets/images/upload
   * Upload une ou plusieurs images pour les presets
   */
  async uploadImages(req, res) {
    try {
      const files = req.files || (req.file ? [req.file] : []);

      if (!files.length) {
        return ResponseHandler.badRequest(res, 'Aucune image fournie');
      }

      const uploadedImages = [];
      const errors = [];

      for (const file of files) {
        try {
          const imageData = await this.imageHandler.uploadImage(file);
          uploadedImages.push(imageData);
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error.message,
          });
        }
      }

      return ResponseHandler.success(res, {
        message: `${uploadedImages.length} image(s) uploadée(s)`,
        images: uploadedImages,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * GET /api/presets/images
   * Liste toutes les images disponibles
   */
  async listImages(req, res) {
    try {
      const images = await this.imageHandler.listImages();

      return ResponseHandler.success(res, {
        images,
        count: images.length,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * GET /api/presets/images/:filename
   * Obtient les informations d'une image spécifique
   */
  async getImageInfo(req, res) {
    try {
      const { filename } = req.params;
      const imageInfo = await this.imageHandler.getImageInfo(filename);

      if (!imageInfo.exists) {
        return ResponseHandler.notFound(res, 'Image non trouvée');
      }

      return ResponseHandler.success(res, imageInfo);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * DELETE /api/presets/images/:filename
   * Supprime une image de la bibliothèque
   */
  async deleteImage(req, res) {
    try {
      const { filename } = req.params;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      // Vérifier si l'image est utilisée dans des presets
      const allPresets = await this.presetModel.promisifyCall(this.presetModel.collection.find, {
        category: 'label_preset',
      });

      const imageInUse = allPresets.some((preset) => {
        const images = preset.preset_data?.style?.customImages || [];
        return images.some((img) => {
          const imgFilename =
            typeof img === 'string'
              ? img.split('/').pop()
              : img.filename || img.src?.split('/').pop();
          return imgFilename === filename;
        });
      });

      // Si l'image est utilisée et que l'utilisateur n'est pas admin
      if (imageInUse && !isAdmin) {
        return ResponseHandler.forbidden(res, 'Cette image est utilisée dans des presets');
      }

      const deleted = await this.imageHandler.deleteImage(filename);

      if (!deleted) {
        return ResponseHandler.notFound(res, 'Image non trouvée');
      }

      return ResponseHandler.success(res, {
        message: 'Image supprimée avec succès',
        filename,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * POST /api/presets/images/cleanup
   * Nettoie les images orphelines (admin uniquement)
   */
  async cleanupOrphanImages(req, res) {
    try {
      const isAdmin = req.user?.role === 'admin';

      if (!isAdmin) {
        return ResponseHandler.forbidden(res, 'Action réservée aux administrateurs');
      }

      // Récupérer toutes les images utilisées dans les presets
      const allPresets = await this.presetModel.promisifyCall(this.presetModel.collection.find, {
        category: 'label_preset',
      });

      const usedImages = new Set();
      allPresets.forEach((preset) => {
        const images = preset.preset_data?.style?.customImages || [];
        images.forEach((img) => {
          if (typeof img === 'string') {
            usedImages.add(img);
          } else if (img.filename) {
            usedImages.add(img.filename);
          } else if (img.src) {
            usedImages.add(img.src);
          }
        });
      });

      const result = await this.imageHandler.cleanupOrphanImages(Array.from(usedImages));

      return ResponseHandler.success(res, {
        message: `${result.deleted} image(s) orpheline(s) supprimée(s)`,
        ...result,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

module.exports = PresetImageController;
