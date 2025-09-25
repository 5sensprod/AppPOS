// findOrphanMatches.js - Trouve les produits locaux correspondant aux orphelins WooCommerce par SKU
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const WooCommerceClient = require('../services/base/WooCommerceClient');

class OrphanMatcher {
  constructor() {
    this.wooClient = new WooCommerceClient();
    this.dataPath = path.join(process.cwd(), 'data');
    console.log(`🔍 [MATCHER] Répertoire de données: ${this.dataPath}`);
  }

  async readProductsFromFile() {
    try {
      const productsPath = path.join(this.dataPath, 'products.db');

      const fileExists = await fs
        .access(productsPath)
        .then(() => true)
        .catch(() => false);
      if (!fileExists) {
        throw new Error(`Fichier products.db non trouvé: ${productsPath}`);
      }

      console.log(`📖 Lecture du fichier: ${productsPath}`);
      const fileContent = await fs.readFile(productsPath, 'utf8');

      if (!fileContent.trim()) {
        throw new Error('Fichier products.db vide');
      }

      const lines = fileContent.split('\n').filter((line) => line.trim());
      const products = [];

      for (const line of lines) {
        try {
          const product = JSON.parse(line);
          products.push(product);
        } catch (error) {
          // Ignorer les lignes JSON invalides
        }
      }

      console.log(`✅ ${products.length} produits lus`);
      return products;
    } catch (error) {
      console.error('❌ Erreur lecture fichier produits:', error.message);
      throw error;
    }
  }

