// update-image-dimensions.js
const fs = require('fs');
const path = require('path');
const db = require('./config/database');

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
    if (pos + 1 >= buffer.length || buffer[pos] !== 0xff) break;

    const marker = buffer[pos + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
      if (pos + 9 > buffer.length) break;
      return {
        height: buffer.readUInt16BE(pos + 5),
        width: buffer.readUInt16BE(pos + 7),
      };
    }

    // Aller au prochain marqueur
    if (pos + 2 >= buffer.length) break;
    const markerSize = buffer.readUInt16BE(pos + 2);
    if (!markerSize || pos + 2 + markerSize > buffer.length) break;
    pos += 2 + markerSize;
  }

  return null;
}

// Fonction pour obtenir les dimensions d'une image WebP
function getWebpDimensions(buffer) {
  if (buffer.length < 30) return null;
  if (buffer[0] !== 0x52 || buffer[1] !== 0x49 || buffer[2] !== 0x46 || buffer[3] !== 0x46)
    return null; // Signature RIFF

  // Vérifier la signature 'WEBP'
  if (buffer[8] !== 0x57 || buffer[9] !== 0x45 || buffer[10] !== 0x42 || buffer[11] !== 0x50)
    return null;

  // Format VP8
  if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  // Format VP8L
  if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x4c) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  // Format VP8X
  if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x58) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  return null;
}

// Fonction pour obtenir les dimensions d'une image GIF
function getGifDimensions(buffer) {
  if (buffer.length < 10) return null;
  if (buffer[0] !== 0x47 || buffer[1] !== 0x49 || buffer[2] !== 0x46) return null; // Signature GIF

  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
  };
}

// Fonction générique pour obtenir les dimensions
function getImageDimensions(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const extension = path.extname(filePath).toLowerCase();

    // Tester en fonction de l'extension pour optimiser
    if (extension === '.png') {
      return getPngDimensions(buffer);
    } else if (['.jpg', '.jpeg'].includes(extension)) {
      return getJpegDimensions(buffer);
    } else if (extension === '.webp') {
      return getWebpDimensions(buffer);
    } else if (extension === '.gif') {
      return getGifDimensions(buffer);
    }

    // Si l'extension n'est pas reconnue, essayer tous les formats
    const pngDimensions = getPngDimensions(buffer);
    if (pngDimensions) return pngDimensions;

    const jpegDimensions = getJpegDimensions(buffer);
    if (jpegDimensions) return jpegDimensions;

    const webpDimensions = getWebpDimensions(buffer);
    if (webpDimensions) return webpDimensions;

    const gifDimensions = getGifDimensions(buffer);
    if (gifDimensions) return gifDimensions;

    console.log(`Format non reconnu pour ${filePath}`);
    return null;
  } catch (error) {
    console.error(`Erreur lors de la lecture du fichier ${filePath}:`, error);
    return null;
  }
}

// Fonction pour mettre à jour les dimensions d'une entité
async function updateEntityImages(collection, entity) {
  return new Promise((resolve, reject) => {
    let updatedCount = 0;

    // Corriger les chemins manquants
    if (entity.image && !entity.image.local_path && entity.image.src) {
      const basePath = 'I:\\AppPOS\\AppServe';
      entity.image.local_path = path.join(basePath, entity.image.src.replace(/^\//, ''));
    }

    // Si l'image principale existe et n'a pas de dimensions
    if (entity.image && entity.image.local_path) {
      const needsUpdate =
        !entity.image.dimensions ||
        !entity.image.width ||
        !entity.image.height ||
        !entity.image.metadata?.dimensions;

      if (needsUpdate && fs.existsSync(entity.image.local_path)) {
        const dimensions = getImageDimensions(entity.image.local_path);
        if (dimensions) {
          entity.image.dimensions = dimensions;
          entity.image.width = dimensions.width;
          entity.image.height = dimensions.height;

          if (!entity.image.metadata) entity.image.metadata = {};
          entity.image.metadata.dimensions = dimensions;

          updatedCount++;
          console.log(
            `  Image principale mise à jour: ${entity.image.local_path} (${dimensions.width}x${dimensions.height})`
          );
        } else {
          console.log(`  Impossible d'extraire les dimensions pour ${entity.image.local_path}`);
        }
      }
    }

    // Si des images de galerie existent
    if (entity.gallery_images && Array.isArray(entity.gallery_images)) {
      entity.gallery_images.forEach((img, index) => {
        // Corriger les chemins manquants
        if (!img.local_path && img.src) {
          const basePath = 'I:\\AppPOS\\AppServe';
          img.local_path = path.join(basePath, img.src.replace(/^\//, ''));
        }

        const needsUpdate =
          !img.dimensions || !img.width || !img.height || !img.metadata?.dimensions;

        if (img.local_path && needsUpdate && fs.existsSync(img.local_path)) {
          const dimensions = getImageDimensions(img.local_path);
          if (dimensions) {
            img.dimensions = dimensions;
            img.width = dimensions.width;
            img.height = dimensions.height;

            if (!img.metadata) img.metadata = {};
            img.metadata.dimensions = dimensions;

            updatedCount++;
            console.log(
              `  Image galerie #${index} mise à jour: ${img.local_path} (${dimensions.width}x${dimensions.height})`
            );
          } else {
            console.log(`  Impossible d'extraire les dimensions pour ${img.local_path}`);
          }
        }
      });
    }

    // Si des mises à jour ont été effectuées, enregistrer les modifications
    if (updatedCount > 0) {
      collection.update({ _id: entity._id }, entity, {}, (err) => {
        if (err) reject(err);
        else resolve(updatedCount);
      });
    } else {
      resolve(0);
    }
  });
}

// Fonction principale qui traite toutes les entités
async function updateAllImageDimensions() {
  const entityTypes = ['products', 'categories', 'brands', 'suppliers'];
  let totalUpdated = 0;

  for (const entityType of entityTypes) {
    try {
      console.log(`\nTraitement des ${entityType}...`);

      const collection = db[entityType];
      if (!collection) {
        console.warn(`Collection ${entityType} non trouvée dans la base de données`);
        continue;
      }

      // Récupérer toutes les entités
      const entities = await new Promise((resolve, reject) => {
        collection.find({}, (err, docs) => {
          if (err) reject(err);
          else resolve(docs);
        });
      });

      console.log(`${entities.length} ${entityType} trouvés`);

      // Traiter chaque entité
      let entityUpdated = 0;
      for (const entity of entities) {
        try {
          const updated = await updateEntityImages(collection, entity);
          if (updated > 0) {
            entityUpdated++;
            totalUpdated += updated;
            console.log(`  - ${entity._id}: ${updated} image(s) mise(s) à jour`);
          }
        } catch (error) {
          console.error(`  - Erreur lors de la mise à jour de ${entityType} ${entity._id}:`, error);
        }
      }

      console.log(`${entityUpdated} ${entityType} mis à jour`);
    } catch (error) {
      console.error(`Erreur lors du traitement des ${entityType}:`, error);
    }
  }

  console.log(`\nTotal: ${totalUpdated} images mises à jour`);
}

// Exécuter le script
console.log("Début de la mise à jour des dimensions d'images...");
updateAllImageDimensions()
  .then(() => {
    console.log('Mise à jour terminée avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur:', error);
    process.exit(1);
  });
