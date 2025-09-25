// restoreImageLinks.js - Restaure les liens d'images manquants depuis le rapport
const fs = require('fs').promises;
const path = require('path');

class ImageLinksRestorer {
  constructor() {
    this.localPath = path.join(process.cwd(), 'data', 'products.db');
    this.sourcePath = path.join(process.cwd(), 'data', 'source', 'products.db');
  }

  async loadProducts(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const lines = fileContent.split('\n').filter((line) => line.trim());

    const products = [];
    for (const line of lines) {
      try {
        products.push(JSON.parse(line));
      } catch (error) {
        // Ignorer lignes invalides
      }
    }
    return products;
  }

  async saveProducts(products) {
    const backupPath = path.join(process.cwd(), 'data', `products.db.backup.images.${Date.now()}`);

    // Sauvegarde
    await fs.copyFile(this.localPath, backupPath);
    console.log(`💾 Sauvegarde créée: ${backupPath}`);

    // Sauvegarder les modifications
    const content = products.map((p) => JSON.stringify(p)).join('\n');
    await fs.writeFile(this.localPath, content);
  }

  async restoreImageLinks(reportPath) {
    try {
      console.log("🔗 RESTAURATION DES LIENS D'IMAGES");
      console.log('═'.repeat(60));

      // 1. Charger le rapport d'images manquantes
      console.log(`📄 Chargement du rapport: ${reportPath}`);
      const reportContent = await fs.readFile(reportPath, 'utf8');
      const report = JSON.parse(reportContent);

      console.log(
        `📊 Produits avec images manquantes: ${report.summary.productsWithMissingImages}`
      );
      console.log(`📊 Total images manquantes: ${report.summary.totalMissingImages}`);

      // 2. Charger les bases de données
      console.log('\n📦 Chargement des bases de données...');
      const [sourceProducts, localProducts] = await Promise.all([
        this.loadProducts(this.sourcePath),
        this.loadProducts(this.localPath),
      ]);

      // Créer des index
      const sourceById = new Map();
      const localById = new Map();

      sourceProducts.forEach((p) => sourceById.set(p._id, p));
      localProducts.forEach((p) => localById.set(p._id, p));

      // 3. Restaurer les liens d'images
      console.log('\n🔗 Restauration des liens...');

      let restoredProducts = 0;
      let restoredImages = 0;

      for (const productDetail of report.details) {
        const productId = productDetail.productId;
        const sourceProduct = sourceById.get(productId);
        const localProduct = localById.get(productId);

        if (!sourceProduct || !localProduct) {
          console.log(`⚠️ Produit ${productId} non trouvé, ignoré`);
          continue;
        }

        let productUpdated = false;

        // Restaurer l'image principale si manquante
        if (sourceProduct.image && (!localProduct.image || !localProduct.image.src)) {
          localProduct.image = { ...sourceProduct.image };
          productUpdated = true;
          restoredImages++;
          console.log(`   🖼️ Image principale restaurée: ${productDetail.name}`);
        }

        // Restaurer les images de galerie si manquantes
        if (sourceProduct.gallery_images && Array.isArray(sourceProduct.gallery_images)) {
          if (!localProduct.gallery_images) {
            localProduct.gallery_images = [];
          }

          // Comparer et ajouter les images manquantes
          for (const sourceImg of sourceProduct.gallery_images) {
            const exists = localProduct.gallery_images.some(
              (localImg) =>
                localImg.src === sourceImg.src ||
                localImg.metadata?.original_name === sourceImg.metadata?.original_name
            );

            if (!exists) {
              localProduct.gallery_images.push({ ...sourceImg });
              productUpdated = true;
              restoredImages++;
            }
          }
        }

        if (productUpdated) {
          restoredProducts++;
          console.log(
            `✅ ${productDetail.sku}: ${productDetail.missingCount} image(s) restaurée(s)`
          );
        }
      }

      // 4. Sauvegarder les modifications
      if (restoredProducts > 0) {
        console.log('\n💾 Sauvegarde des modifications...');
        await this.saveProducts(localProducts);

        console.log('\n═'.repeat(60));
        console.log('🎉 RESTAURATION TERMINÉE !');
        console.log(`📊 ${restoredProducts} produits mis à jour`);
        console.log(`🖼️ ${restoredImages} liens d'images restaurés`);

        // Génerer un rapport de restauration
        const restoreReport = {
          timestamp: new Date().toISOString(),
          sourceReport: reportPath,
          restoredProducts: restoredProducts,
          restoredImages: restoredImages,
          summary: `${restoredImages} liens d'images restaurés sur ${restoredProducts} produits`,
        };

        const restoreReportPath = `./reports/image_restore_${Date.now()}.json`;
        await fs.writeFile(restoreReportPath, JSON.stringify(restoreReport, null, 2));
        console.log(`📄 Rapport de restauration: ${restoreReportPath}`);
      } else {
        console.log('\n⚠️ Aucune image à restaurer trouvée');
      }

      return { restoredProducts, restoredImages };
    } catch (error) {
      console.error('❌ Erreur lors de la restauration:', error.message);
      throw error;
    }
  }

