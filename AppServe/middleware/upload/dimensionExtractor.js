// src/middleware/upload/dimensionExtractor.js
const fs = require('fs');

// Fonction pour obtenir les dimensions d'une image PNG
function getPngDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47)
    return null;

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

// Fonction pour obtenir les dimensions d'une image JPEG
function getJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let pos = 2;
  while (pos < buffer.length) {
    if (buffer[pos] !== 0xff) break;

    const marker = buffer[pos + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
      return {
        height: buffer.readUInt16BE(pos + 5),
        width: buffer.readUInt16BE(pos + 7),
      };
    }

    // Aller au prochain marqueur
    pos += 2 + buffer.readUInt16BE(pos + 2);
  }

  return null;
}

// Fonction générique pour obtenir les dimensions
function getImageDimensions(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);

    // Tester PNG
    const pngDimensions = getPngDimensions(buffer);
    if (pngDimensions) return pngDimensions;

    // Tester JPEG
    const jpegDimensions = getJpegDimensions(buffer);
    if (jpegDimensions) return jpegDimensions;

    // Format non supporté
    return null;
  } catch (error) {
    console.error('Erreur lors de la lecture du fichier image:', error);
    return null;
  }
}

function extractImageDimensions(req, res, next) {
  try {
    if (req.file) {
      console.log(`Traitement du fichier: ${req.file.path}`);
      const dimensions = getImageDimensions(req.file.path);
      if (dimensions) {
        req.file.dimensions = dimensions;
        console.log(`Dimensions extraites: ${dimensions.width}x${dimensions.height}`);
      } else {
        console.log("Impossible d'extraire les dimensions");
      }
    }

    if (req.files && Array.isArray(req.files)) {
      console.log(`Traitement de ${req.files.length} fichiers`);
      req.files.forEach((file) => {
        console.log(`Traitement du fichier: ${file.path}`);
        const dimensions = getImageDimensions(file.path);
        if (dimensions) {
          file.dimensions = dimensions;
          console.log(`Dimensions extraites: ${dimensions.width}x${dimensions.height}`);
        } else {
          console.log(`Impossible d'extraire les dimensions pour ${file.path}`);
        }
      });
    }

    next();
  } catch (error) {
    console.error("Erreur lors de l'extraction des dimensions:", error);
    next();
  }
}

module.exports = extractImageDimensions;
