// forceRecreateProducts.js - Script pour forcer la recréation des produits perdus
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const WooCommerceClient = require('./services/base/WooCommerceClient');

class ProductRecreator {
  constructor() {
    this.wooClient = new WooCommerceClient();
    this.dataPath = path.join(process.cwd(), 'data');
    this.productsFile = path.join(this.dataPath, 'products.db');

    // IDs des produits perdus
    this.lostProductIds = [
      '6l7Euile6qzuf8YI', // Morley 20/20 Classic Switchless Wah
      'C6JU7cl6jPXcdE2w', // La guitare Lava Me 2 Freeboost en bleu
      'HjnXkGjT0TUEpgm0', // 36
      'KkfOY6NUh4ONtLaq', // Amano C-OP-SN Open Pore
      'VUBpl3B7J8aSleKy', // Housse guitare électrique EGBG N12
      'ioxMYJuLSkPKMWwR', // Stanford Blonde Sister 200
      'nOOiQ5LIWvBeUaGC', // Basse Prodipe Gaucher Candy Red
      'skVaUKCGWTv8H1rS', // Orange Dual Terror Head Bundle
    ];
  }

  async readProductsFromFile() {
    try {
      const fileContent = await fs.readFile(this.productsFile, 'utf8');
      const lines = fileContent.split('\n').filter((line) => line.trim());
      const products = [];

      for (const line of lines) {
        try {
          products.push(JSON.parse(line));
        } catch (error) {
          // Ignorer les lignes JSON invalides
        }
      }

      return products;
    } catch (error) {
      console.error('❌ Erreur lecture:', error.message);
      throw error;
    }
  }

  async updateProductInFile(productId, updateData) {
    try {
      const fileContent = await fs.readFile(this.productsFile, 'utf8');
      const lines = fileContent.split('\n').filter((line) => line.trim());
      const updatedLines = [];
      let found = false;

      for (const line of lines) {
        try {
          const product = JSON.parse(line);
          if (product._id === productId) {
            const updatedProduct = { ...product, ...updateData };
            updatedLines.push(JSON.stringify(updatedProduct));
            found = true;
          } else {
            updatedLines.push(line);
          }
        } catch (error) {
          updatedLines.push(line);
        }
      }

      if (!found) {
        throw new Error(`Produit ${productId} non trouvé`);
      }

      await fs.writeFile(this.productsFile, updatedLines.join('\n') + '\n', 'utf8');
      return true;
    } catch (error) {
      console.error(`❌ Erreur mise à jour ${productId}:`, error.message);
      throw error;
    }
  }

