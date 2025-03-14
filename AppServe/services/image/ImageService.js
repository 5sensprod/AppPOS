// src/services/image/ImageService.js
const path = require('path');
const fs = require('fs').promises;
const GalleryImage = require('../../models/images/GalleryImage');
const SingleImage = require('../../models/images/SingleImage');
const WordPressImageSync = require('./WordPressImageSync');
const { v4: uuidv4 } = require('uuid');

class ImageService {
  constructor(entity, type = 'single') {
    this.entity = entity;
    this.imageHandler = type === 'gallery' ? new GalleryImage(entity) : new SingleImage(entity);
    this.wpSync = new WordPressImageSync();
  }

  async processUpload(files, entityId, options = {}) {
    try {
      const Model = this._getModelByEntity();
      const item = await Model.findById(entityId);
      if (!item) throw new Error(`${this.entity} non trouvé`);

      const uploadedImages = [];
      const filesToProcess = Array.isArray(files) ? files : [files];

      // Limiter le nombre de fichiers selon le type (single ou gallery)
      if (this.imageHandler.isGallery === false && filesToProcess.length > 1) {
        console.log(
          `[WS-DEBUG] Type 'single' - Limitation à un seul fichier (${filesToProcess.length} fournis)`
        );
        filesToProcess.length = 1;
      }

      // Pour le type 'single', sauvegarder l'ancienne image pour suppression ultérieure
      let oldImage = null;
      let oldImagePath = null;

      if (!this.imageHandler.isGallery && item.image) {
        oldImage = { ...item.image };

        // Si le chemin local est manquant, essayer de le reconstruire à partir du src
        if (!oldImage.local_path && oldImage.src) {
          // Typiquement, src est au format: /public/categories/ID/filename.jpg
          const srcParts = oldImage.src.split('/');
          if (srcParts.length >= 4) {
            const filename = srcParts[srcParts.length - 1];
            oldImagePath = path.join(process.cwd(), 'public', this.entity, entityId, filename);
            console.log(`[WS-DEBUG] Chemin local reconstruit à partir du src: ${oldImagePath}`);
          }
        } else if (oldImage.local_path) {
          oldImagePath = oldImage.local_path;
          console.log(`[WS-DEBUG] Chemin local existant trouvé: ${oldImagePath}`);
        }
      }

      // Traitement des nouvelles images (partie inchangée)
      for (const file of filesToProcess) {
        const imageData = await this.imageHandler.upload(file, entityId);
        imageData._id = uuidv4();

        if (this.entity !== 'suppliers' && options.syncToWordPress) {
          const wpData = await this.wpSync.uploadToWordPress(imageData.local_path);
          uploadedImages.push({
            _id: imageData._id,
            src: imageData.src,
            local_path: imageData.local_path,
            status: 'active',
            type: imageData.type,
            metadata: imageData.metadata,
            wp_id: wpData.id,
            url: wpData.url,
          });
        } else {
          uploadedImages.push(imageData);
        }
      }

      // Mise à jour de l'entité (partie inchangée)
      if (uploadedImages.length > 0) {
        const updateData = {};

        if (!this.imageHandler.isGallery) {
          updateData.image = { ...uploadedImages[0], status: 'active' };
          updateData.gallery_images = [];
        } else {
          if (!item.image && uploadedImages.length > 0) {
            updateData.image = { ...uploadedImages[0], status: 'active' };
          }

          const allImages = [...(item.gallery_images || []), ...uploadedImages];
          const uniqueImages = [];
          const pathsAdded = new Set();

          for (const img of allImages) {
            if (!pathsAdded.has(img.local_path)) {
              if (!img._id) {
                img._id = uuidv4();
              }
              uniqueImages.push({ ...img, status: 'active' });
              pathsAdded.add(img.local_path);
            }
          }

          updateData.gallery_images = uniqueImages;
        }

        // Mettre à jour l'entité avec la nouvelle image
        await Model.update(entityId, updateData);

        // SECTION CORRIGÉE: Suppression de l'ancienne image
        if (!this.imageHandler.isGallery && oldImage) {
          try {
            // Supprimer l'ancienne image de WordPress si elle existe
            if (oldImage.wp_id && this.entity !== 'suppliers') {
              try {
                console.log(
                  `[WS-DEBUG] Suppression de l'ancienne image WordPress wp_id: ${oldImage.wp_id}`
                );
                await this.wpSync.deleteFromWordPress(oldImage.wp_id);
              } catch (wpError) {
                console.error(
                  `[WS-DEBUG] Erreur lors de la suppression WordPress:`,
                  wpError.message
                );
              }
            }

            // Supprimer le fichier local si nous avons un chemin
            if (oldImagePath) {
              try {
                console.log(
                  `[WS-DEBUG] Tentative de suppression du fichier local: ${oldImagePath}`
                );

                // Vérifier si le fichier existe
                try {
                  await fs.access(oldImagePath);
                  console.log(`[WS-DEBUG] Le fichier existe, suppression...`);
                  await fs.unlink(oldImagePath);
                  console.log(`[WS-DEBUG] Fichier supprimé avec succès!`);
                } catch (accessError) {
                  if (accessError.code === 'ENOENT') {
                    console.log(`[WS-DEBUG] Le fichier n'existe pas: ${oldImagePath}`);

                    // Essayer avec un chemin alternatif
                    let alternativePath = null;

                    // Alternative 1: Utiliser juste le nom de fichier
                    if (path.isAbsolute(oldImagePath)) {
                      const filename = path.basename(oldImagePath);
                      alternativePath = path.join(
                        process.cwd(),
                        'public',
                        this.entity,
                        entityId,
                        filename
                      );

                      console.log(
                        `[WS-DEBUG] Tentative avec chemin alternatif: ${alternativePath}`
                      );

                      try {
                        await fs.access(alternativePath);
                        await fs.unlink(alternativePath);
                        console.log(`[WS-DEBUG] Fichier supprimé avec chemin alternatif!`);
                      } catch (altError) {
                        console.log(`[WS-DEBUG] Échec avec chemin alternatif: ${altError.message}`);
                      }
                    }
                  } else {
                    console.error(`[WS-DEBUG] Erreur d'accès au fichier:`, accessError.message);
                  }
                }
              } catch (fsError) {
                console.error(
                  `[WS-DEBUG] Erreur lors de la suppression du fichier local:`,
                  fsError
                );
              }
            } else {
              // Si nous n'avons pas de chemin spécifique, essayons de nettoyer le répertoire
              console.log(
                `[WS-DEBUG] Pas de chemin précis pour l'ancienne image, nettoyage du répertoire`
              );
              await this.cleanupDirectoryForEntity(entityId);
            }
          } catch (error) {
            console.error(
              `[WS-DEBUG] Erreur générale lors de la suppression de l'ancienne image:`,
              error
            );
          }
        }

        // Synchronisation avec WooCommerce (partie inchangée)
        if (false) {
          const service = require('../ProductWooCommerceService');
          const updatedDoc = await Model.findById(entityId);
          await service.syncToWooCommerce(updatedDoc);
        }
      }

      return { message: 'Images téléversées avec succès', data: uploadedImages };
    } catch (error) {
      if (files) {
        const toClean = Array.isArray(files) ? files : [files];
        for (const file of toClean) {
          if (file.path) await this._cleanup(file.path).catch(console.error);
        }
      }
      throw error;
    }
  }

