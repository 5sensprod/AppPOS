// scripts/countMissingDimensions.js
const fs = require('fs');
const path = require('path');
const Datastore = require('nedb');

function hasBadDimensions(image) {
  if (!image) return false;
  if (!image.dimensions) return true;

  const { width, height } = image.dimensions;
  return width < 10 || height < 10 || width > 50000 || height > 50000;
}

async function main() {
  const db = new Datastore({
    filename: path.join(__dirname, '../data/products.db'),
    autoload: true,
  });

  const products = await new Promise((resolve, reject) => {
    db.find({}, (err, docs) => (err ? reject(err) : resolve(docs)));
  });

  let stats = {
    totalProducts: products.length,
    productsWithIssues: 0,
    totalMainImages: 0,
    badMainImages: 0,
    totalGalleryImages: 0,
    badGalleryImages: 0,
    byExtension: {},
  };

  products.forEach((product) => {
    let productHasIssues = false;

    // Image principale
    if (product.image) {
      stats.totalMainImages++;
      const ext = product.image.type || 'unknown';
      if (!stats.byExtension[ext]) stats.byExtension[ext] = { total: 0, bad: 0 };
      stats.byExtension[ext].total++;

      if (hasBadDimensions(product.image)) {
        stats.badMainImages++;
        stats.byExtension[ext].bad++;
        productHasIssues = true;
      }
    }

    // Images galerie
    if (product.gallery_images && Array.isArray(product.gallery_images)) {
      product.gallery_images.forEach((image) => {
        stats.totalGalleryImages++;
        const ext = image.type || 'unknown';
        if (!stats.byExtension[ext]) stats.byExtension[ext] = { total: 0, bad: 0 };
        stats.byExtension[ext].total++;

        if (hasBadDimensions(image)) {
          stats.badGalleryImages++;
          stats.byExtension[ext].bad++;
          productHasIssues = true;
        }
      });
    }

    if (productHasIssues) stats.productsWithIssues++;
  });

  console.log('RAPPORT DIMENSIONS IMAGES');
  console.log('========================');
  console.log(`Produits total: ${stats.totalProducts}`);
  console.log(`Produits avec problemes: ${stats.productsWithIssues}`);
  console.log('');
  console.log('IMAGES PRINCIPALES:');
  console.log(`  Total: ${stats.totalMainImages}`);
  console.log(`  Sans dimensions: ${stats.badMainImages}`);
  console.log('');
  console.log('IMAGES GALERIE:');
  console.log(`  Total: ${stats.totalGalleryImages}`);
  console.log(`  Sans dimensions: ${stats.badGalleryImages}`);
  console.log('');
  console.log('PAR EXTENSION:');
  Object.entries(stats.byExtension).forEach(([ext, data]) => {
    const percent = ((data.bad / data.total) * 100).toFixed(1);
    console.log(`  ${ext.toUpperCase()}: ${data.bad}/${data.total} (${percent}%)`);
  });
  console.log('');
  console.log(`TOTAL PROBLEMES: ${stats.badMainImages + stats.badGalleryImages}`);
}

main().catch(console.error);
