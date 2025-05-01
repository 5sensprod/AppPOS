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

    // Si l'image principale existe et n'a pas de dimensions
    if (entity.image && entity.image.local_path) {
      const needsUpdate = !entity.image.dimensions;

      if (needsUpdate && fs.existsSync(entity.image.local_path)) {
        const dimensions = getImageDimensions(entity.image.local_path);
        if (dimensions) {
          entity.image.dimensions = dimensions;
          entity.image.width = dimensions.width;
          entity.image.height = dimensions.height;

          if (!entity.image.metadata) entity.image.metadata = {};
          entity.image.metadata.dimensions = dimensions;

          updatedCount++;
        }
      }
    }

    // Si des images de galerie existent
    if (entity.gallery_images && Array.isArray(entity.gallery_images)) {
      entity.gallery_images.forEach((img) => {
        if (img.local_path && !img.dimensions && fs.existsSync(img.local_path)) {
          const dimensions = getImageDimensions(img.local_path);
          if (dimensions) {
            img.dimensions = dimensions;
            img.width = dimensions.width;
            img.height = dimensions.height;

            if (!img.metadata) img.metadata = {};
            img.metadata.dimensions = dimensions;

            updatedCount++;
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
