// verifyWooIds.js - Vérification ultra-simple des woo_id
const fs = require('fs').promises;
const path = require('path');

async function verifyWooIds() {
  try {
    console.log('🔍 VÉRIFICATION ULTRA-SIMPLE DES WOO_ID');
    console.log('═'.repeat(50));

    // Charger produits locaux
    const productsPath = path.join(process.cwd(), 'data', 'products.db');
    const fileContent = await fs.readFile(productsPath, 'utf8');
    const lines = fileContent.split('\n').filter((line) => line.trim());

    const products = [];
    for (const line of lines) {
      try {
        products.push(JSON.parse(line));
      } catch (error) {
        // Ignorer
      }
    }

    console.log(`📦 Total produits locaux: ${products.length}`);

    // Analyser les woo_id
    const withWooId = products.filter((p) => p.woo_id);
    const withoutWooId = products.filter((p) => !p.woo_id);

    console.log(`🔗 Produits AVEC woo_id: ${withWooId.length}`);
    console.log(`❌ Produits SANS woo_id: ${withoutWooId.length}`);

    // Vérifier les doublons de woo_id
    const wooIdCounts = new Map();
    const duplicates = [];

    withWooId.forEach((product) => {
      const wooId = product.woo_id.toString();
      if (!wooIdCounts.has(wooId)) {
        wooIdCounts.set(wooId, []);
      }
      wooIdCounts.get(wooId).push(product);
    });

    wooIdCounts.forEach((products, wooId) => {
      if (products.length > 1) {
        duplicates.push({ wooId, products });
      }
    });

    console.log(`🔢 woo_id uniques: ${wooIdCounts.size}`);
    console.log(`🔄 woo_id dupliqués: ${duplicates.length}`);

    // Afficher les doublons s'il y en a
    if (duplicates.length > 0) {
      console.log('\n🔄 DOUBLONS DE WOO_ID DÉTECTÉS:');
      console.log('─'.repeat(50));

      duplicates.forEach((duplicate, index) => {
        console.log(
          `${index + 1}. woo_id: ${duplicate.wooId} (${duplicate.products.length} produits)`
        );
        duplicate.products.forEach((product, i) => {
          console.log(`   ${i + 1}. ${product.name || 'Sans nom'} (${product._id})`);
          console.log(`      SKU: ${product.sku || 'N/A'}`);
        });
        console.log('');
      });

      const totalDuplicateProducts = duplicates.reduce((sum, dup) => sum + dup.products.length, 0);
      const uniqueWooIds = duplicates.length;
      const extraProducts = totalDuplicateProducts - uniqueWooIds;

      console.log(`📊 EXPLICATION DE L'ÉCART:`);
      console.log(`   Produits avec woo_id: ${withWooId.length}`);
      console.log(`   woo_id uniques: ${wooIdCounts.size}`);
      console.log(`   Produits en trop (doublons): ${extraProducts}`);
      console.log(`   → C'est pourquoi ${wooIdCounts.size} ≠ ${withWooId.length}`);
    } else {
      console.log('\n✅ Aucun doublon détecté');
      console.log('Tous les woo_id sont uniques');
    }

    // Vérification supplémentaire : woo_id null/undefined
    const nullWooIds = products.filter(
      (p) => p.woo_id === null || p.woo_id === undefined || p.woo_id === ''
    );
    const reallyWithWooId = products.filter(
      (p) => p.woo_id && p.woo_id !== '' && p.woo_id !== null && p.woo_id !== undefined
    );

    console.log('\n🔍 VÉRIFICATION SUPPLÉMENTAIRE:');
    console.log(`   woo_id null/undefined/vide: ${nullWooIds.length}`);
    console.log(`   woo_id réellement présents: ${reallyWithWooId.length}`);

    // Sauvegarder le rapport
    const report = {
      timestamp: new Date().toISOString(),
      totalProducts: products.length,
      withWooId: withWooId.length,
      withoutWooId: withoutWooId.length,
      uniqueWooIds: wooIdCounts.size,
      duplicates: duplicates.map((d) => ({
        wooId: d.wooId,
        count: d.products.length,
        products: d.products.map((p) => ({
          id: p._id,
          name: p.name,
          sku: p.sku,
        })),
      })),
    };

    await fs.writeFile('./reports/woo_id_verification.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Rapport sauvegardé: ./reports/woo_id_verification.json');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

if (require.main === module) {
  verifyWooIds();
}

module.exports = { verifyWooIds };
