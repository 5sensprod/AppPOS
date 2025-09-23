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

// Fonction pour obtenir les dimensions d'une image WebP
function getWebpDimensions(buffer) {
  // Vérifier la signature WebP
  if (buffer.length < 30) return null;

  // Vérifier les 4 premiers octets pour "RIFF"
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null;

  // Vérifier les octets 8-11 pour "WEBP"
  if (buffer.toString('ascii', 8, 12) !== 'WEBP') return null;

  // Lire le format WebP (VP8, VP8L, VP8X)
  const format = buffer.toString('ascii', 12, 16);

  try {
    if (format === 'VP8 ') {
      // Format VP8 (avec perte)
      if (buffer.length < 30) return null;

      // Aller directement au header VP8 après le chunk header
      const chunkSize = buffer.readUInt32LE(16);
      let pos = 20; // Position après le chunk header

      // Chercher le start code VP8 (0x9d 0x01 0x2a)
      for (let i = pos; i < Math.min(pos + 20, buffer.length - 10); i++) {
        if (buffer[i] === 0x9d && buffer[i + 1] === 0x01 && buffer[i + 2] === 0x2a) {
          // Les dimensions sont aux positions i+6 et i+8
          const width = buffer.readUInt16LE(i + 6) & 0x3fff;
          const height = buffer.readUInt16LE(i + 8) & 0x3fff;
          return { width, height };
        }
      }
    } else if (format === 'VP8L') {
      // Format VP8L (sans perte)
      if (buffer.length < 25) return null;

      // Vérifier la signature VP8L (0x2f)
      const chunkSize = buffer.readUInt32LE(16);
      const signature = buffer.readUInt8(20);
      if (signature !== 0x2f) return null;

      // Lire les 4 octets qui contiennent les dimensions
      const dimensionsBytes = buffer.readUInt32LE(21);

      // Extraire width (14 bits) et height (14 bits)
      const width = (dimensionsBytes & 0x3fff) + 1;
      const height = ((dimensionsBytes >> 14) & 0x3fff) + 1;

      return { width, height };
    } else if (format === 'VP8X') {
      // Format VP8X (étendu)
      if (buffer.length < 30) return null;

      // Dans VP8X, les dimensions sont encodées sur 3 octets chacune
      // Position 24-26 pour width, 27-29 pour height
      const widthBytes = buffer.readUIntLE(24, 3);
      const heightBytes = buffer.readUIntLE(27, 3);

      const width = widthBytes + 1;
      const height = heightBytes + 1;

      return { width, height };
    }
  } catch (error) {
    console.error('Erreur lors du parsing WebP:', error);
    return null;
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

    // Tester WebP
    const webpDimensions = getWebpDimensions(buffer);
    if (webpDimensions) return webpDimensions;

    // Format non supporté
    console.log("Format d'image non supporté ou fichier corrompu");
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
