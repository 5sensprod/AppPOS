#!/usr/bin/env node
// scripts/compare-images.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Configuration
const MY_DB = path.join(__dirname, '../data/products.db');
const CLIENT_DB = path.join(__dirname, '../data/source/products-axe.db');

// Extraire le gencode
function getGencode(product) {
  let gencode = product.gencode || product.barcode || product.ean || product.upc || '';

  if (!gencode && product.meta_data && Array.isArray(product.meta_data)) {
    const meta = product.meta_data.find(
      (m) => m.key === 'barcode' || m.key === 'gencode' || m.key === 'ean' || m.key === 'upc'
    );
    if (meta && meta.value) gencode = meta.value;
  }

  return gencode ? String(gencode).trim() : '';
}

// Extraire les URLs d'images d'un produit
function extractImageUrls(product) {
  const urls = {
    main: null,
    gallery: [],
  };

  // Image principale
  if (product.image && product.image.url) {
    urls.main = product.image.url;
  }

  // Galerie d'images
  if (product.gallery_images && Array.isArray(product.gallery_images)) {
    urls.gallery = product.gallery_images.filter((img) => img && img.url).map((img) => img.url);
  }

  return urls;
}

async function compareImages() {
  console.log('🖼️  COMPARAISON DES IMAGES\n');
  console.log('📌 Source de vérité: VOTRE BASE\n');

  // Charger les bases
  const myDb = new Datastore({ filename: MY_DB, autoload: true });
  const clientDb = new Datastore({ filename: CLIENT_DB, autoload: true });

  const myProducts = await new Promise((resolve, reject) => {
    myDb.find({}, (err, docs) => (err ? reject(err) : resolve(docs)));
  });

  const clientProducts = await new Promise((resolve, reject) => {
    clientDb.find({}, (err, docs) => (err ? reject(err) : resolve(docs)));
  });

  console.log(`Votre base: ${myProducts.length} produits`);
  console.log(`Base client: ${clientProducts.length} produits\n`);

  // Indexer les produits client
  const clientMap = new Map();
  clientProducts.forEach((p) => {
    clientMap.set(p._id, p);
    const gencode = getGencode(p);
    if (gencode) clientMap.set(`g_${gencode}`, p);
    if (p.sku) clientMap.set(`s_${p.sku}`, p);
  });

  // Analyser les différences d'images
  const results = {
    withNewImages: [], // Client a ajouté des images
    withMissingImages: [], // Client a retiré des images
    identical: 0, // Images identiques
  };

  myProducts.forEach((myP) => {
    // Trouver le produit correspondant chez le client
    let clientP = clientMap.get(myP._id);
    if (!clientP) {
      const gencode = getGencode(myP);
      if (gencode) clientP = clientMap.get(`g_${gencode}`);
    }
    if (!clientP && myP.sku) {
      clientP = clientMap.get(`s_${myP.sku}`);
    }

    if (clientP) {
      const myImages = extractImageUrls(myP);
      const clientImages = extractImageUrls(clientP);

      const changes = {
        newMain: null,
        removedMain: false,
        newGallery: [],
        removedGallery: [],
      };

      // Comparer l'image principale
      if (myImages.main !== clientImages.main) {
        if (myImages.main && !clientImages.main) {
          changes.removedMain = true;
        } else if (!myImages.main && clientImages.main) {
          changes.newMain = clientImages.main;
        } else if (myImages.main && clientImages.main) {
          changes.newMain = clientImages.main;
        }
      }

      // Comparer la galerie
      const myGallerySet = new Set(myImages.gallery);
      const clientGallerySet = new Set(clientImages.gallery);

      // Nouvelles images dans la galerie client
      clientImages.gallery.forEach((url) => {
        if (!myGallerySet.has(url)) {
          changes.newGallery.push(url);
        }
      });

      // Images supprimées de la galerie client
      myImages.gallery.forEach((url) => {
        if (!clientGallerySet.has(url)) {
          changes.removedGallery.push(url);
        }
      });

      // Déterminer le statut
      const hasChanges =
        changes.newMain ||
        changes.removedMain ||
        changes.newGallery.length > 0 ||
        changes.removedGallery.length > 0;

      if (hasChanges) {
        const hasNewImages = changes.newMain || changes.newGallery.length > 0;
        const hasMissingImages = changes.removedMain || changes.removedGallery.length > 0;

        const productInfo = {
          id: myP._id,
          sku: myP.sku || 'N/A',
          name: myP.name || 'N/A',
          changes: changes,
          myImages: myImages,
          clientImages: clientImages,
        };

        if (hasNewImages) {
          results.withNewImages.push(productInfo);
        }
        if (hasMissingImages) {
          results.withMissingImages.push(productInfo);
        }
      } else {
        results.identical++;
      }
    }
  });

  // Afficher les résultats
  console.log('📊 RÉSULTATS\n');
  console.log(`✅ Images identiques: ${results.identical} produits`);
  console.log(`🆕 Client a ajouté des images: ${results.withNewImages.length} produits`);
  console.log(`❌ Client a retiré des images: ${results.withMissingImages.length} produits\n`);

  // Afficher les produits avec nouvelles images
  if (results.withNewImages.length > 0) {
    console.log('🆕 PRODUITS AVEC NOUVELLES IMAGES:\n');
    console.log('='.repeat(70));

    results.withNewImages.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   ID: ${product.id} | SKU: ${product.sku}`);

      if (product.changes.newMain) {
        console.log(`   🖼️  Nouvelle image principale:`);
        console.log(`      ${product.changes.newMain}`);
      }

      if (product.changes.newGallery.length > 0) {
        console.log(`   🖼️  Nouvelles images galerie (${product.changes.newGallery.length}):`);
        product.changes.newGallery.forEach((url, i) => {
          console.log(`      ${i + 1}. ${url}`);
        });
      }

      console.log('-'.repeat(70));
    });
  }

  // Afficher les produits avec images manquantes
  if (results.withMissingImages.length > 0) {
    console.log('\n❌ PRODUITS AVEC IMAGES MANQUANTES:\n');
    console.log('='.repeat(70));

    results.withMissingImages.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   ID: ${product.id} | SKU: ${product.sku}`);

      if (product.changes.removedMain) {
        console.log(`   ⚠️  Image principale supprimée chez le client`);
        console.log(`      Votre URL: ${product.myImages.main}`);
      }

      if (product.changes.removedGallery.length > 0) {
        console.log(`   ⚠️  Images galerie supprimées (${product.changes.removedGallery.length}):`);
        product.changes.removedGallery.forEach((url, i) => {
          console.log(`      ${i + 1}. ${url}`);
        });
      }

      console.log('-'.repeat(70));
    });
  }

  // Export du rapport
  const exportPath = path.join(__dirname, '../data/export');
  fs.mkdirSync(exportPath, { recursive: true });

  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const filePath = path.join(exportPath, `comparaison-images_${timestamp}.txt`);

  let content = `COMPARAISON DES IMAGES
Généré le: ${new Date().toLocaleString('fr-FR')}
Source de vérité: VOTRE BASE DE DONNÉES

Images identiques: ${results.identical}
Produits avec nouvelles images: ${results.withNewImages.length}
Produits avec images manquantes: ${results.withMissingImages.length}
========================================

`;

  if (results.withNewImages.length > 0) {
    content += '\n🆕 PRODUITS AVEC NOUVELLES IMAGES\n\n';

    results.withNewImages.forEach((product, index) => {
      content += `${index + 1}. ${product.name}\n`;
      content += `ID: ${product.id}\n`;
      content += `SKU: ${product.sku}\n\n`;

      if (product.changes.newMain) {
        content += `Nouvelle image principale:\n`;
        content += `  ${product.changes.newMain}\n\n`;
      }

      if (product.changes.newGallery.length > 0) {
        content += `Nouvelles images galerie (${product.changes.newGallery.length}):\n`;
        product.changes.newGallery.forEach((url, i) => {
          content += `  ${i + 1}. ${url}\n`;
        });
        content += '\n';
      }

      content += '-'.repeat(70) + '\n\n';
    });
  }

  if (results.withMissingImages.length > 0) {
    content += '\n❌ PRODUITS AVEC IMAGES MANQUANTES\n\n';

    results.withMissingImages.forEach((product, index) => {
      content += `${index + 1}. ${product.name}\n`;
      content += `ID: ${product.id}\n`;
      content += `SKU: ${product.sku}\n\n`;

      if (product.changes.removedMain) {
        content += `Image principale supprimée:\n`;
        content += `  Votre URL: ${product.myImages.main}\n\n`;
      }

      if (product.changes.removedGallery.length > 0) {
        content += `Images galerie supprimées (${product.changes.removedGallery.length}):\n`;
        product.changes.removedGallery.forEach((url, i) => {
          content += `  ${i + 1}. ${url}\n`;
        });
        content += '\n';
      }

      content += '-'.repeat(70) + '\n\n';
    });
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`\n✅ Rapport exporté: ${filePath}`);
}

// Lancer
compareImages().catch((err) => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
