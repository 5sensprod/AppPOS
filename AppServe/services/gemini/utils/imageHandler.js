// services/gemini/utils/imageHandler.js
const fs = require('fs');
const { getMimeType } = require('./mimeTypeHelper');

/**
 * Gère les opérations liées aux images pour l'API Gemini
 */
class ImageHandler {
  /**
   * Prépare les images pour être envoyées à l'API Gemini
   * @param {Array} filePaths Liste des chemins de fichiers
   * @returns {Array} Liste des objets d'images formatés pour l'API
   */
  static prepareImagesForApi(filePaths) {
    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return [];
    }

    const imageObjects = [];

    for (const filePath of filePaths) {
      try {
        if (!fs.existsSync(filePath)) {
          console.warn(`Le fichier ${filePath} n'existe pas`);
          continue;
        }

        const imageData = fs.readFileSync(filePath);
        const base64Image = imageData.toString('base64');

        imageObjects.push({
          inline_data: {
            mime_type: getMimeType(filePath),
            data: base64Image,
          },
        });
      } catch (error) {
        console.error(`Erreur lors du traitement de l'image ${filePath}:`, error);
      }
    }

    return imageObjects;
  }

  /**
   * Vérifie si un fichier est une image valide pour Gemini
   * @param {string} filePath Chemin du fichier
   * @returns {boolean} True si c'est une image valide
   */
  static isValidImage(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
      return false;
    }

    const mimeType = getMimeType(filePath);
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

    return validMimeTypes.includes(mimeType);
  }

  /**
   * Obtient les dimensions approximatives d'une image
   * @param {string} filePath Chemin du fichier
   * @returns {Object|null} Dimensions de l'image ou null si échec
   */
  static getImageSize(filePath) {
    // Cette fonction est un placeholder - pour une implémentation réelle,
    // vous pourriez utiliser une bibliothèque comme 'image-size' pour obtenir les dimensions
    // sans charger l'image complète

    // Retourner null pour l'instant
    return null;
  }
}

module.exports = { ImageHandler };
