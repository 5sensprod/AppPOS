// simpleResyncOrphans.js - Script simple pour resynchroniser les produits orphelins
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const WooCommerceClient = require('../services/base/WooCommerceClient');

// LISTE DES PRODUITS A RESYNCHRONISER
const product_ids = [
  { localId: 'NCRYRUGGObnxfRZY', wooId: 25107729, sku: 'TETE 75712' },
  { localId: 'zAC42xS3oI5uKi2A', wooId: 25107720, sku: 'OSLOPRO-GB' },
  { localId: 'mpWjbXIXFHh71THI', wooId: 25107711, sku: 'LX10' },
  { localId: '8W00LgGr7RSunBWO', wooId: 25107709, sku: 'LSM9 VERT' },
  { localId: '22y975AkMjQuRWVG', wooId: 25107693, sku: 'CAU BLEU' },
  { localId: 'ExzLWXM9LWRzZRlL', wooId: 25107685, sku: 'APM30' },
  { localId: 'aKHyMi0n4qjFGK13', wooId: 25105598, sku: 'Gewa Violon Allegro 3/4' },
  { localId: 'gtTSPPJf9IIqsKyH', wooId: 25105592, sku: 'VS1544' },
  { localId: 'o3YjYRDvRNwC3LO2', wooId: 25105590, sku: 'VS034' },
  { localId: 'Tr7NXt6lwQF0bpu7', wooId: 25105435, sku: '210/20' },
];

class SimpleResyncer {
  constructor() {
    this.wooClient = new WooCommerceClient();
    this.dataPath = path.join(process.cwd(), 'data');
    this.publicPath = path.join(process.cwd(), 'public', 'products');
  }

  async loadProducts() {
    const productsPath = path.join(this.dataPath, 'products.db');
    const fileContent = await fs.readFile(productsPath, 'utf8');
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
    const productsPath = path.join(this.dataPath, 'products.db');
    const backupPath = path.join(this.dataPath, `products.db.backup.${Date.now()}`);

    // Sauvegarde
    await fs.copyFile(productsPath, backupPath);
    console.log(`Sauvegarde: ${backupPath}`);

    // Sauvegarder
    const content = products.map((p) => JSON.stringify(p)).join('\n');
    await fs.writeFile(productsPath, content);
  }

  async getWooProduct(wooId) {
    const response = await this.wooClient.get(`products/${wooId}`);
    return response.data;
  }

  async downloadImage(imageUrl, localProductId, imageName) {
    return new Promise((resolve, reject) => {
      // Créer dossier produit
      const productDir = path.join(this.publicPath, localProductId);
      fs.mkdir(productDir, { recursive: true });

      // Nom fichier
      const timestamp = Date.now();
      const extension = path.extname(imageName) || '.jpg';
      const fileName = `${imageName.replace(/[^a-zA-Z0-9.-]/g, '-')}-${timestamp}${extension}`;
      const localPath = path.join(productDir, fileName);
      const relativePath = `/public/products/${localProductId}/${fileName}`;

      const client = imageUrl.startsWith('https:') ? https : http;
      const file = require('fs').createWriteStream(localPath);

      client
        .get(imageUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            fs.stat(localPath)
              .then((stats) => {
                resolve({
                  _id: uuidv4(),
                  wp_id: null,
                  url: imageUrl,
                  src: relativePath,
                  local_path: localPath,
                  status: 'active',
                  type: extension.slice(1),
                  metadata: {
                    original_name: imageName,
                    size: stats.size,
                    mimetype:
                      extension === '.jpg' || extension === '.jpeg'
                        ? 'image/jpeg'
                        : `image/${extension.slice(1)}`,
                  },
                });
              })
              .catch(reject);
          });

          file.on('error', reject);
        })
        .on('error', reject);
    });
  }

  async resyncProducts() {
    console.log('RESYNCHRONISATION SIMPLE DES PRODUITS ORPHELINS');
    console.log('================================================');

    // Charger produits locaux
    const products = await this.loadProducts();
    const productsById = new Map();
    products.forEach((p) => productsById.set(p._id, p));

    let success = 0;
    let errors = 0;

    // Boucle sur les produits à resynchroniser
    for (const item of product_ids) {
      try {
        console.log(`\nTraitement ${item.sku} (Local: ${item.localId}, Woo: ${item.wooId})`);

        const localProduct = productsById.get(item.localId);
        if (!localProduct) {
          console.log(`  ERREUR: Produit local non trouvé`);
          errors++;
          continue;
        }

        // Récupérer données WooCommerce
        const wooProduct = await this.getWooProduct(item.wooId);
        console.log(`  WooCommerce: ${wooProduct.name}`);

        // Mettre à jour le produit local
        localProduct.woo_id = wooProduct.id;
        localProduct.last_sync = new Date().toISOString();
        localProduct.pending_sync = false;

        // Synchroniser nom et prix si différents
        if (wooProduct.name !== localProduct.name) {
          console.log(`  Nom: "${localProduct.name}" -> "${wooProduct.name}"`);
          localProduct.name = wooProduct.name;
          localProduct.designation = wooProduct.name;
        }

        if (parseFloat(wooProduct.price) !== localProduct.price) {
          console.log(`  Prix: ${localProduct.price} -> ${wooProduct.price}`);
          localProduct.price = parseFloat(wooProduct.price);
        }

        // Télécharger images WooCommerce
        if (wooProduct.images && wooProduct.images.length > 0) {
          console.log(`  Téléchargement de ${wooProduct.images.length} image(s)`);

          const downloadedImages = [];
          for (let i = 0; i < wooProduct.images.length; i++) {
            const wooImage = wooProduct.images[i];
            try {
              const downloadedImage = await this.downloadImage(
                wooImage.src,
                localProduct._id,
                wooImage.name || `image-${i + 1}`
              );
              downloadedImage.wp_id = wooImage.id;
              downloadedImages.push(downloadedImage);
              console.log(`    Image ${i + 1} téléchargée`);
            } catch (imageError) {
              console.log(`    ERREUR image ${i + 1}: ${imageError.message}`);
            }
          }

          // Ajouter les images au produit
          if (downloadedImages.length > 0) {
            const existingImages = localProduct.gallery_images || [];
            localProduct.gallery_images = [...existingImages, ...downloadedImages];
            localProduct.image = downloadedImages[0]; // Première image comme principale
            console.log(`  ${downloadedImages.length} image(s) ajoutée(s)`);
          }
        }

        console.log(`  ✓ SUCCES`);
        success++;

        // Délai entre les produits
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.log(`  ✗ ERREUR: ${error.message}`);
        errors++;
      }
    }

    // Sauvegarder les modifications
    if (success > 0) {
      await this.saveProducts(products);
      console.log('\nModifications sauvegardées');
    }

    // Résumé
    console.log('\n================================================');
    console.log(`RÉSUMÉ: ${success} succès, ${errors} erreurs`);
    console.log('================================================');

    return { success, errors };
  }
}

// Exécution
async function run() {
  try {
    const resyncer = new SimpleResyncer();
    await resyncer.resyncProducts();
    process.exit(0);
  } catch (error) {
    console.error('ERREUR FATALE:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

module.exports = { SimpleResyncer };
