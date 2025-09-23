// scripts/fixWebpDimensions.js
const fs = require('fs');
const path = require('path');
const Datastore = require('nedb');

// Fonction WebP uniquement
function getWebpDimensions(buffer) {
  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (buffer.toString('ascii', 8, 12) !== 'WEBP') return null;

  const format = buffer.toString('ascii', 12, 16);

  try {
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
      if (signature !== 0x2f) return null;
      const dimensionsBytes = buffer.readUInt32LE(21);
      const width = (dimensionsBytes & 0x3fff) + 1;
      const height = ((dimensionsBytes >> 14) & 0x3fff) + 1;
      return { width, height };
    } else if (format === 'VP8X') {
      const widthBytes = buffer.readUIntLE(24, 3);
      const heightBytes = buffer.readUIntLE(27, 3);
      return { width: widthBytes + 1, height: heightBytes + 1 };
    }
  } catch (error) {
    return null;
  }

  return null;
}

function getDimensions(filePath) {
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
    return getWebpDimensions(buffer);
  } catch (error) {
    return null;
  }
}

function getImagePath(imageData) {
  if (!imageData.src) return null;
  const relativePath = imageData.src.replace(/^\/public\//, '');
  return path.join(__dirname, '../public', relativePath);
}

async function main() {
  const db = new Datastore({
    filename: path.join(__dirname, '../data/products.db'),
    autoload: true,
  });

  console.log('🔍 Analyse...');

  const products = await new Promise((resolve, reject) => {
    db.find({}, (err, docs) => (err ? reject(err) : resolve(docs)));
  });

  let toFix = [];
  let totalImages = 0;
  let problemImages = 0;

  products.forEach((product) => {
    // Image principale
    if (product.image && product.image.type === 'webp') {
      totalImages++;
      const needsFix =
        !product.image.dimensions ||
        product.image.dimensions.width < 10 ||
        product.image.dimensions.height < 10 ||
        product.image.dimensions.width > 10000 ||
        product.image.dimensions.height > 10000;

      if (needsFix) {
        const imagePath = getImagePath(product.image);
        if (imagePath && fs.existsSync(imagePath)) {
          toFix.push({
            productId: product._id,
            type: 'main',
            image: product.image,
            path: imagePath,
          });
          problemImages++;
        }
      }
    }

    // Galerie
    if (product.gallery_images) {
      product.gallery_images.forEach((image, index) => {
        totalImages++;
        if (image.type === 'webp') {
          const needsFix =
            !image.dimensions ||
            image.dimensions.width < 10 ||
            image.dimensions.height < 10 ||
            image.dimensions.width > 10000 ||
            image.dimensions.height > 10000;

          if (needsFix) {
            const imagePath = getImagePath(image);
            if (imagePath && fs.existsSync(imagePath)) {
              toFix.push({
                productId: product._id,
                type: 'gallery',
                index,
                image,
                path: imagePath,
              });
              problemImages++;
            }
          }
        }
      });
    }
  });

  console.log(`📊 ${problemImages} images WebP sans dimensions sur ${totalImages} images`);

  if (problemImages === 0) {
    console.log('✅ Rien à corriger !');
    return;
  }

  // Correction
  if (process.argv.includes('--fix')) {
    console.log('🔧 Correction...');
    let fixed = 0;

    for (const item of toFix) {
      const dimensions = getDimensions(item.path);
      if (dimensions) {
        const product = await new Promise((resolve, reject) => {
          db.findOne({ _id: item.productId }, (err, doc) => (err ? reject(err) : resolve(doc)));
        });

        if (item.type === 'main') {
          product.image.dimensions = dimensions;
          product.image.width = dimensions.width;
          product.image.height = dimensions.height;
        } else {
          product.gallery_images[item.index].dimensions = dimensions;
          product.gallery_images[item.index].width = dimensions.width;
          product.gallery_images[item.index].height = dimensions.height;
        }

        await new Promise((resolve, reject) => {
          db.update({ _id: item.productId }, product, {}, (err) => (err ? reject(err) : resolve()));
        });

        fixed++;
        console.log(`✅ ${dimensions.width}x${dimensions.height}`);
      }
    }

    console.log(`🎉 ${fixed} images corrigées !`);
  } else {
    console.log('💡 Relancez avec --fix pour corriger');
  }
}

main().catch(console.error);