  async getAllWooProducts() {
    const allProducts = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    console.log('🌐 Récupération des produits WooCommerce...');

    while (hasMore) {
      try {
        console.log(`   📄 Page ${page}...`);
        const response = await this.wooClient.get('products', {
          page: page,
          per_page: perPage,
          status: 'any',
        });

        const products = response.data;
        allProducts.push(...products);

        hasMore = products.length === perPage;
        page++;

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ Erreur page ${page}:`, error.message);
        hasMore = false;
      }
    }

    return allProducts;
  }

  // Normalise les SKUs pour la comparaison
  normalizeSku(sku) {
    if (!sku) return '';
    return sku.toString().toLowerCase().trim().replace(/\s+/g, ' ');
  }

  async findOrphanMatches() {
    try {
      console.log('🔍 RECHERCHE DES CORRESPONDANCES POUR ORPHELINS WOOCOMMERCE');
      console.log('═'.repeat(80));

      // 1. Charger les données
      console.log('\n📦 ÉTAPE 1: Chargement des données...');
      const [localProducts, wooProducts] = await Promise.all([
        this.readProductsFromFile(),
        this.getAllWooProducts(),
      ]);

      // 2. Identifier les produits synchronisés et non synchronisés
      const syncedProducts = localProducts.filter((p) => p.woo_id);
      const unsyncedProducts = localProducts.filter((p) => !p.woo_id);

      console.log(`🔗 Produits locaux synchronisés: ${syncedProducts.length}`);
      console.log(`❌ Produits locaux non synchronisés: ${unsyncedProducts.length}`);
      console.log(`🌐 Total produits WooCommerce: ${wooProducts.length}`);

      // 3. Identifier les orphelins WooCommerce
      const localWooIds = new Set(syncedProducts.map((p) => p.woo_id.toString()));
      const orphanWooProducts = wooProducts.filter((woo) => !localWooIds.has(woo.id.toString()));

      console.log(`🔵 Orphelins WooCommerce identifiés: ${orphanWooProducts.length}`);

      // 4. Créer des index pour la recherche par SKU
      const unsyncedBySku = new Map();
      unsyncedProducts.forEach((product) => {
        if (product.sku) {
          const normalizedSku = this.normalizeSku(product.sku);
          if (!unsyncedBySku.has(normalizedSku)) {
            unsyncedBySku.set(normalizedSku, []);
          }
          unsyncedBySku.get(normalizedSku).push(product);
        }
      });

      console.log(`📋 Produits locaux indexés par SKU: ${unsyncedBySku.size} SKUs uniques`);

      // 5. Rechercher les correspondances
      console.log('\n🔍 ÉTAPE 2: Recherche des correspondances par SKU...');

      const results = {
        exactMatches: [], // Correspondance SKU exacte (1:1)
        multipleMatches: [], // Plusieurs produits locaux pour un SKU WooCommerce
        noMatches: [], // Aucune correspondance trouvée
        duplicateWooSkus: [], // SKUs dupliqués côté WooCommerce
      };

      // Détecter les SKUs dupliqués côté WooCommerce d'abord
      const wooSkuCounts = new Map();
      orphanWooProducts.forEach((woo) => {
        if (woo.sku) {
          const normalizedSku = this.normalizeSku(woo.sku);
          if (!wooSkuCounts.has(normalizedSku)) {
            wooSkuCounts.set(normalizedSku, []);
          }
          wooSkuCounts.get(normalizedSku).push(woo);
        }
      });

      wooSkuCounts.forEach((wooProducts, sku) => {
        if (wooProducts.length > 1) {
          results.duplicateWooSkus.push({
            sku: sku,
            wooProducts: wooProducts,
          });
        }
      });

      // Traiter chaque orphelin WooCommerce
      for (const wooProduct of orphanWooProducts) {
        if (!wooProduct.sku) {
          results.noMatches.push({
            wooProduct: wooProduct,
            reason: 'Pas de SKU côté WooCommerce',
          });
          continue;
        }

        const normalizedWooSku = this.normalizeSku(wooProduct.sku);
        const matchingLocalProducts = unsyncedBySku.get(normalizedWooSku) || [];

        if (matchingLocalProducts.length === 0) {
          results.noMatches.push({
            wooProduct: wooProduct,
            reason: 'Aucun produit local trouvé avec ce SKU',
          });
        } else if (matchingLocalProducts.length === 1) {
          results.exactMatches.push({
            wooProduct: wooProduct,
            localProduct: matchingLocalProducts[0],
            sku: normalizedWooSku,
          });
        } else {
          results.multipleMatches.push({
            wooProduct: wooProduct,
            localProducts: matchingLocalProducts,
            sku: normalizedWooSku,
          });
        }
      }

      // 6. Afficher les résultats
      this.displayMatchingResults(results);

      return results;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche:', error.message);
      throw error;
    }
  }

  displayMatchingResults(results) {
    console.log('\n═'.repeat(80));
    console.log('📊 RÉSULTATS DE LA RECHERCHE DE CORRESPONDANCES');
    console.log('═'.repeat(80));

    console.log('\n📈 RÉSUMÉ:');
    console.log(`   ✅ Correspondances exactes (1:1): ${results.exactMatches.length}`);
    console.log(`   ⚠️  Correspondances multiples (1:N): ${results.multipleMatches.length}`);
    console.log(`   ❌ Aucune correspondance: ${results.noMatches.length}`);
    console.log(`   🔄 SKUs dupliqués sur WooCommerce: ${results.duplicateWooSkus.length}`);

    // Correspondances exactes - c'est ce qui nous intéresse le plus !
    if (results.exactMatches.length > 0) {
      console.log('\n✅ CORRESPONDANCES EXACTES (Prêtes à resynchroniser):');
      console.log('─'.repeat(80));

      results.exactMatches.forEach((match, index) => {
        const woo = match.wooProduct;
        const local = match.localProduct;

        console.log(`${(index + 1).toString().padStart(2)}. SKU: ${match.sku}`);
        console.log(`    🌐 WooCommerce: ${woo.name} (ID: ${woo.id})`);
        console.log(`    📦 Local: ${local.name || 'Sans nom'} (ID: ${local._id})`);
        console.log(`    📅 WooCommerce créé le: ${woo.date_created}`);
        console.log(`    💰 Prix WooCommerce: ${woo.price || 'N/A'}`);
        console.log(`    🏷️  Statut WooCommerce: ${woo.status}`);

        // Vérifier si le produit WooCommerce a des images
        const hasImages = woo.images && woo.images.length > 0;
        console.log(
          `    🖼️  Images WooCommerce: ${hasImages ? `${woo.images.length} image(s)` : 'Aucune'}`
        );

        console.log('');
      });

      console.log(
        `💡 CES ${results.exactMatches.length} PRODUITS PEUVENT ÊTRE RESYNCHRONISÉS AUTOMATIQUEMENT`
      );
    }

    // Correspondances multiples
    if (results.multipleMatches.length > 0) {
      console.log('\n⚠️  CORRESPONDANCES MULTIPLES (Nécessitent une vérification manuelle):');
      console.log('─'.repeat(80));

      results.multipleMatches.forEach((match, index) => {
        const woo = match.wooProduct;

        console.log(`${(index + 1).toString().padStart(2)}. SKU: ${match.sku}`);
        console.log(`    🌐 WooCommerce: ${woo.name} (ID: ${woo.id})`);
        console.log(`    📦 Produits locaux trouvés (${match.localProducts.length}):`);

        match.localProducts.forEach((local, i) => {
          console.log(`       ${i + 1}. ${local.name || 'Sans nom'} (ID: ${local._id})`);
        });
        console.log('');
      });
    }

    // SKUs dupliqués WooCommerce
    if (results.duplicateWooSkus.length > 0) {
      console.log('\n🔄 SKUs DUPLIQUÉS SUR WOOCOMMERCE (À nettoyer en priorité):');
      console.log('─'.repeat(80));

      results.duplicateWooSkus.forEach((duplicate, index) => {
        console.log(`${(index + 1).toString().padStart(2)}. SKU: ${duplicate.sku}`);
        duplicate.wooProducts.forEach((woo, i) => {
          console.log(`       ${i + 1}. ${woo.name} (ID: ${woo.id}) - Créé: ${woo.date_created}`);
        });
        console.log('');
      });
    }

    // Pas de correspondances
    if (results.noMatches.length > 0) {
      console.log('\n❌ AUCUNE CORRESPONDANCE TROUVÉE:');
      console.log('─'.repeat(80));

      results.noMatches.slice(0, 5).forEach((item, index) => {
        const woo = item.wooProduct;
        console.log(
          `${(index + 1).toString().padStart(2)}. ${woo.name} (SKU: ${woo.sku || 'N/A'})`
        );
        console.log(`    WooID: ${woo.id}`);
        console.log(`    Raison: ${item.reason}`);
        console.log('');
      });

      if (results.noMatches.length > 5) {
        console.log(`    ... et ${results.noMatches.length - 5} autres sans correspondance\n`);
      }
    }

    console.log('\n💡 PROCHAINES ÉTAPES RECOMMANDÉES:');
    console.log('─'.repeat(80));
    if (results.exactMatches.length > 0) {
      console.log(
        `🔧 PRIORITÉ 1: Resynchroniser ${results.exactMatches.length} correspondances exactes`
      );
      console.log(
        '   → Mettre à jour les woo_id locaux et récupérer les images/données WooCommerce'
      );
    }
    if (results.duplicateWooSkus.length > 0) {
      console.log(
        `🧹 PRIORITÉ 2: Nettoyer ${results.duplicateWooSkus.length} doublons SKU sur WooCommerce`
      );
    }
    if (results.multipleMatches.length > 0) {
      console.log(
        `👁️  PRIORITÉ 3: Examiner manuellement ${results.multipleMatches.length} correspondances multiples`
      );
    }

    console.log('\n═'.repeat(80));
  }

  // Générer la liste des IDs pour resynchronisation
  generateResyncList(results) {
    const resyncData = results.exactMatches.map((match) => ({
      localId: match.localProduct._id,
      localName: match.localProduct.name,
      localSku: match.localProduct.sku,
      wooId: match.wooProduct.id,
      wooName: match.wooProduct.name,
      wooImages: match.wooProduct.images || [],
    }));

    return resyncData;
  }
}

// Fonction principale
async function runOrphanMatching() {
  try {
    const matcher = new OrphanMatcher();
    const results = await matcher.findOrphanMatches();

    // Sauvegarder les résultats
    const reportPath = `./reports/orphan_matching_${Date.now()}.json`;
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        exactMatches: results.exactMatches.length,
        multipleMatches: results.multipleMatches.length,
        noMatches: results.noMatches.length,
        duplicateWooSkus: results.duplicateWooSkus.length,
      },
      resyncList: matcher.generateResyncList(results),
      details: results,
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Rapport détaillé sauvegardé: ${reportPath}`);

    console.log('\n✅ Recherche de correspondances terminée avec succès!');
    console.log(`🎯 ${results.exactMatches.length} produits prêts à être resynchronisés`);

    return results;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  runOrphanMatching()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { OrphanMatcher, runOrphanMatching };