  async cleanupDirectoryForEntity(entityId) {
    try {
      console.log(`[WS-DEBUG] Nettoyage du répertoire pour ${this.entity} ID: ${entityId}`);

      // 1. Récupérer l'entité actuelle pour connaître les fichiers à conserver
      const Model = this._getModelByEntity();
      const item = await Model.findById(entityId);

      if (!item) {
        console.log(`[WS-DEBUG] Entité ${entityId} non trouvée, nettoyage du répertoire entier`);
        // Si l'entité n'existe plus, on peut supprimer tout le répertoire
        const entityDir = path.join(process.cwd(), 'public', this.entity, entityId);
        try {
          await fs.rm(entityDir, { recursive: true, force: true });
          console.log(`[WS-DEBUG] Répertoire supprimé: ${entityDir}`);
          return {
            success: true,
            message: 'Répertoire supprimé (entité inexistante)',
            deleted: true,
          };
        } catch (rmError) {
          if (rmError.code !== 'ENOENT') {
            console.error(`[WS-DEBUG] Erreur suppression répertoire:`, rmError);
          }
          return { success: false, error: rmError.message };
        }
      }

      // 2. Identifier les fichiers actuellement utilisés
      const filesToKeep = new Set();

      // Extraire le nom de fichier à partir d'un chemin ou d'une URL
      const extractFilename = (path) => {
        if (!path) return null;
        const parts = path.split('/');
        return parts[parts.length - 1];
      };

      // Vérifier l'image principale
      if (item.image) {
        if (item.image.local_path) {
          filesToKeep.add(path.basename(item.image.local_path));
        } else if (item.image.src) {
          const filename = extractFilename(item.image.src);
          if (filename) filesToKeep.add(filename);
        }
      }

      // Vérifier les images de galerie
      if (item.gallery_images && item.gallery_images.length > 0) {
        for (const img of item.gallery_images) {
          if (img.local_path) {
            filesToKeep.add(path.basename(img.local_path));
          } else if (img.src) {
            const filename = extractFilename(img.src);
            if (filename) filesToKeep.add(filename);
          }
        }
      }

      console.log(`[WS-DEBUG] Fichiers à conserver: ${Array.from(filesToKeep).join(', ')}`);

      // 3. Lire le répertoire et supprimer les fichiers non utilisés
      const entityDir = path.join(process.cwd(), 'public', this.entity, entityId);
      let deleted = 0;

      try {
        const files = await fs.readdir(entityDir);
        console.log(`[WS-DEBUG] Fichiers trouvés dans le répertoire: ${files.join(', ')}`);

        for (const file of files) {
          // Si ce n'est pas un fichier à conserver, le supprimer
          if (!filesToKeep.has(file)) {
            try {
              const filePath = path.join(entityDir, file);
              console.log(`[WS-DEBUG] Suppression du fichier inutilisé: ${filePath}`);
              await fs.unlink(filePath);
              deleted++;
            } catch (unlinkError) {
              console.error(`[WS-DEBUG] Erreur lors de la suppression de ${file}:`, unlinkError);
            }
          }
        }

        console.log(`[WS-DEBUG] ${deleted} fichiers supprimés sur ${files.length} trouvés`);

        // Si tous les fichiers ont été supprimés, on peut supprimer le répertoire
        if (deleted === files.length && files.length > 0) {
          try {
            await fs.rmdir(entityDir);
            console.log(`[WS-DEBUG] Répertoire vide supprimé: ${entityDir}`);
          } catch (rmdirError) {
            console.error(`[WS-DEBUG] Erreur lors de la suppression du répertoire:`, rmdirError);
          }
        }

        return {
          success: true,
          message: `Nettoyage terminé pour ${this.entity} ID: ${entityId}`,
          deleted,
          total: files.length,
        };
      } catch (readError) {
        if (readError.code === 'ENOENT') {
          console.log(`[WS-DEBUG] Le répertoire n'existe pas: ${entityDir}`);
          return { success: true, message: 'Aucun répertoire à nettoyer', deleted: 0 };
        }
        throw readError;
      }
    } catch (error) {
      console.error(`[WS-DEBUG] Erreur lors du nettoyage du répertoire:`, error);
      return { success: false, error: error.message };
    }
  }