  async uploadImageToWordPress(imagePath, filename) {
    try {
      const fs = require('fs');
      if (!fs.existsSync(imagePath)) {
        console.log(`   ⚠️ Image non trouvée: ${imagePath}`);
        return null;
      }

      const imageBuffer = fs.readFileSync(imagePath);
      const FormData = require('form-data');
      const axios = require('axios');

      const form = new FormData();
      form.append('file', imageBuffer, {
        filename: filename,
        contentType: this.getMimeType(imagePath),
      });

      const credentials = Buffer.from(
        `${process.env.WP_USER}:${process.env.WP_APP_PASSWORD}`
      ).toString('base64');

      const response = await axios.post(`${process.env.WC_URL}/wp-json/wp/v2/media`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Basic ${credentials}`,
        },
        timeout: 30000,
      });

      console.log(`   ✅ Image uploadée: ${response.data.id}`);
      return {
        id: response.data.id,
        url: response.data.source_url,
        alt: response.data.alt_text || '',
      };
    } catch (error) {
      console.log(`   ❌ Erreur upload image: ${error.message}`);
      return null;
    }
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  async syncProductImages(product) {
    const images = [];

    try {
      // Image principale
      if (product.image && product.image.local_path) {
        console.log(`   📸 Upload image principale...`);
        const uploadedImage = await this.uploadImageToWordPress(
          product.image.local_path,
          `${product._id}_main${path.extname(product.image.local_path)}`
        );

        if (uploadedImage) {
          images.push({
            id: uploadedImage.id,
            src: uploadedImage.url,
            alt: product.name || '',
            position: 0,
          });
        }
      }

      // Images de galerie
      if (product.gallery_images && product.gallery_images.length > 0) {
        for (let i = 0; i < product.gallery_images.length; i++) {
          const galleryImage = product.gallery_images[i];

          if (galleryImage.local_path) {
            console.log(`   📸 Upload image galerie ${i + 1}...`);
            const uploadedImage = await this.uploadImageToWordPress(
              galleryImage.local_path,
              `${product._id}_gallery_${i}${path.extname(galleryImage.local_path)}`
            );

            if (uploadedImage) {
              images.push({
                id: uploadedImage.id,
                src: uploadedImage.url,
                alt: `${product.name || ''} - ${i + 1}`,
                position: i + 1,
              });
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      console.log(`   📸 ${images.length} image(s) uploadée(s)`);
      return images;
    } catch (error) {
      console.log(`   ❌ Erreur upload images: ${error.message}`);
      return [];
    }
  }

  async forceCreateProduct(product) {
    try {
      console.log(`   🔄 FORCE CRÉATION (ignorer ancien woo_id: ${product.woo_id})`);

      // 1. Upload des images d'abord
      const images = await this.syncProductImages(product);

      // 2. Préparer les données du produit (SANS woo_id pour forcer la création)
      const wcData = {
        name: product.name || 'Produit sans nom',
        sku: product.sku || `recreated-${product._id}`, // SKU unique en cas de conflit
        description: product.description || '',
        short_description: product.short_description || '',
        regular_price: (product.regular_price || product.price || 0).toString(),
        price: (product.price || 0).toString(),
        sale_price: (product.sale_price || '').toString(),
        status: product.status === 'published' ? 'publish' : 'draft',
        manage_stock: product.manage_stock || false,
        stock_quantity: product.stock || 0,
        categories: [{ id: 1 }], // Catégorie par défaut
        images: images,
        meta_data: [
          { key: 'force_recreated', value: new Date().toISOString() },
          { key: 'old_woo_id', value: product.woo_id.toString() },
          { key: 'local_id', value: product._id },
          { key: 'recreated_by', value: 'forceRecreateProducts.js' },
        ],
      };

      // 3. FORCE la création (POST, pas PUT)
      console.log(`   ➕ Création forcée sur WooCommerce...`);
      const response = await this.wooClient.post('products', wcData);

      const newWooId = response.data.id;
      console.log(`   ✅ NOUVEAU produit créé! woo_id: ${newWooId}`);

      return {
        success: true,
        newWooId: newWooId,
        wooProduct: response.data,
        syncedImages: images.length,
      };
    } catch (error) {
      console.error(`   ❌ Erreur création forcée:`, error.message);

      // Analyser l'erreur pour donner des conseils
      if (error.message.includes('sku')) {
        console.log(`   💡 Conseil: Conflit de SKU détecté. Le produit existe peut-être déjà.`);
      }

      throw error;
    }
  }

  async recreateAllLostProducts() {
    try {
      console.log('🚀 FORCE RECRÉATION DES PRODUITS PERDUS');
      console.log('═'.repeat(70));
      console.log('💡 Cette méthode ignore les anciens woo_id et force la création');
      console.log(`📦 ${this.lostProductIds.length} produits à recréer\n`);

      // 1. Lire les produits
      const allProducts = await this.readProductsFromFile();
      const lostProducts = allProducts.filter((p) => this.lostProductIds.includes(p._id));

      console.log(`✅ ${lostProducts.length} produits perdus trouvés en local`);

      if (lostProducts.length === 0) {
        console.log('❌ Aucun produit perdu trouvé en local !');
        return { success: 0, errors: [] };
      }

      // 2. Afficher le plan
      console.log('\n📋 PRODUITS À RECRÉER:');
      console.log('─'.repeat(70));
      lostProducts.forEach((product, i) => {
        const hasImages =
          (product.image && product.image.local_path) ||
          (product.gallery_images && product.gallery_images.some((img) => img.local_path));
        const imageCount =
          (product.image && product.image.local_path ? 1 : 0) +
          (product.gallery_images
            ? product.gallery_images.filter((img) => img.local_path).length
            : 0);

        console.log(`${i + 1}. ${product.name || 'Sans nom'}`);
        console.log(`   ID Local: ${product._id}`);
        console.log(`   Ancien woo_id: ${product.woo_id} (sera ignoré)`);
        console.log(`   SKU: ${product.sku || 'Aucun'}`);
        console.log(`   Images à synchroniser: ${imageCount}`);
        console.log('');
      });

      // 3. Confirmation
      console.log('⚠️  ATTENTION: Cette opération va créer de NOUVEAUX produits sur WooCommerce');
      console.log('   Les anciens woo_id seront remplacés par de nouveaux');
      console.log('\n⏳ Début de la recréation dans 5 secondes...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 4. Recréer chaque produit
      console.log('\n🔧 RECRÉATION EN COURS:');
      console.log('─'.repeat(70));

      const results = { success: 0, errors: [], totalImages: 0, newWooIds: [] };

      for (let i = 0; i < lostProducts.length; i++) {
        const product = lostProducts[i];

        try {
          console.log(`\n[${i + 1}/${lostProducts.length}] ${product.name || 'Sans nom'}`);
          console.log(`   ID Local: ${product._id}`);
          console.log(`   Ancien woo_id: ${product.woo_id}`);

          // Force la création
          const createResult = await this.forceCreateProduct(product);

          if (createResult.success) {
            // Mettre à jour la base locale avec le nouveau woo_id
            await this.updateProductInFile(product._id, {
              woo_id: createResult.newWooId,
              last_sync: new Date().toISOString(),
              website_url: createResult.wooProduct.permalink || null,
              // Mettre à jour les références d'images
              image:
                createResult.wooProduct.images && createResult.wooProduct.images[0]
                  ? {
                      ...product.image,
                      wp_id: createResult.wooProduct.images[0].id,
                      url: createResult.wooProduct.images[0].src,
                    }
                  : product.image,
              gallery_images: createResult.wooProduct.images
                ? createResult.wooProduct.images.slice(1).map((img, i) => ({
                    ...((product.gallery_images && product.gallery_images[i]) || {}),
                    wp_id: img.id,
                    url: img.src,
                  }))
                : product.gallery_images,
            });

            results.success++;
            results.totalImages += createResult.syncedImages;
            results.newWooIds.push({
              localId: product._id,
              name: product.name,
              oldWooId: product.woo_id,
              newWooId: createResult.newWooId,
            });

            console.log(`   ✅ Produit ${product._id} mis à jour en local`);
            console.log(`   🎉 SUCCÈS! ${createResult.syncedImages} image(s) synchronisée(s)`);
          }

          // Délai entre chaque produit
          if (i < lostProducts.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.log(`   ❌ ÉCHEC: ${error.message}`);
          results.errors.push({
            product_id: product._id,
            name: product.name,
            old_woo_id: product.woo_id,
            error: error.message,
          });
        }
      }

      // 5. Rapport final
      this.displayRecreationReport(results, lostProducts.length);

      return results;
    } catch (error) {
      console.error('❌ Erreur fatale:', error.message);
      throw error;
    }
  }

  displayRecreationReport(results, totalProducts) {
    console.log('\n═'.repeat(70));
    console.log('📊 RAPPORT DE RECRÉATION FORCÉE');
    console.log('═'.repeat(70));

    console.log(`\n📈 RÉSULTATS:`);
    console.log(`   📦 Produits traités: ${totalProducts}`);
    console.log(`   ✅ Succès: ${results.success}`);
    console.log(`   📸 Images synchronisées: ${results.totalImages}`);
    console.log(`   ❌ Erreurs: ${results.errors.length}`);

    if (results.newWooIds.length > 0) {
      console.log('\n🆔 NOUVEAUX WOO_ID ASSIGNÉS:');
      console.log('─'.repeat(50));
      results.newWooIds.forEach((item, i) => {
        console.log(`${i + 1}. ${item.name || 'Sans nom'}`);
        console.log(`   Local ID: ${item.localId}`);
        console.log(`   Ancien woo_id: ${item.oldWooId}`);
        console.log(`   ➡️  NOUVEAU woo_id: ${item.newWooId}`);
        console.log('');
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ ERREURS:');
      console.log('─'.repeat(50));
      results.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error.name || error.product_id}`);
        console.log(`   Ancien woo_id: ${error.old_woo_id}`);
        console.log(`   Erreur: ${error.error}`);
        console.log('');
      });
    }

    const successRate =
      totalProducts > 0 ? ((results.success / totalProducts) * 100).toFixed(1) : 0;

    console.log(`🎯 TAUX DE SUCCÈS: ${successRate}%`);

    if (results.success === totalProducts) {
      console.log('\n🎊 PARFAIT!');
      console.log('   Tous les produits perdus ont été recréés avec succès!');
      console.log(`   ${results.totalImages} images ont été synchronisées!`);
      console.log('   Vos produits sont maintenant disponibles sur WooCommerce!');
    } else if (results.success > 0) {
      console.log('\n✅ PARTIELLEMENT RÉUSSI');
      console.log(`   ${results.success} produits ont été recréés.`);
      console.log(`   ${results.totalImages} images ont été synchronisées.`);
    }

    console.log('\n💡 PROCHAINES ÉTAPES:');
    console.log('   1. Vérifier les nouveaux produits sur WooCommerce');
    console.log('   2. Relancer simpleSyncAnalyzer.js pour vérifier la synchronisation');
    console.log('   3. Les anciens liens WooCommerce seront brisés (normaux)');

    console.log('\n═'.repeat(70));
  }
}

// Fonction principale
async function forceRecreateProducts() {
  try {
    const recreator = new ProductRecreator();
    const results = await recreator.recreateAllLostProducts();

    console.log('\n✅ Recréation terminée!');
    return results;
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  forceRecreateProducts()
    .then(() => {
      console.log('\n🎉 Script terminé avec succès!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { ProductRecreator, forceRecreateProducts };
