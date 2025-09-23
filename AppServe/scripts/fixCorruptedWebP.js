// scripts/fixCorruptedWebP.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const Datastore = require('nedb');

function hasCorruptedDimensions(image) {
  if (!image || !image.dimensions) return false;
  const { width, height } = image.dimensions;
  return width <= 0 || height <= 0 || width < 10 || height < 10 || width > 50000 || height > 50000;
}

function execAsync(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

function getImageDimensions(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);

    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }

    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let pos = 2;
      while (pos < buffer.length) {
        if (buffer[pos] !== 0xff) break;
        const marker = buffer[pos + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
          return { height: buffer.readUInt16BE(pos + 5), width: buffer.readUInt16BE(pos + 7) };
        }
        pos += 2 + buffer.readUInt16BE(pos + 2);
      }
    }

    // WebP
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      const format = buffer.toString('ascii', 12, 16);
      if (format === 'VP8 ') {
        for (let i = 20; i < Math.min(40, buffer.length - 10); i++) {
          if (buffer[i] === 0x9d && buffer[i + 1] === 0x01 && buffer[i + 2] === 0x2a) {
            const width = buffer.readUInt16LE(i + 6) & 0x3fff;
            const height = buffer.readUInt16LE(i + 8) & 0x3fff;
            return { width, height };
          }
        }
      } else if (format === 'VP8L') {
        const signature = buffer.readUInt8(20);
        if (signature === 0x2f) {
          const dimensionsBytes = buffer.readUInt32LE(21);
          const width = (dimensionsBytes & 0x3fff) + 1;
          const height = ((dimensionsBytes >> 14) & 0x3fff) + 1;
          return { width, height };
        }
      } else if (format === 'VP8X') {
        const widthBytes = buffer.readUIntLE(24, 3);
        const heightBytes = buffer.readUIntLE(27, 3);
        return { width: widthBytes + 1, height: heightBytes + 1 };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

function getDevImagePath(imageData) {
  if (!imageData.src) return null;
  const relativePath = imageData.src.replace(/^\/public\//, '');
  return path.join(__dirname, '../public', relativePath);
}

async function repairWebP(imagePath) {
  const tempPath = imagePath.replace('.webp', '_temp.webp');

  try {
    console.log(`  Réparation: ${path.basename(imagePath)}`);

    // Convertir avec FFmpeg
    const command = `ffmpeg -y -i "${imagePath}" -c:v libwebp -q:v 85 "${tempPath}"`;
    await execAsync(command);

    // Vérifier que le fichier réparé existe et a des dimensions correctes
    const newDimensions = getImageDimensions(tempPath);
    if (!newDimensions || newDimensions.width < 10 || newDimensions.height < 10) {
      throw new Error('Réparation échouée - dimensions toujours incorrectes');
    }

    // Remplacer l'original
    fs.renameSync(tempPath, imagePath);

    console.log(`  ✅ Réparé: ${newDimensions.width}x${newDimensions.height}`);
    return newDimensions;
  } catch (error) {
    // Nettoyer le fichier temporaire
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    console.log(`  ❌ Échec: ${error.message}`);
    return null;
  }
}

async function main() {
  // Vérifier que FFmpeg est installé
  try {
    await execAsync('ffmpeg -version');
  } catch (error) {
    console.error('❌ FFmpeg non trouvé. Installez FFmpeg et ajoutez-le au PATH.');
    process.exit(1);
  }

  const db = new Datastore({
    filename: path.join(__dirname, '../data/products.db'),
    autoload: true,
  });

  const products = await new Promise((resolve, reject) => {
    db.find({}, (err, docs) => (err ? reject(err) : resolve(docs)));
  });

  let corruptedImages = [];

  // Identifier toutes les images corrompues
  products.forEach((product) => {
    if (product.image && hasCorruptedDimensions(product.image)) {
      const imagePath = getDevImagePath(product.image);
      if (imagePath && fs.existsSync(imagePath)) {
        corruptedImages.push({
          productId: product._id,
          type: 'main',
          image: product.image,
          path: imagePath,
        });
      }
    }

    if (product.gallery_images && Array.isArray(product.gallery_images)) {
      product.gallery_images.forEach((image, index) => {
        if (hasCorruptedDimensions(image)) {
          const imagePath = getDevImagePath(image);
          if (imagePath && fs.existsSync(imagePath)) {
            corruptedImages.push({
              productId: product._id,
              type: 'gallery',
              index: index,
              image: image,
              path: imagePath,
            });
          }
        }
      });
    }
  });

  console.log(`🔧 ${corruptedImages.length} images corrompues trouvées`);

  if (corruptedImages.length === 0) {
    console.log('✅ Aucune image à réparer');
    return;
  }

  let repairedCount = 0;
  let failedCount = 0;

  for (const item of corruptedImages) {
    console.log(
      `\n🔨 Produit ${item.productId} - ${item.type === 'main' ? 'Image principale' : `Galerie ${item.index}`}`
    );

    const newDimensions = await repairWebP(item.path);

    if (newDimensions) {
      // Mettre à jour la base de données
      const product = await new Promise((resolve, reject) => {
        db.findOne({ _id: item.productId }, (err, doc) => {
          if (err) reject(err);
          else resolve(doc);
        });
      });

      if (item.type === 'main') {
        product.image.dimensions = newDimensions;
        product.image.width = newDimensions.width;
        product.image.height = newDimensions.height;
      } else {
        product.gallery_images[item.index].dimensions = newDimensions;
        product.gallery_images[item.index].width = newDimensions.width;
        product.gallery_images[item.index].height = newDimensions.height;
      }

      await new Promise((resolve, reject) => {
        db.update({ _id: item.productId }, product, {}, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      repairedCount++;
    } else {
      failedCount++;
    }
  }

  console.log('\n📊 RÉSULTATS:');
  console.log(`✅ Images réparées: ${repairedCount}`);
  console.log(`❌ Échecs: ${failedCount}`);
  console.log(
    `📈 Taux de réussite: ${((repairedCount / corruptedImages.length) * 100).toFixed(1)}%`
  );
}

main().catch(console.error);