  async _handleExistingImage(existingImage, entityId) {
    // Supprimer l'image de WordPress si elle existe
    if (existingImage.wp_id && this.entity !== 'suppliers') {
      try {
        await this.wpSync.deleteFromWordPress(existingImage.wp_id);
      } catch (error) {
        // Ignorer l'erreur 404, logger les autres
        if (!error.message.includes('404')) {
          console.error('Erreur suppression WordPress:', error);
        }
      }
    }

    // Supprimer le fichier local s'il existe
    if (existingImage.local_path) {
      try {
        await fs.access(existingImage.local_path);
        await fs.unlink(existingImage.local_path);
      } catch (error) {
        // Ignorer l'erreur si le fichier n'existe pas
        if (error.code !== 'ENOENT') {
          console.error('Erreur suppression fichier local:', error);
        }
      }
    }

    // Nettoyer le dossier si nécessaire
    try {
      const imageDir = path.join(process.cwd(), 'public', this.entity, entityId);
      const exists = await fs
        .access(imageDir)
        .then(() => true)
        .catch(() => false);

      if (exists) {
        const files = await fs.readdir(imageDir);
        if (files.length === 0) {
          await fs.rmdir(imageDir);
        }
      }
    } catch (error) {
      console.warn('Avertissement nettoyage dossier:', error.message);
    }
  }

