// cleanWooImageRefs.js - Supprime les références WooCommerce obsolètes des images
const fs = require('fs').promises;
const path = require('path');

class WooImageRefsCleaner {
  constructor() {
    this.dataPath = path.join(process.cwd(), 'data', 'products.db');
  }

  async loadProducts() {
    const fileContent = await fs.readFile(this.dataPath, 'utf8');
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
    const backupPath = path.join(
      process.cwd(),
      'data',
      `products.db.backup.woo-cleanup.${Date.now()}`
    );

    // Sauvegarde
    await fs.copyFile(this.dataPath, backupPath);
    console.log(`💾 Sauvegarde créée: ${backupPath}`);

    // Sauvegarder les modifications
    const content = products.map((p) => JSON.stringify(p)).join('\n');
    await fs.writeFile(this.dataPath, content);
  }

  cleanImageObject(imageObj) {
    if (!imageObj) return imageObj;

    const cleanedImage = { ...imageObj };

    // Supprimer les références WooCommerce
    delete cleanedImage.wp_id;
    delete cleanedImage.url; // URL WooCommerce

    // Garder uniquement les données locales essentielles
    const keepFields = [
      '_id',
      'src',
      'local_path',
      'status',
      'type',
      'metadata',
      'dimensions',
      'width',
      'height',
    ];

    // Filtrer pour ne garder que les champs autorisés
    const filtered = {};
    keepFields.forEach((field) => {
      if (cleanedImage[field] !== undefined) {
        filtered[field] = cleanedImage[field];
      }
    });

    return filtered;
  }

