// controllers/image/BaseImageController.js
const ImageService = require('../../services/image/ImageService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const websocketManager = require('../../websocket/websocketManager');

class BaseImageController {
  constructor(entity, options = { type: 'single' }) {
    this.validateOptions(options);
    this.imageService = new ImageService(entity, options.type);
    console.log(
      `[WS-DEBUG] BaseImageController initialisé pour l'entité: ${this.imageService.entity}`
    );
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
      console.log(
        `[WS-DEBUG] Début uploadImage pour ${this.imageService.entity} id:${req.params.id}`
      );

      const files = this.validateAndGetFiles(req);
      console.log(`[WS-DEBUG] Fichiers validés: ${files.length} fichier(s)`);

      const results = await this.processFiles(files, req.params.id);
      console.log(`[WS-DEBUG] Fichiers traités avec succès`);

      // Marquer le produit comme pending_sync s'il a un woo_id
      const Model = this.imageService._getModelByEntity();
      console.log(`[WS-DEBUG] Modèle récupéré: ${Model ? 'OK' : 'NULL'}`);

      const item = await Model.findById(req.params.id);
      console.log(`[WS-DEBUG] Item trouvé: ${item ? 'OK' : 'NULL'}`);

      if (item && item.woo_id) {
        await Model.update(req.params.id, { pending_sync: true });
        console.log(`[WS-DEBUG] Item marqué comme pending_sync`);
      }

      // Récupérer l'entité COMPLÈTE mise à jour pour WebSocket
      const updatedItem = await Model.findById(req.params.id);
      console.log(`[WS-DEBUG] Item mis à jour récupéré: ${updatedItem ? 'OK' : 'NULL'}`);

      // Avant notification
      console.log(`[WS-DEBUG] Prêt à envoyer notification:
        - entité: ${this.imageService.entity}
        - id: ${req.params.id}
        - a image?: ${updatedItem && updatedItem.image ? 'OUI' : 'NON'}`);

      try {
        // Notifier via WebSocket - utiliser le nom d'entité exact
        websocketManager.notifyEntityUpdated(this.imageService.entity, req.params.id, updatedItem);
        console.log(`[WS-DEBUG] Notification WebSocket envoyée avec succès`);
      } catch (wsError) {
        console.error(`[WS-DEBUG] ERREUR lors de la notification WebSocket:`, wsError);
      }

      return ResponseHandler.success(res, {
        message: 'Images téléversées avec succès',
        data: results,
      });
    } catch (error) {
      console.error(`[WS-DEBUG] ERREUR GÉNÉRALE dans uploadImage:`, error);
      return ResponseHandler.error(res, error);
    }
  }

  async updateImageMetadata(req, res) {
    try {
      console.log(
        `[WS-DEBUG] Début updateImageMetadata pour ${this.imageService.entity} id:${req.params.id}`
      );

      const updateData = await this.imageService.updateMetadata(req.params.id, req.body);
      console.log(`[WS-DEBUG] Métadonnées mises à jour avec succès`);

      return ResponseHandler.success(res, {
        message: 'Métadonnées mises à jour avec succès',
        data: updateData,
      });
    } catch (error) {
      console.error(`[WS-DEBUG] ERREUR dans updateImageMetadata:`, error);
      return ResponseHandler.error(res, error);
    }
  }

  async deleteImage(req, res) {
    try {
      console.log(
        `[WS-DEBUG] Début deleteImage pour ${this.imageService.entity} id:${req.params.id}`
      );

      await this.imageService.deleteImage(req.params.id);
      console.log(`[WS-DEBUG] Image supprimée au niveau du service`);

      // Marquer le produit comme pending_sync s'il a un woo_id
      const Model = this.imageService._getModelByEntity();
      console.log(`[WS-DEBUG] Modèle récupéré: ${Model ? 'OK' : 'NULL'}`);

      const item = await Model.findById(req.params.id);
      console.log(`[WS-DEBUG] Item trouvé: ${item ? 'OK' : 'NULL'}`);

      if (item && item.woo_id) {
        await Model.update(req.params.id, { pending_sync: true });
        console.log(`[WS-DEBUG] Item marqué comme pending_sync`);
      }

      // Récupérer l'entité mise à jour pour WebSocket
      const updatedItem = await Model.findById(req.params.id);
      console.log(`[WS-DEBUG] Item mis à jour récupéré: ${updatedItem ? 'OK' : 'NULL'}`);

      try {
        // Notifier via WebSocket de la mise à jour
        websocketManager.notifyEntityUpdated(this.imageService.entity, req.params.id, updatedItem);
        console.log(`[WS-DEBUG] Notification WebSocket envoyée avec succès`);
      } catch (wsError) {
        console.error(`[WS-DEBUG] ERREUR lors de la notification WebSocket:`, wsError);
      }

      return ResponseHandler.success(res, {
        message: 'Image supprimée avec succès',
      });
    } catch (error) {
      console.error(`[WS-DEBUG] ERREUR GÉNÉRALE dans deleteImage:`, error);
      return ResponseHandler.error(res, error);
    }
  }

  async deleteGalleryImage(req, res) {
    try {
      const { id, imageId } = req.params;
      console.log(
        `[WS-DEBUG] Début deleteGalleryImage pour ${this.imageService.entity} id:${id}, imageId:${imageId}`
      );

      await this.imageService.deleteGalleryImage(id, imageId);
      console.log(`[WS-DEBUG] Image de galerie supprimée au niveau du service`);

      // Marquer le produit comme pending_sync s'il a un woo_id
      const Model = this.imageService._getModelByEntity();
      console.log(`[WS-DEBUG] Modèle récupéré: ${Model ? 'OK' : 'NULL'}`);

      const item = await Model.findById(id);
      console.log(`[WS-DEBUG] Item trouvé: ${item ? 'OK' : 'NULL'}`);

      if (item && item.woo_id) {
        await Model.update(id, { pending_sync: true });
        console.log(`[WS-DEBUG] Item marqué comme pending_sync`);
      }

      // Récupérer l'entité mise à jour pour WebSocket
      const updatedItem = await Model.findById(id);
      console.log(`[WS-DEBUG] Item mis à jour récupéré: ${updatedItem ? 'OK' : 'NULL'}`);

      try {
        // Notifier via WebSocket de la mise à jour
        websocketManager.notifyEntityUpdated(this.imageService.entity, id, updatedItem);
        console.log(`[WS-DEBUG] Notification WebSocket envoyée avec succès`);
      } catch (wsError) {
        console.error(`[WS-DEBUG] ERREUR lors de la notification WebSocket:`, wsError);
      }

      return ResponseHandler.success(res, { message: 'Image supprimée de la galerie avec succès' });
    } catch (error) {
      console.error(`[WS-DEBUG] ERREUR GÉNÉRALE dans deleteGalleryImage:`, error);
      return ResponseHandler.error(res, error);
    }
  }

  async setMainImage(req, res) {
    try {
      const { id: entityId } = req.params;
      const { imageId, imageIndex } = req.body;

      console.log(`[WS-DEBUG] Début setMainImage pour ${this.imageService.entity} id:${entityId}
        - imageId: ${imageId}
        - imageIndex: ${imageIndex}`);

      const Model = this.imageService._getModelByEntity();
      console.log(`[WS-DEBUG] Modèle récupéré: ${Model ? 'OK' : 'NULL'}`);

      const item = await Model.findById(entityId);
      console.log(`[WS-DEBUG] Item trouvé: ${item ? 'OK' : 'NULL'}`);

      if (!item) {
        console.log(`[WS-DEBUG] Item non trouvé, sortie anticipée`);
        return ResponseHandler.error(res, new Error(`${this.imageService.entity} non trouvé`));
      }

      let targetImage = null;

      // Recherche par _id local uniquement
      if (imageId) {
        targetImage = item.gallery_images?.find((img) => img._id === imageId);
        console.log(`[WS-DEBUG] Image trouvée par ID: ${targetImage ? 'OK' : 'NULL'}`);
      } else if (imageIndex !== undefined) {
        targetImage = item.gallery_images?.[imageIndex];
        console.log(`[WS-DEBUG] Image trouvée par Index: ${targetImage ? 'OK' : 'NULL'}`);
      }

      if (!targetImage) {
        console.log(`[WS-DEBUG] Image cible non trouvée, sortie anticipée`);
        return ResponseHandler.error(res, new Error('Image non trouvée dans la galerie'));
      }

      // Mettre à jour l'image principale
      const updateData = {
        image: targetImage,
      };

      // Ajouter pending_sync si le produit a déjà un woo_id
      if (item.woo_id) {
        updateData.pending_sync = true;
      }

      console.log(`[WS-DEBUG] Mise à jour avec données:`, JSON.stringify(updateData));
      await Model.update(entityId, updateData);
      console.log(`[WS-DEBUG] Mise à jour réussie`);

      // Récupérer l'entité COMPLÈTE mise à jour pour WebSocket
      const updatedItem = await Model.findById(entityId);
      console.log(`[WS-DEBUG] Item mis à jour récupéré: ${updatedItem ? 'OK' : 'NULL'}`);

      // Avant notification
      console.log(`[WS-DEBUG] Prêt à envoyer notification:
        - entité: ${this.imageService.entity}
        - id: ${entityId}
        - a image?: ${updatedItem && updatedItem.image ? 'OUI' : 'NON'}`);

      try {
        // Notifier via WebSocket avec l'entité complète
        websocketManager.notifyEntityUpdated(this.imageService.entity, entityId, updatedItem);
        console.log(`[WS-DEBUG] Notification WebSocket envoyée avec succès`);
      } catch (wsError) {
        console.error(`[WS-DEBUG] ERREUR lors de la notification WebSocket:`, wsError);
      }

      // Synchroniser avec WooCommerce si nécessaire
      if (this.imageService.entity === 'product' && process.env.SYNC_ON_CHANGE === 'true') {
        try {
          console.log(`[WS-DEBUG] Tentative de synchronisation WooCommerce`);
          const service = require('../../services/ProductWooCommerceService');
          await service.syncToWooCommerce(updatedItem);
          console.log(`[WS-DEBUG] Synchronisation WooCommerce réussie`);
        } catch (syncError) {
          console.error(`[WS-DEBUG] ERREUR lors de la synchronisation WooCommerce:`, syncError);
        }
      }

      return ResponseHandler.success(res, {
        message: 'Image principale mise à jour avec succès',
        data: updateData.image,
      });
    } catch (error) {
      console.error(`[WS-DEBUG] ERREUR GÉNÉRALE dans setMainImage:`, error);
      return ResponseHandler.error(res, error);
    }
  }
}

module.exports = BaseImageController;
