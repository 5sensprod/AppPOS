// findMissingImages.js - Compare les liens d'images entre source et local
const fs = require('fs').promises;
const path = require('path');

class MissingImagesFinder {
  constructor() {
    this.sourcePath = path.join(process.cwd(), 'data', 'source', 'products.db');
    this.localPath = path.join(process.cwd(), 'data', 'products.db');
    console.log(`📂 Source: ${this.sourcePath}`);
    console.log(`📂 Local: ${this.localPath}`);
  }

  async loadProducts(filePath, label) {
    try {
      console.log(`📖 Lecture ${label}: ${filePath}`);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const lines = fileContent.split('\n').filter((line) => line.trim());

      const products = [];
      for (const line of lines) {
        try {
          const product = JSON.parse(line);
          products.push(product);
        } catch (error) {
          // Ignorer lignes JSON invalides
        }
      }

      console.log(`✅ ${products.length} produits lus depuis ${label}`);
      return products;
    } catch (error) {
      console.error(`❌ Erreur lecture ${label}:`, error.message);
      throw error;
    }
  }

  extractImageInfo(product, source) {
    const images = [];

    // Image principale
    if (product.image) {
      images.push({
        type: 'main',
        data: product.image,
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        source: source,
      });
    }

    // Images de galerie
    if (product.gallery_images && Array.isArray(product.gallery_images)) {
      product.gallery_images.forEach((img, index) => {
        images.push({
          type: 'gallery',
          index: index,
          data: img,
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          source: source,
        });
      });
    }

    return images;
  }

  async findMissingImages() {
    try {
      console.log('🖼️  RECHERCHE DES IMAGES MANQUANTES');
      console.log('═'.repeat(80));

      // 1. Charger les deux bases de données
      const [sourceProducts, localProducts] = await Promise.all([
        this.loadProducts(this.sourcePath, 'SOURCE'),
        this.loadProducts(this.localPath, 'LOCAL'),
      ]);

      // 2. Créer des index par ID
      const sourceById = new Map();
      const localById = new Map();

      sourceProducts.forEach((p) => sourceById.set(p._id, p));
      localProducts.forEach((p) => localById.set(p._id, p));

      console.log(`\n🔍 Produits communs: ${Math.min(sourceById.size, localById.size)}`);

      // 3. Extraire toutes les informations d'images
      console.log("\n📸 Extraction des informations d'images...");

      const sourceImages = [];
      const localImages = [];

      sourceProducts.forEach((product) => {
        const images = this.extractImageInfo(product, 'source');
        sourceImages.push(...images);
      });

      localProducts.forEach((product) => {
        const images = this.extractImageInfo(product, 'local');
        localImages.push(...images);
      });

      console.log(`📊 Images source: ${sourceImages.length}`);
      console.log(`📊 Images local: ${localImages.length}`);

      // 4. Comparer les images par produit
      console.log('\n🔍 Comparaison des images par produit...');

      const missingImages = [];
      const results = {
        productsWithMissingImages: 0,
        totalMissingImages: 0,
        details: [],
      };

      for (const [productId, sourceProduct] of sourceById) {
        const localProduct = localById.get(productId);

        if (!localProduct) {
          // Produit n'existe pas en local, ignorer
          continue;
        }

        const sourceProductImages = this.extractImageInfo(sourceProduct, 'source');
        const localProductImages = this.extractImageInfo(localProduct, 'local');

        // Comparer les images
        const missingInLocal = [];

        for (const sourceImg of sourceProductImages) {
          // Vérifier si cette image existe en local
          const existsInLocal = localProductImages.some((localImg) => {
            // Comparer par chemin/URL si disponible
            if (sourceImg.data.src && localImg.data.src) {
              return sourceImg.data.src === localImg.data.src;
            }
            // Comparer par nom de fichier
            if (sourceImg.data.metadata?.original_name && localImg.data.metadata?.original_name) {
              return sourceImg.data.metadata.original_name === localImg.data.metadata.original_name;
            }
            // Comparer par URL externe
            if (sourceImg.data.url && localImg.data.url) {
              return sourceImg.data.url === localImg.data.url;
            }
            return false;
          });

          if (!existsInLocal) {
            missingInLocal.push(sourceImg);
          }
        }

        if (missingInLocal.length > 0) {
          results.productsWithMissingImages++;
          results.totalMissingImages += missingInLocal.length;

          const productResult = {
            productId: productId,
            name: sourceProduct.name,
            sku: sourceProduct.sku,
            sourceImagesCount: sourceProductImages.length,
            localImagesCount: localProductImages.length,
            missingCount: missingInLocal.length,
            missingImages: missingInLocal.map((img) => ({
              type: img.type,
              index: img.index,
              src: img.data.src,
              url: img.data.url,
              localPath: img.data.local_path,
              originalName: img.data.metadata?.original_name,
              size: img.data.metadata?.size,
            })),
          };

          results.details.push(productResult);
          missingImages.push(...missingInLocal);
        }
      }

      // 5. Afficher les résultats
      this.displayResults(results);

      // 6. Sauvegarder le rapport
      const reportPath = `./reports/missing_images_${Date.now()}.json`;
      await fs.writeFile(
        reportPath,
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            summary: {
              sourceProductsCount: sourceProducts.length,
              localProductsCount: localProducts.length,
              sourceImagesCount: sourceImages.length,
              localImagesCount: localImages.length,
              productsWithMissingImages: results.productsWithMissingImages,
              totalMissingImages: results.totalMissingImages,
            },
            details: results.details,
          },
          null,
          2
        )
      );