  // Version alternative : restauration directe sans rapport
  async restoreAllMissingImages() {
    try {
      console.log('🔗 RESTAURATION DIRECTE DES IMAGES MANQUANTES');
      console.log('═'.repeat(60));

      // Charger les deux bases
      const [sourceProducts, localProducts] = await Promise.all([
        this.loadProducts(this.sourcePath),
        this.loadProducts(this.localPath),
      ]);

      const sourceById = new Map();
      sourceProducts.forEach((p) => sourceById.set(p._id, p));

      let restoredProducts = 0;
      let restoredImages = 0;

      for (const localProduct of localProducts) {
        const sourceProduct = sourceById.get(localProduct._id);

        if (!sourceProduct) continue;

        let productUpdated = false;

        // Vérifier l'image principale
        if (sourceProduct.image && (!localProduct.image || !localProduct.image.src)) {
          localProduct.image = { ...sourceProduct.image };
          productUpdated = true;
          restoredImages++;
        }

        // Vérifier les images de galerie
        if (sourceProduct.gallery_images && Array.isArray(sourceProduct.gallery_images)) {
          if (!localProduct.gallery_images) {
            localProduct.gallery_images = [];
          }

          // Ajouter les images manquantes
          for (const sourceImg of sourceProduct.gallery_images) {
            const exists = localProduct.gallery_images.some(
              (localImg) =>
                localImg.src === sourceImg.src ||
                (localImg.metadata?.original_name &&
                  sourceImg.metadata?.original_name &&
                  localImg.metadata.original_name === sourceImg.metadata.original_name)
            );

            if (!exists) {
              localProduct.gallery_images.push({ ...sourceImg });
              productUpdated = true;
              restoredImages++;
            }
          }
        }

        if (productUpdated) {
          restoredProducts++;
          console.log(`✅ ${localProduct.sku || localProduct.name}: images restaurées`);
        }
      }

      // Sauvegarder
      if (restoredProducts > 0) {
        await this.saveProducts(localProducts);

        console.log('\n🎉 RESTAURATION TERMINÉE !');
        console.log(`📊 ${restoredProducts} produits mis à jour`);
        console.log(`🖼️ ${restoredImages} liens d'images restaurés`);
      } else {
        console.log('\n✅ Aucune image manquante détectée');
      }

      return { restoredProducts, restoredImages };
    } catch (error) {
      console.error('❌ Erreur:', error.message);
      throw error;
    }
  }
}

// Fonction principale
async function runImageRestore() {
  try {
    const restorer = new ImageLinksRestorer();
    const reportPath = process.argv[2];
    const directMode = process.argv.includes('--direct');

    if (directMode) {
      // Mode direct sans rapport
      console.log('🔄 Mode direct activé');
      const results = await restorer.restoreAllMissingImages();
      console.log(
        `\n✅ Restauration terminée: ${results.restoredImages} images sur ${results.restoredProducts} produits`
      );
    } else if (reportPath) {
      // Mode avec rapport spécifique
      const results = await restorer.restoreImageLinks(reportPath);
      console.log(
        `\n✅ Restauration terminée: ${results.restoredImages} images sur ${results.restoredProducts} produits`
      );
    } else {
      console.error('❌ Veuillez spécifier un rapport ou utiliser --direct');
      console.log('Usage:');
      console.log('  node restoreImageLinks.js ./reports/missing_images_xxx.json');
      console.log('  node restoreImageLinks.js --direct');
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runImageRestore();
}

module.exports = { ImageLinksRestorer };