  async _updateEntityWithNewImage(item, updatedImageData, Model) {
    // S'assurer que l'image a un _id
    if (!updatedImageData._id) {
      updatedImageData._id = uuidv4();
    }

    const updateData = this.imageHandler.isGallery
      ? { gallery_images: [...(item.gallery_images || []), updatedImageData] }
      : { image: updatedImageData };

    try {
      // Mettre à jour l'entité locale
      await Model.update(item._id, updateData);

      // Synchroniser avec WooCommerce si nécessaire
      if (false) {
        const service = this._getWooCommerceService();
        if (service) {
          const updatedDoc = await Model.findById(item._id);
          await service.syncToWooCommerce(updatedDoc);
        }
      }
    } catch (error) {
      console.error('Erreur mise à jour entité:', error);
      throw error;
    }
  }

  _getModelByEntity() {
    return this.entity === 'products'
      ? require('../../models/Product')
      : this.entity === 'categories'
        ? require('../../models/Category')
        : this.entity === 'brands'
          ? require('../../models/Brand')
          : require('../../models/Supplier');
  }

  _getWooCommerceService() {
    try {
      return this.entity === 'products'
        ? require('../ProductWooCommerceService')
        : this.entity === 'categories'
          ? require('../CategoryWooCommerceService')
          : this.entity === 'brands'
            ? require('../BrandWooCommerceService')
            : null;
    } catch (error) {
      console.error('Service WooCommerce non trouvé:', error);
      return null;
    }
  }

  async updateMetadata(entityId, metadata) {
    try {
      // 1. Mise à jour locale
      const updatedImage = await this.imageHandler.update(entityId, metadata);

      // 2. Synchronisation WordPress si applicable
      if (updatedImage.wp_id && metadata.status && this.entity !== 'suppliers') {
        try {
          await this.wpSync.updateMetadata(updatedImage.wp_id, metadata);
        } catch (error) {
          console.error('Erreur mise à jour WordPress:', error);
          updatedImage.sync_error = error.message;
        }
      }

      return updatedImage;
    } catch (error) {
      throw new Error(`Erreur mise à jour métadonnées: ${error.message}`);
    }
  }

  async deleteImage(entityId, imageData) {
    try {
      // 1. Suppression WordPress si applicable
      if (imageData?.wp_id && this.entity !== 'suppliers') {
        try {
          await this.wpSync.deleteFromWordPress(imageData.wp_id);
        } catch (error) {
          console.error('Erreur suppression WordPress:', error);
        }
      }

      // 2. Suppression locale (toujours effectuée)
      await this.imageHandler.delete(entityId);
      return true;
    } catch (error) {
      throw new Error(`Erreur suppression image: ${error.message}`);
    }
  }

