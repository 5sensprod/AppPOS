// scripts/listCorruptedImages.js
const fs = require('fs');
const path = require('path');
const Datastore = require('nedb');

function hasCorruptedDimensions(image) {
  if (!image || !image.dimensions) return false;

  const { width, height } = image.dimensions;

  // Dimensions corrompues si :
  // - Largeur ou hauteur = 0
  // - Largeur ou hauteur < 10 (aberrante)
  // - Largeur ou hauteur > 50000 (aberrante)
  return width <= 0 || height <= 0 || width < 10 || height < 10 || width > 50000 || height > 50000;
}

async function main() {
  const db = new Datastore({
    filename: path.join(__dirname, '../data/products.db'),
    autoload: true,
  });

  const products = await new Promise((resolve, reject) => {
    db.find({}, (err, docs) => (err ? reject(err) : resolve(docs)));
  });

  let corruptedProducts = [];
  let totalCorruptedImages = 0;

  products.forEach((product) => {
    let productIssues = {
      _id: product._id,
      name: product.name || product.designation || product.sku || 'Sans nom',
      issues: [],
    };

    let hasIssues = false;

    // Vérifier image principale
    if (product.image && hasCorruptedDimensions(product.image)) {
      productIssues.issues.push({
        type: 'main_image',
        dimensions: product.image.dimensions,
        src: product.image.src,
      });
      hasIssues = true;
      totalCorruptedImages++;
    }

    // Vérifier images de galerie
    if (product.gallery_images && Array.isArray(product.gallery_images)) {
      product.gallery_images.forEach((image, index) => {
        if (hasCorruptedDimensions(image)) {
          productIssues.issues.push({
            type: 'gallery_image',
            index: index,
            dimensions: image.dimensions,
            src: image.src,
          });
          hasIssues = true;
          totalCorruptedImages++;
        }
      });
    }

    if (hasIssues) {
      corruptedProducts.push(productIssues);
    }
  });

  console.log('PRODUITS AVEC IMAGES CORROMPUES');
  console.log('='.repeat(40));
  console.log(`Total produits affectés: ${corruptedProducts.length}`);
  console.log(`Total images corrompues: ${totalCorruptedImages}`);
  console.log('');

  if (corruptedProducts.length > 0) {
    console.log('LISTE DES PRODUITS:');
    console.log('');

    corruptedProducts.forEach((product, index) => {
      console.log(`${index + 1}. ID: ${product._id}`);
      console.log(`   Nom: ${product.name}`);

      product.issues.forEach((issue) => {
        const dims = `${issue.dimensions.width}x${issue.dimensions.height}`;
        if (issue.type === 'main_image') {
          console.log(`   - Image principale: ${dims}`);
        } else {
          console.log(`   - Galerie ${issue.index}: ${dims}`);
        }
      });
      console.log('');
    });

    // Export liste des IDs
    const ids = corruptedProducts.map((p) => p._id);
    console.log('IDS UNIQUEMENT (pour copier/coller):');
    console.log(ids.join('\n'));

    // Sauvegarde dans fichier
    const reportFile = path.join(__dirname, '../corrupted-images-report.json');
    fs.writeFileSync(
      reportFile,
      JSON.stringify(
        {
          summary: {
            totalProducts: corruptedProducts.length,
            totalImages: totalCorruptedImages,
            generatedAt: new Date().toISOString(),
          },
          products: corruptedProducts,
        },
        null,
        2
      )
    );

    console.log(`\nRapport sauvegardé: ${reportFile}`);
  }
}

main().catch(console.error);
