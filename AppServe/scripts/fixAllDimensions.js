// scripts/fixAllDimensions.js
const fs = require('fs');
const path = require('path');
const Datastore = require('nedb');

function getDimensions(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);

    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }

    // JPEG/JPG
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

function hasBadDimensions(image) {
  if (!image) return false;
  if (!image.dimensions) return true;
  const { width, height } = image.dimensions;
  return width < 10 || height < 10 || width > 50000 || height > 50000;
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

  // Forcer le rechargement de la base
  await new Promise((resolve, reject) => {
    db.loadDatabase((err) => (err ? reject(err) : resolve()));
  });

  console.log('Analyse...');

  const products = await new Promise((resolve, reject) => {
    db.find({}, (err, docs) => (err ? reject(err) : resolve(docs)));
  });

  let toFix = [];
  let stats = { jpg: 0, jpeg: 0, png: 0, webp: 0, unknown: 0 };

  products.forEach((product) => {
    // Image principale
    if (product.image && hasBadDimensions(product.image)) {
      const imagePath = getImagePath(product.image);
      if (imagePath && fs.existsSync(imagePath)) {
        toFix.push({ productId: product._id, type: 'main', image: product.image, path: imagePath });
        stats[product.image.type || 'unknown']++;
      }
    }

    // Galerie
    if (product.gallery_images) {
      product.gallery_images.forEach((image, index) => {
        if (hasBadDimensions(image)) {
          const imagePath = getImagePath(image);
          if (imagePath && fs.existsSync(imagePath)) {
            toFix.push({ productId: product._id, type: 'gallery', index, image, path: imagePath });
            stats[image.type || 'unknown']++;
          }
        }
      });
    }
  });

  console.log(`A corriger: ${toFix.length} images`);
  console.log(
    `JPG: ${stats.jpg}, JPEG: ${stats.jpeg}, PNG: ${stats.png}, WebP: ${stats.webp}, Autre: ${stats.unknown}`
  );

  if (toFix.length === 0) {
    console.log('Rien a corriger !');
    return;
  }

  // Correction
  if (process.argv.includes('--fix')) {
    console.log('Correction...');
    let fixed = 0;
    let errors = 0;

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
        if (fixed % 50 === 0) console.log(`${fixed}...`);
      } else {
        errors++;
      }
    }

    console.log(`Termine ! ${fixed} corrigees, ${errors} erreurs`);
  } else {
    console.log('Relancez avec --fix pour corriger');
  }
}

main().catch(console.error);
