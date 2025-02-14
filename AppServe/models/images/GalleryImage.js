// src/models/images/GalleryImage.js
const BaseImage = require('../base/BaseImage');
const path = require('path');
const fs = require('fs').promises;

class GalleryImage extends BaseImage {
  constructor() {
    super('products');
    this.maxFiles = 10; // Maximum d'images par produit
  }

  async upload(files, productId) {
    try {
      if (!Array.isArray(files)) {
        files = [files]; // Conversion en tableau si une seule image
      }

      // Vérification du nombre total d'images
      const existingImages = await this.getExistingImages(productId);
      if (existingImages.length + files.length > this.maxFiles) {
        throw new Error(`Maximum ${this.maxFiles} images autorisées par produit`);
      }

      const uploadedImages = [];
      for (const file of files) {
        this.validateFile(file);
        const imageData = await this.uploadImage(file, productId);

        // Ajout des propriétés spécifiques à la galerie
        imageData.is_primary = !existingImages.length && !uploadedImages.length; // Premier upload = image principale
        imageData.gallery_order = existingImages.length + uploadedImages.length;

        // Déplacement physique du fichier
        await fs.rename(file.path, imageData.local_path);
        uploadedImages.push(imageData);
      }

      return uploadedImages;
    } catch (error) {
      // Nettoyage des fichiers en cas d'erreur
      for (const file of files) {
        if (file.path) {
          await fs.unlink(file.path).catch(() => {});
        }
      }
      throw error;
    }
  }

  async getExistingImages(productId) {
    // À implémenter selon votre système de stockage
    // Doit retourner un tableau des images existantes pour le produit
    return [];
  }

  async reorderGallery(productId, imageIds) {
    const existingImages = await this.getExistingImages(productId);
    if (!existingImages.length) {
      throw new Error('Aucune image trouvée pour ce produit');
    }

    // Vérification que tous les IDs fournis correspondent à des images existantes
    const validIds = existingImages.map((img) => img.id);
    if (!imageIds.every((id) => validIds.includes(id))) {
      throw new Error("Certains IDs d'images sont invalides");
    }

    // Mise à jour de l'ordre
    const reorderedImages = imageIds.map((id, index) => {
      const image = existingImages.find((img) => img.id === id);
      return {
        ...image,
        gallery_order: index,
      };
    });

    return reorderedImages;
  }

  async setPrimaryImage(productId, imageId) {
    const existingImages = await this.getExistingImages(productId);
    if (!existingImages.length) {
      throw new Error('Aucune image trouvée pour ce produit');
    }

    // Vérification que l'image existe
    const targetImage = existingImages.find((img) => img.id === imageId);
    if (!targetImage) {
      throw new Error('Image non trouvée');
    }

    // Mise à jour du statut primary
    return existingImages.map((img) => ({
      ...img,
      is_primary: img.id === imageId,
    }));
  }

  async deleteImage(productId, imageId) {
    const existingImages = await this.getExistingImages(productId);
    const imageToDelete = existingImages.find((img) => img.id === imageId);

    if (!imageToDelete) {
      throw new Error('Image non trouvée');
    }

    // Suppression physique du fichier
    await super.deleteImage(imageToDelete.local_path);

    // Réorganisation des images restantes
    const remainingImages = existingImages
      .filter((img) => img.id !== imageId)
      .map((img, index) => ({
        ...img,
        gallery_order: index,
        is_primary: index === 0 ? true : false, // Premier devient primary si nécessaire
      }));

    return remainingImages;
  }

  async updateMetadata(productId, imageId, metadata) {
    const existingImages = await this.getExistingImages(productId);
    const imageToUpdate = existingImages.find((img) => img.id === imageId);

    if (!imageToUpdate) {
      throw new Error('Image non trouvée');
    }

    return super.updateMetadata(imageToUpdate, metadata);
  }
}

module.exports = GalleryImage;
