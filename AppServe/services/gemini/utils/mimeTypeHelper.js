// services/gemini/utils/mimeTypeHelper.js

/**
 * Détermine le type MIME basé sur l'extension du fichier
 * @param {string} filePath Le chemin du fichier
 * @returns {string} Le type MIME correspondant
 */
function getMimeType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();

  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    tif: 'image/tiff',
  };

  return mimeTypes[ext] || 'image/jpeg';
}

module.exports = { getMimeType };