  async deleteGalleryImage(entityId, imageId, options = { localOnly: false }) {
    try {
      const Model = this._getModelByEntity();
      const item = await Model.findById(entityId);

      if (!item) throw new Error(`Entité non trouvée`);

      // Rechercher l'image par _id uniquement
      const imageToDelete = item.gallery_images?.find((img) => img._id === imageId);

      if (!imageToDelete) throw new Error(`Image non trouvée`);

      // En mode localOnly, on ne supprime PAS l'image sur WordPress
      // Mais on conserve l'information de cette image dans un champ temporaire
      if (options.localOnly) {
        console.log(`[WS-DEBUG] Mode localOnly activé - Suppression WordPress ignorée`);
      }
      // Uniquement si NOT localOnly, on supprime sur WordPress
      else if (imageToDelete.wp_id && this.entity !== 'suppliers') {
        try {
          await this.wpSync.deleteFromWordPress(imageToDelete.wp_id);
          console.log(`[WS-DEBUG] Image supprimée sur WordPress (wp_id: ${imageToDelete.wp_id})`);
        } catch (error) {
          console.error(`[WS-DEBUG] ERREUR lors de la suppression WordPress:`, error.message);
        }
      }

      // Suppression du fichier local uniquement (pas WordPress)
      if (imageToDelete.local_path) {
        try {
          await fs.access(imageToDelete.local_path);
          await fs.unlink(imageToDelete.local_path);
          console.log(`[WS-DEBUG] Fichier local supprimé: ${imageToDelete.local_path}`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error('Erreur suppression fichier local:', error);
          }
        }
      }

      // Mise à jour des données locales
      const updateData = {
        gallery_images: item.gallery_images.filter((img) => img._id !== imageId),
      };

      // Si c'est aussi l'image principale, la supprimer ou la remplacer
      if (
        item.image &&
        (item.image._id === imageId ||
          (item.image.local_path && item.image.local_path === imageToDelete.local_path))
      ) {
        // Si d'autres images existent dans la galerie, utiliser la première comme principale
        if (updateData.gallery_images.length > 0) {
          updateData.image = { ...updateData.gallery_images[0] };
        } else {
          updateData.image = null;
        }
      }

      // Marquer comme nécessitant une synchronisation si localOnly est activé
      if (options.localOnly && item.woo_id) {
        updateData.pending_sync = true;
      }

      await Model.update(entityId, updateData);

      // Synchronisation WooCommerce après la mise à jour locale SEULEMENT si localOnly n'est pas actif
      if (false) {
        const service = this._getWooCommerceService();
        if (service) {
          const updatedDoc = await Model.findById(entityId);
          await service.syncToWooCommerce(updatedDoc);
          console.log(`[WS-DEBUG] Synchronisation WooCommerce effectuée automatiquement`);
        }
      }

      return true;
    } catch (error) {
      throw new Error(`Erreur suppression: ${error.message}`);
    }
  }

  async resyncImage(imageData) {
    if (!imageData.local_path) {
      throw new Error('Chemin local requis pour la resynchronisation');
    }

    if (this.entity === 'suppliers') {
      throw new Error('Resynchronisation non disponible pour les fournisseurs');
    }

    try {
      const wpData = await this.wpSync.uploadToWordPress(imageData.local_path);
      return {
        ...imageData,
        wp_id: wpData.id,
        status: 'active',
        sync_error: null,
      };
    } catch (error) {
      throw new Error(`Erreur de resynchronisation: ${error.message}`);
    }
  }

  async _cleanup(filePath) {
    if (!filePath) return;
    try {
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      if (exists) {
        await fs.unlink(filePath);
      }
    } catch (error) {
      console.error('Erreur nettoyage fichier temporaire:', error);
    }
  }
}

module.exports = ImageService;
