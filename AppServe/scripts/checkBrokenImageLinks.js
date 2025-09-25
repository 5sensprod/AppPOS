// checkBrokenImageLinks.js - Détecte les produits synchronisés avec des URLs d'images inexistantes
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

class BrokenImageLinksChecker {
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

  // Vérifier si une URL d'image existe
  async checkImageUrl(url) {
    return new Promise((resolve) => {
      if (!url || typeof url !== 'string') {
        resolve({ exists: false, error: 'URL invalide' });
        return;
      }

      const client = url.startsWith('https:') ? https : http;
      const timeoutMs = 10000; // 10 secondes de timeout

      const request = client.get(url, (res) => {
        // Codes de succès pour les images
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({
            exists: true,
            statusCode: res.statusCode,
            contentType: res.headers['content-type'] || '',
          });
        } else {
          resolve({
            exists: false,
            statusCode: res.statusCode,
            error: `HTTP ${res.statusCode}`,
          });
        }

        // Fermer la connexion rapidement (on n'a pas besoin du contenu)
        res.destroy();
      });

      request.setTimeout(timeoutMs, () => {
        request.destroy();
        resolve({ exists: false, error: 'Timeout' });
      });

      request.on('error', (error) => {
        resolve({
          exists: false,
          error: error.code || error.message,
        });
      });
    });
  }

  // Extraire toutes les URLs d'images d'un produit
  extractImageUrls(product) {
    const urls = [];

    // Image principale
    if (product.image && product.image.url) {
      urls.push({
        type: 'main',
        url: product.image.url,
        wp_id: product.image.wp_id,
      });
    }

    // Images de galerie
    if (product.gallery_images && Array.isArray(product.gallery_images)) {
      product.gallery_images.forEach((img, index) => {
        if (img.url) {
          urls.push({
            type: 'gallery',
            index: index,
            url: img.url,
            wp_id: img.wp_id,
          });
        }
      });
    }

    return urls;
  }

  async checkBrokenImageLinks(maxConcurrent = 5) {
    try {
      console.log("🔗 VÉRIFICATION DES LIENS D'IMAGES DISTANTES");
      console.log('═'.repeat(70));

      // Charger les produits
      const products = await this.loadProducts();
      const syncedProducts = products.filter((p) => p.woo_id);

      console.log(`📦 ${products.length} produits total`);
      console.log(`🔗 ${syncedProducts.length} produits synchronisés à vérifier`);

      // Collecter toutes les URLs à vérifier
      const productsToCheck = [];
      let totalUrls = 0;

      for (const product of syncedProducts) {
        const imageUrls = this.extractImageUrls(product);
        if (imageUrls.length > 0) {
          productsToCheck.push({
            product: product,
            imageUrls: imageUrls,
          });
          totalUrls += imageUrls.length;
        }
      }

      console.log(`🖼️ ${productsToCheck.length} produits avec URLs distantes`);
      console.log(`🌐 ${totalUrls} URLs à vérifier`);

      if (productsToCheck.length === 0) {
        console.log('\n✅ Aucune URL distante trouvée à vérifier');
        return { brokenProducts: [], totalChecked: 0 };
      }

      // Vérifier les URLs avec limite de concurrence
      console.log(`\n🔍 Vérification des URLs (max ${maxConcurrent} simultanées)...`);

      const results = [];
      let checkedCount = 0;

      for (let i = 0; i < productsToCheck.length; i += maxConcurrent) {
        const batch = productsToCheck.slice(i, i + maxConcurrent);

        const batchPromises = batch.map(async (item) => {
          const brokenUrls = [];
          const workingUrls = [];

          for (const imageUrl of item.imageUrls) {
            const checkResult = await this.checkImageUrl(imageUrl.url);
            checkedCount++;

            if (checkedCount % 10 === 0) {
              console.log(`   Vérifiées: ${checkedCount}/${totalUrls}`);
            }

            if (checkResult.exists) {
              workingUrls.push({
                ...imageUrl,
                status: 'OK',
                contentType: checkResult.contentType,
              });
            } else {
              brokenUrls.push({
                ...imageUrl,
                status: 'BROKEN',
                error: checkResult.error,
                statusCode: checkResult.statusCode,
              });
            }

            // Petit délai entre chaque requête pour éviter de surcharger le serveur
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          return {
            product: item.product,
            brokenUrls: brokenUrls,
            workingUrls: workingUrls,
            totalUrls: item.imageUrls.length,
          };
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      // Filtrer les produits avec des liens cassés
      const brokenProducts = results.filter((r) => r.brokenUrls.length > 0);

      // Afficher les résultats
      this.displayResults(brokenProducts, results);

      // Sauvegarder le rapport
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          totalProducts: syncedProducts.length,
          productsWithUrls: productsToCheck.length,
          totalUrls: totalUrls,
          productsWithBrokenLinks: brokenProducts.length,
          totalBrokenUrls: brokenProducts.reduce((sum, p) => sum + p.brokenUrls.length, 0),
        },
        brokenProducts: brokenProducts.map((p) => ({
          productId: p.product._id,
          name: p.product.name,
          sku: p.product.sku,
          wooId: p.product.woo_id,
          totalUrls: p.totalUrls,
          brokenCount: p.brokenUrls.length,
          brokenUrls: p.brokenUrls,
          workingUrls: p.workingUrls,
        })),
      };

      const reportPath = `./reports/broken_image_links_${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Rapport détaillé sauvegardé: ${reportPath}`);

      return {
        brokenProducts: brokenProducts,
        totalChecked: totalUrls,
        report: report,
      };
    } catch (error) {
      console.error('❌ Erreur lors de la vérification:', error.message);
      throw error;
    }
  }

  displayResults(brokenProducts, allResults) {
    console.log('\n═'.repeat(70));
    console.log('📊 RÉSULTATS DE LA VÉRIFICATION');
    console.log('═'.repeat(70));

    const totalBrokenUrls = brokenProducts.reduce((sum, p) => sum + p.brokenUrls.length, 0);
    const totalWorkingUrls = allResults.reduce((sum, p) => sum + p.workingUrls.length, 0);

    console.log('\n📈 RÉSUMÉ:');
    console.log(`   🏷️ Produits avec liens cassés: ${brokenProducts.length}`);
    console.log(`   🔗 Total URLs cassées: ${totalBrokenUrls}`);
    console.log(`   ✅ Total URLs fonctionnelles: ${totalWorkingUrls}`);

    if (brokenProducts.length > 0) {
      console.log('\n🔗 PRODUITS AVEC LIENS CASSÉS:');
      console.log('─'.repeat(70));

      brokenProducts.slice(0, 10).forEach((productResult, index) => {
        const product = productResult.product;
        console.log(`\n${index + 1}. ${product.name || 'Sans nom'}`);
        console.log(`   ID: ${product._id}`);
        console.log(`   SKU: ${product.sku || 'N/A'}`);
        console.log(`   WooID: ${product.woo_id}`);
        console.log(
          `   📊 URLs - Total: ${productResult.totalUrls}, Cassées: ${productResult.brokenUrls.length}, OK: ${productResult.workingUrls.length}`
        );

        productResult.brokenUrls.forEach((brokenUrl, urlIndex) => {
          console.log(
            `   ❌ ${brokenUrl.type} ${brokenUrl.index !== undefined ? `#${brokenUrl.index + 1}` : ''}`
          );
          console.log(`      URL: ${brokenUrl.url}`);
          console.log(`      Erreur: ${brokenUrl.error}`);
          if (brokenUrl.wp_id) {
            console.log(`      WP ID: ${brokenUrl.wp_id}`);
          }
        });
      });

      if (brokenProducts.length > 10) {
        console.log(`\n   ... et ${brokenProducts.length - 10} autres produits avec liens cassés`);
      }

      console.log('\n💡 ACTIONS RECOMMANDÉES:');
      console.log('─'.repeat(50));
      console.log('1. Nettoyer les URLs cassées avec le script cleanWooImageRefs.js');
      console.log('2. Resynchroniser les images depuis les fichiers locaux');
      console.log("3. Vérifier l'état du serveur WooCommerce");
    } else {
      console.log('\n🎉 PARFAIT !');
      console.log("Toutes les URLs d'images distantes sont fonctionnelles.");
    }

    console.log('\n═'.repeat(70));
  }
}

// Fonction principale
async function runBrokenLinksCheck() {
  try {
    const checker = new BrokenImageLinksChecker();
    const maxConcurrent = parseInt(process.argv[2]) || 5;

    console.log(`🔍 Vérification avec max ${maxConcurrent} connexions simultanées`);

    const results = await checker.checkBrokenImageLinks(maxConcurrent);

    console.log(
      `\n✅ Vérification terminée: ${results.brokenProducts.length} produits avec liens cassés sur ${results.totalChecked} URLs vérifiées`
    );

    return results;
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runBrokenLinksCheck()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { BrokenImageLinksChecker };
