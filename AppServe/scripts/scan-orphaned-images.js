// AppServe\scripts\scan-orphaned-images.js
// Script pour identifier les produits avec des images WooCommerce orphelines

const path = require('path');
const fs = require('fs');

// Import du système de base de données
const { database, waitForInitialization } = require('../config/database');

/**
 * Vérifie si une image contient un woo_id ou une URL WooCommerce
 */
function hasWooData(image) {
  if (!image) return false;

  // Vérifier wp_id (ancien nom de woo_id)
  if (image.wp_id || image.woo_id) return true;

  // Vérifier si l'URL contient wp-content (indicateur WooCommerce)
  if (image.url && image.url.includes('wp-content')) return true;

  return false;
}

/**
 * Analyse un produit pour détecter les images orphelines
 */
function analyzeProduct(product) {
  const issues = [];

  // Vérifier l'image principale
  if (product.image && hasWooData(product.image)) {
    issues.push({
      type: 'main_image',
      wp_id: product.image.wp_id || product.image.woo_id,
      url: product.image.url,
      image_id: product.image._id,
    });
  }

  // Vérifier la galerie
  if (product.gallery_images && Array.isArray(product.gallery_images)) {
    product.gallery_images.forEach((img, index) => {
      if (hasWooData(img)) {
        issues.push({
          type: 'gallery_image',
          index: index,
          wp_id: img.wp_id || img.woo_id,
          url: img.url,
          image_id: img._id,
        });
      }
    });
  }

  return issues;
}

/**
 * Fonction principale de scan
 */
async function scanOrphanedImages() {
  try {
    console.log('🔍 [SCAN] Démarrage du scan des images orphelines...\n');

    // Attendre l'initialisation de la base de données
    await waitForInitialization();

    const productsStore = database.getStore('products');

    if (!productsStore) {
      throw new Error('Store products non disponible');
    }

    // Récupérer tous les produits
    const products = await new Promise((resolve, reject) => {
      productsStore.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    console.log(`📊 Total de produits à analyser: ${products.length}\n`);

    // Analyser chaque produit
    const orphanedProducts = [];
    let totalOrphanedImages = 0;

    for (const product of products) {
      // Ignorer les produits qui ont déjà un woo_id
      if (product.woo_id) continue;

      const issues = analyzeProduct(product);

      if (issues.length > 0) {
        orphanedProducts.push({
          _id: product._id,
          sku: product.sku,
          name: product.name,
          status: product.status,
          images_count: issues.length,
          issues: issues,
        });
        totalOrphanedImages += issues.length;
      }
    }

    // Afficher les résultats
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 RÉSULTATS DU SCAN');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`✅ Produits analysés: ${products.length}`);
    console.log(`⚠️  Produits avec images orphelines: ${orphanedProducts.length}`);
    console.log(`🖼️  Total d'images orphelines: ${totalOrphanedImages}\n`);

    if (orphanedProducts.length > 0) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📝 DÉTAILS DES PRODUITS CONCERNÉS');
      console.log('═══════════════════════════════════════════════════════════\n');

      orphanedProducts.forEach((prod, index) => {
        console.log(`\n${index + 1}. ${prod.name} (${prod.sku})`);
        console.log(`   ID: ${prod._id}`);
        console.log(`   Statut: ${prod.status}`);
        console.log(`   Images orphelines: ${prod.images_count}`);

        prod.issues.forEach((issue, i) => {
          console.log(`\n   ${i + 1}) Type: ${issue.type}`);
          console.log(`      WP_ID: ${issue.wp_id || 'N/A'}`);
          console.log(`      Image ID: ${issue.image_id}`);
          console.log(`      URL: ${issue.url || 'N/A'}`);
          if (issue.index !== undefined) {
            console.log(`      Position galerie: ${issue.index}`);
          }
        });

        console.log('\n   ───────────────────────────────────────────────────');
      });

      // Sauvegarder le rapport dans un fichier JSON
      const reportPath = path.join(__dirname, '../data/orphaned-images-report.json');
      const report = {
        generated_at: new Date().toISOString(),
        summary: {
          total_products: products.length,
          orphaned_products: orphanedProducts.length,
          total_orphaned_images: totalOrphanedImages,
        },
        products: orphanedProducts,
      };

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
      console.log(`\n\n💾 Rapport sauvegardé: ${reportPath}`);
    } else {
      console.log('✅ Aucune image orpheline détectée !\n');
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Scan terminé avec succès');
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ [ERREUR] Échec du scan:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécution du script
if (require.main === module) {
  scanOrphanedImages();
}

module.exports = { scanOrphanedImages, analyzeProduct, hasWooData };