  async cleanWooImageReferences() {
    try {
      console.log('🧹 NETTOYAGE DES RÉFÉRENCES WOOCOMMERCE DES IMAGES');
      console.log('═'.repeat(70));

      // Charger les produits
      const products = await this.loadProducts();
      console.log(`📦 ${products.length} produits chargés`);

      let cleanedProducts = 0;
      let cleanedImages = 0;
      let cleanedGalleryImages = 0;

      for (const product of products) {
        let productCleaned = false;

        // Nettoyer l'image principale
        if (product.image) {
          const originalImage = JSON.stringify(product.image);
          product.image = this.cleanImageObject(product.image);
          const cleanedImageStr = JSON.stringify(product.image);

          if (originalImage !== cleanedImageStr) {
            productCleaned = true;
            cleanedImages++;
          }
        }

        // Nettoyer les images de galerie
        if (product.gallery_images && Array.isArray(product.gallery_images)) {
          const originalGallery = JSON.stringify(product.gallery_images);

          product.gallery_images = product.gallery_images.map((img) => this.cleanImageObject(img));

          const cleanedGalleryStr = JSON.stringify(product.gallery_images);

          if (originalGallery !== cleanedGalleryStr) {
            productCleaned = true;
            cleanedGalleryImages += product.gallery_images.length;
          }
        }

        // Ajouter le flag vf: true aux produits modifiés
        if (productCleaned) {
          product.vf = true;
          cleanedProducts++;
          console.log(
            `✅ ${product.sku || product.name}: références WooCommerce supprimées + vf=true`
          );
        }
      }

      // Sauvegarder les modifications
      if (cleanedProducts > 0) {
        console.log('\n💾 Sauvegarde des modifications...');
        await this.saveProducts(products);

        console.log('\n═'.repeat(70));
        console.log('🎉 NETTOYAGE TERMINÉ !');
        console.log(`📊 ${cleanedProducts} produits nettoyés`);
        console.log(`🖼️ ${cleanedImages} images principales nettoyées`);
        console.log(`🖼️ ${cleanedGalleryImages} images de galerie nettoyées`);

        console.log('\n💡 RÉFÉRENCES SUPPRIMÉES:');
        console.log('   ❌ wp_id (ID WordPress/WooCommerce)');
        console.log('   ❌ url (URL externe WooCommerce)');

        console.log('\n✅ RÉFÉRENCES CONSERVÉES:');
        console.log('   📁 src (chemin local relatif)');
        console.log('   📁 local_path (chemin absolu)');
        console.log('   📋 metadata (informations fichier)');
        console.log('   📐 dimensions/width/height');

        // Générer rapport de nettoyage
        const cleanupReport = {
          timestamp: new Date().toISOString(),
          cleanedProducts: cleanedProducts,
          cleanedMainImages: cleanedImages,
          cleanedGalleryImages: cleanedGalleryImages,
          totalImages: cleanedImages + cleanedGalleryImages,
          removedFields: ['wp_id', 'url'],
          keptFields: [
            '_id',
            'src',
            'local_path',
            'status',
            'type',
            'metadata',
            'dimensions',
            'width',
            'height',
          ],
        };

        const reportPath = `./reports/woo_image_cleanup_${Date.now()}.json`;
        await fs.writeFile(reportPath, JSON.stringify(cleanupReport, null, 2));
        console.log(`📄 Rapport de nettoyage: ${reportPath}`);
      } else {
        console.log('\n✅ Aucune référence WooCommerce trouvée dans les images');
        console.log('Les images sont déjà propres !');
      }

      return {
        cleanedProducts,
        cleanedImages: cleanedImages + cleanedGalleryImages,
      };
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error.message);
      throw error;
    }
  }

  async cleanFromBrokenLinksReport(reportPath) {
    try {
      console.log('🧹 NETTOYAGE BASÉ SUR RAPPORT DE LIENS CASSÉS');
      console.log('═'.repeat(70));

      // 1. Charger le rapport
      console.log(`📄 Chargement du rapport: ${reportPath}`);
      const reportContent = await fs.readFile(reportPath, 'utf8');
      const report = JSON.parse(reportContent);

      console.log(`📊 Produits avec liens cassés: ${report.summary.productsWithBrokenLinks}`);
      console.log(`🔗 Total URLs cassées: ${report.summary.totalBrokenUrls}`);

      // 2. Charger les produits
      const products = await this.loadProducts();
      const productsById = new Map();
      products.forEach((p) => productsById.set(p._id, p));

      let cleanedProducts = 0;
      let cleanedImages = 0;

      // 3. Nettoyer chaque produit du rapport
      for (const brokenProduct of report.brokenProducts) {
        const product = productsById.get(brokenProduct.productId);

        if (!product) {
          console.log(`⚠️ Produit ${brokenProduct.productId} non trouvé, ignoré`);
          continue;
        }

        let productCleaned = false;

        // Nettoyer l'image principale si elle a des URLs cassées
        if (product.image) {
          const hasBrokenMainImage = brokenProduct.brokenUrls.some((url) => url.type === 'main');
          if (hasBrokenMainImage) {
            product.image = this.cleanImageObject(product.image);
            productCleaned = true;
            cleanedImages++;
          }
        }

        // Nettoyer les images de galerie
        if (product.gallery_images && Array.isArray(product.gallery_images)) {
          const brokenGalleryUrls = brokenProduct.brokenUrls.filter(
            (url) => url.type === 'gallery'
          );

          if (brokenGalleryUrls.length > 0) {
            product.gallery_images = product.gallery_images.map((img) =>
              this.cleanImageObject(img)
            );
            productCleaned = true;
            cleanedImages += product.gallery_images.length;
          }
        }

        // Marquer pour resynchronisation
        if (productCleaned) {
          product.pending_sync = true;
          cleanedProducts++;
          console.log(`✅ ${product.sku || product.name}: nettoyé + pending_sync=true`);
        }
      }

      // 4. Sauvegarder
      if (cleanedProducts > 0) {
        console.log('\n💾 Sauvegarde des modifications...');
        await this.saveProducts(products);

        console.log('\n═'.repeat(70));
        console.log('🎉 NETTOYAGE TERMINÉ !');
        console.log(`📊 ${cleanedProducts} produits nettoyés`);
        console.log(`🖼️ ${cleanedImages} images nettoyées`);
        console.log(`✅ ${cleanedProducts} produits marqués avec vf=true`);

        // Rapport de nettoyage spécialisé
        const cleanupReport = {
          timestamp: new Date().toISOString(),
          sourceReport: reportPath,
          cleanedProducts: cleanedProducts,
          cleanedImages: cleanedImages,
          pendingSyncMarked: cleanedProducts,
          processedProductIds: report.brokenProducts.map((p) => p.productId),
        };

        const reportPath2 = `./reports/cleanup_from_broken_${Date.now()}.json`;
        await fs.writeFile(reportPath2, JSON.stringify(cleanupReport, null, 2));
        console.log(`📄 Rapport de nettoyage: ${reportPath2}`);
      } else {
        console.log('\n✅ Aucun produit à nettoyer trouvé');
      }

      return {
        cleanedProducts,
        cleanedImages,
      };
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage depuis rapport:', error.message);
      throw error;
    }
  }
}

// Fonction principale
async function runWooImageCleanup() {
  try {
    const cleaner = new WooImageRefsCleaner();
    const args = process.argv.slice(2);

    // Vérifier s'il y a un rapport de liens cassés
    const reportArg = args.find((arg) => arg.includes('.json'));
    const specificIds = args.filter((arg) => !arg.includes('.json'));

    if (reportArg) {
      // Mode rapport de liens cassés
      console.log(`📄 Mode rapport: ${reportArg}`);
      const results = await cleaner.cleanFromBrokenLinksReport(reportArg);
      console.log(
        `\n✅ Nettoyage terminé: ${results.cleanedImages} images sur ${results.cleanedProducts} produits`
      );
    } else if (specificIds.length > 0) {
      // Mode sélectif (legacy - sans vf=true)
      console.log(`🎯 Mode sélectif: ${specificIds.length} produits`);
      // Pour le mode sélectif, on garde l'ancienne logique sans vf=true
      console.log(
        '⚠️ Mode sélectif ne supporte plus vf=true - utilisez le mode rapport ou complet'
      );
    } else {
      // Mode complet
      const results = await cleaner.cleanWooImageReferences();
      console.log(
        `\n✅ Nettoyage terminé: ${results.cleanedImages} images sur ${results.cleanedProducts} produits`
      );
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runWooImageCleanup();
}

module.exports = { WooImageRefsCleaner };