      console.log(`\n📄 Rapport détaillé sauvegardé: ${reportPath}`);

      return results;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche:', error.message);
      throw error;
    }
  }

  displayResults(results) {
    console.log('\n═'.repeat(80));
    console.log("📊 RÉSULTATS DE LA COMPARAISON D'IMAGES");
    console.log('═'.repeat(80));

    console.log('\n📈 RÉSUMÉ:');
    console.log(`   🏷️  Produits avec images manquantes: ${results.productsWithMissingImages}`);
    console.log(`   🖼️  Total images manquantes: ${results.totalMissingImages}`);

    if (results.details.length > 0) {
      console.log('\n🖼️  DÉTAIL DES IMAGES MANQUANTES:');
      console.log('─'.repeat(80));

      results.details.slice(0, 10).forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name || 'Sans nom'}`);
        console.log(`   ID: ${product.productId}`);
        console.log(`   SKU: ${product.sku || 'N/A'}`);
        console.log(
          `   📊 Images - Source: ${product.sourceImagesCount}, Local: ${product.localImagesCount}, Manquantes: ${product.missingCount}`
        );

        product.missingImages.forEach((img, imgIndex) => {
          console.log(`   🔸 ${img.type} ${img.index !== undefined ? `#${img.index + 1}` : ''}`);
          if (img.originalName) {
            console.log(`      Nom: ${img.originalName}`);
          }
          if (img.src) {
            console.log(`      Src: ${img.src}`);
          }
          if (img.url) {
            console.log(`      URL: ${img.url}`);
          }
          if (img.size) {
            console.log(`      Taille: ${(img.size / 1024).toFixed(1)} KB`);
          }
        });
      });

      if (results.details.length > 10) {
        console.log(
          `\n   ... et ${results.details.length - 10} autres produits avec images manquantes`
        );
      }

      console.log('\n💡 ACTIONS RECOMMANDÉES:');
      console.log('─'.repeat(50));
      console.log('1. Vérifier si les fichiers images existent physiquement');
      console.log('2. Copier les images manquantes depuis la source');
      console.log('3. Mettre à jour les liens dans la base locale');
      console.log('4. Resynchroniser les produits concernés');
    } else {
      console.log('\n🎉 PARFAIT !');
      console.log('Toutes les images de la source sont présentes en local.');
    }

    console.log('\n═'.repeat(80));
  }
}

// Fonction principale
async function runMissingImagesFinder() {
  try {
    const finder = new MissingImagesFinder();
    const results = await finder.findMissingImages();

    console.log(`\n✅ Analyse terminée: ${results.totalMissingImages} images manquantes trouvées`);

    return results;
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  runMissingImagesFinder()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { MissingImagesFinder, runMissingImagesFinder };
