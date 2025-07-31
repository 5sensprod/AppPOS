// simpleSyncAnalyzer.js - Version simplifiée qui lit directement les fichiers DB
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const WooCommerceClient = require('./services/base/WooCommerceClient');

class SimpleSyncAnalyzer {
  constructor() {
    this.wooClient = new WooCommerceClient();
    // En mode développement, les données sont dans ./data
    this.dataPath = path.join(process.cwd(), 'data');
    console.log(`📁 [ANALYZER] Répertoire de données: ${this.dataPath}`);
  }

  async readProductsFromFile() {
    try {
      const productsPath = path.join(this.dataPath, 'products.db');

      // Vérifier que le fichier existe
      const fileExists = await fs
        .access(productsPath)
        .then(() => true)
        .catch(() => false);
      if (!fileExists) {
        throw new Error(`Fichier products.db non trouvé: ${productsPath}`);
      }

      console.log(`📖 [ANALYZER] Lecture du fichier: ${productsPath}`);

      const fileContent = await fs.readFile(productsPath, 'utf8');

      if (!fileContent.trim()) {
        console.warn('⚠️ [ANALYZER] Fichier products.db vide');
        return [];
      }

      const lines = fileContent.split('\n').filter((line) => line.trim());
      const products = [];
      let validLines = 0;
      let invalidLines = 0;

      for (const line of lines) {
        try {
          const product = JSON.parse(line);
          products.push(product);
          validLines++;
        } catch (error) {
          invalidLines++;
          if (invalidLines <= 3) {
            // Afficher seulement les 3 premières erreurs
            console.warn(`⚠️ Ligne JSON invalide: ${line.substring(0, 50)}...`);
          }
        }
      }

      console.log(`✅ [ANALYZER] ${validLines} produits valides lus`);
      if (invalidLines > 0) {
        console.log(`⚠️ [ANALYZER] ${invalidLines} lignes ignorées (JSON invalide)`);
      }

      return products;
    } catch (error) {
      console.error('❌ [ANALYZER] Erreur lecture fichier produits:', error.message);
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

        // Délai pour éviter de surcharger l'API
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ Erreur page ${page}:`, error.message);
        hasMore = false;
      }
    }

    return allProducts;
  }

  async analyze() {
    try {
      console.log('🔍 ANALYSE SIMPLIFIÉE DES DIFFÉRENCES DE SYNCHRONISATION');
      console.log('═'.repeat(80));

      // 1. Lire les produits locaux depuis le fichier
      console.log('\n📦 ÉTAPE 1: Lecture des produits locaux...');
      const localProducts = await this.readProductsFromFile();
      console.log(`✅ ${localProducts.length} produits trouvés en local`);

      // 2. Filtrer les produits avec woo_id
      console.log('\n🔗 ÉTAPE 2: Analyse des produits synchronisés...');
      const syncedProducts = localProducts.filter((p) => p.woo_id);
      const unsyncedProducts = localProducts.filter((p) => !p.woo_id);

      console.log(`✅ ${syncedProducts.length} produits avec woo_id (synchronisés)`);
      console.log(`❌ ${unsyncedProducts.length} produits sans woo_id (non synchronisés)`);

      // 3. Récupérer les produits WooCommerce
      console.log('\n🌐 ÉTAPE 3: Récupération des produits WooCommerce...');
      const wooProducts = await this.getAllWooProducts();
      console.log(`✅ ${wooProducts.length} produits trouvés sur WooCommerce`);

      // 4. Analyser les différences
      console.log('\n🔍 ÉTAPE 4: Analyse des différences...');
      const localWooIds = new Set(syncedProducts.map((p) => p.woo_id.toString()));
      const wooIds = new Set(wooProducts.map((p) => p.id.toString()));

      // Produits locaux manquants sur WooCommerce
      const missingOnWoo = syncedProducts.filter((p) => !wooIds.has(p.woo_id.toString()));

      // Produits WooCommerce non référencés en local
      const missingInLocal = wooProducts.filter((p) => !localWooIds.has(p.id.toString()));

      // Produits correctement synchronisés
      const correctlySynced = syncedProducts.filter((p) => wooIds.has(p.woo_id.toString()));

      console.log(
        `🔍 Produits locaux avec woo_id mais manquants sur WooCommerce: ${missingOnWoo.length}`
      );
      console.log(`🔍 Produits WooCommerce non référencés en local: ${missingInLocal.length}`);
      console.log(`✅ Produits correctement synchronisés: ${correctlySynced.length}`);

      // 5. Afficher le rapport
      this.displaySimpleReport({
        totalLocal: localProducts.length,
        totalSynced: syncedProducts.length,
        totalUnsyncedLocal: unsyncedProducts.length,
        totalWoo: wooProducts.length,
        correctlySynced: correctlySynced.length,
        missingOnWoo,
        missingInLocal,
      });

      return {
        localProducts,
        syncedProducts,
        unsyncedProducts,
        wooProducts,
        correctlySynced,
        missingOnWoo,
        missingInLocal,
      };
    } catch (error) {
      console.error('❌ Erreur analyse:', error.message);
      throw error;
    }
  }

  displaySimpleReport(data) {
    console.log('\n═'.repeat(80));
    console.log('📊 RAPPORT DÉTAILLÉ - DIFFÉRENCES DE SYNCHRONISATION');
    console.log('═'.repeat(80));

    console.log('\n📈 RÉSUMÉ COMPLET:');
    console.log(`   📦 Total produits en local: ${data.totalLocal}`);
    console.log(`   🔗 Produits avec woo_id (marqués synchronisés): ${data.totalSynced}`);
    console.log(`   ❌ Produits sans woo_id (jamais synchronisés): ${data.totalUnsyncedLocal}`);
    console.log(`   🌐 Total produits sur WooCommerce: ${data.totalWoo}`);
    console.log(`   ✅ Produits réellement synchronisés: ${data.correctlySynced}`);

    console.log('\n🚨 ANALYSE DES PROBLÈMES:');
    console.log(
      `   🔴 Produits locaux "perdus" (ont un woo_id mais absents de WooCommerce): ${data.missingOnWoo.length}`
    );
    console.log(
      `   🔵 Produits WooCommerce "orphelins" (non référencés en local): ${data.missingInLocal.length}`
    );

    console.log(`\n🎯 EXPLICATION DE LA DIFFÉRENCE:`);
    console.log(`   Vous pensiez avoir ${data.totalSynced} produits synchronisés`);
    console.log(`   Mais en réalité, vous n'en avez que ${data.correctlySynced} sur WooCommerce`);
    console.log(`   Différence: ${data.missingOnWoo.length} produits "perdus"`);

    // Calcul des pourcentages
    const syncRate = ((data.correctlySynced / data.totalSynced) * 100).toFixed(1);
    const lossRate = ((data.missingOnWoo.length / data.totalSynced) * 100).toFixed(1);

    console.log(`\n📊 STATISTIQUES:`);
    console.log(`   🎯 Taux de synchronisation réel: ${syncRate}%`);
    console.log(`   ⚠️ Taux de perte: ${lossRate}%`);

    if (data.missingOnWoo.length > 0) {
      console.log('\n🔴 PRODUITS LOCAUX "PERDUS" (ont un woo_id mais absents de WooCommerce):');
      console.log('─'.repeat(80));
      data.missingOnWoo.slice(0, 15).forEach((product, i) => {
        console.log(
          `${(i + 1).toString().padStart(2)}. ${(product.name || 'Sans nom').substring(0, 40)}`
        );
        console.log(`    ID Local: ${product._id}`);
        console.log(`    WooID supposé: ${product.woo_id}`);
        console.log(`    SKU: ${product.sku || 'N/A'}`);
        console.log(`    Statut: ${product.status || 'N/A'}`);
        console.log(`    Dernière sync: ${product.last_sync || 'Jamais'}`);
        console.log('');
      });

      if (data.missingOnWoo.length > 15) {
        console.log(`    ... et ${data.missingOnWoo.length - 15} autres produits perdus\n`);
      }
    }

    if (data.missingInLocal.length > 0) {
      console.log('\n🔵 PRODUITS WOOCOMMERCE "ORPHELINS" (non référencés en local):');
      console.log('─'.repeat(80));
      data.missingInLocal.slice(0, 10).forEach((product, i) => {
        console.log(`${(i + 1).toString().padStart(2)}. ${product.name.substring(0, 40)}`);
        console.log(`    WooID: ${product.id}`);
        console.log(`    SKU: ${product.sku || 'N/A'}`);
        console.log(`    Statut: ${product.status}`);
        console.log(`    Créé le: ${product.date_created}`);
        console.log('');
      });

      if (data.missingInLocal.length > 10) {
        console.log(`    ... et ${data.missingInLocal.length - 10} autres produits orphelins\n`);
      }
    }

    console.log("\n💡 PLAN D'ACTION RECOMMANDÉ:");
    console.log('─'.repeat(80));
    if (data.missingOnWoo.length > 0) {
      console.log(`🔧 PRIORITÉ 1: Resynchroniser ${data.missingOnWoo.length} produits "perdus"`);
      console.log('   → Ces produits ont un woo_id mais ont été supprimés de WooCommerce');
      console.log('   → Le script de correction va les recréer automatiquement');
    }
    if (data.missingInLocal.length > 0) {
      console.log(
        `🔄 PRIORITÉ 2: Traiter ${data.missingInLocal.length} produits orphelins WooCommerce`
      );
      console.log('   → Supprimer de WooCommerce OU importer en local');
    }
    if (data.totalUnsyncedLocal > 0) {
      console.log(
        `📤 PRIORITÉ 3: Synchroniser ${data.totalUnsyncedLocal} produits jamais synchronisés`
      );
    }

    console.log('\n═'.repeat(80));
  }

  // Générer la liste des IDs à resynchroniser
  generateResyncScript(missingProducts) {
    if (missingProducts.length === 0) return '';

    const script = [
      '// Script de resynchronisation des produits manquants',
      '// À exécuter dans votre application',
      '',
      'const productIds = [',
      ...missingProducts.map(
        (p) => `  "${p._id}", // ${p.name || 'Sans nom'} (woo_id: ${p.woo_id})`
      ),
      '];',
      '',
      'async function resyncMissingProducts() {',
      '  const ProductWooCommerceService = require("./services/ProductWooCommerceService");',
      '  const Product = require("./models/Product");',
      '',
      '  for (const productId of productIds) {',
      '    try {',
      '      const product = await Product.findById(productId);',
      '      if (product) {',
      '        await ProductWooCommerceService.syncToWooCommerce([product]);',
      '        console.log(`✅ ${productId} resynchronisé`);',
      '      }',
      '    } catch (error) {',
      '      console.error(`❌ Erreur ${productId}:`, error.message);',
      '    }',
      '  }',
      '}',
      '',
      'resyncMissingProducts();',
    ];

    return script.join('\n');
  }
}

// Fonction principale
async function runSimpleAnalysis() {
  try {
    const analyzer = new SimpleSyncAnalyzer();
    const results = await analyzer.analyze();

    // Générer le script de correction si nécessaire
    if (results.missingOnWoo.length > 0) {
      const resyncScript = analyzer.generateResyncScript(results.missingOnWoo);

      // Sauvegarder le script
      await fs.writeFile('./resync_missing_products.js', resyncScript);
      console.log('📝 Script de resynchronisation sauvegardé: ./resync_missing_products.js\n');
    }

    console.log('✅ Analyse terminée avec succès!');
    return results;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  runSimpleAnalysis()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { SimpleSyncAnalyzer, runSimpleAnalysis };
