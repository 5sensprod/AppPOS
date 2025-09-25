// detectObsoleteWooIds.js - Détecte les produits avec des woo_id obsolètes
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const WooCommerceClient = require('../services/base/WooCommerceClient');

class ObsoleteWooIdDetector {
  constructor() {
    this.wooClient = new WooCommerceClient();
    this.dataPath = path.join(process.cwd(), 'data');
    console.log(`🔍 [DETECTOR] Répertoire de données: ${this.dataPath}`);
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

      console.log(`📖 [DETECTOR] Lecture du fichier: ${productsPath}`);
      const fileContent = await fs.readFile(productsPath, 'utf8');

      if (!fileContent.trim()) {
        console.warn('⚠️ [DETECTOR] Fichier products.db vide');
        return [];
      }

      const lines = fileContent.split('\n').filter((line) => line.trim());
      const products = [];
      let validLines = 0;

      for (const line of lines) {
        try {
          const product = JSON.parse(line);
          products.push(product);
          validLines++;
        } catch (error) {
          // Ignorer les lignes JSON invalides
        }
      }

      console.log(`✅ [DETECTOR] ${validLines} produits lus depuis le fichier local`);
      return products;
    } catch (error) {
      console.error('❌ [DETECTOR] Erreur lecture fichier produits:', error.message);
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

    console.log(`✅ ${allProducts.length} produits récupérés depuis WooCommerce`);
    return allProducts;
  }

  // Fonction de correspondance intelligente
  findMatchingWooProduct(localProduct, wooProducts) {
    if (!localProduct.sku) return null;

    // Recherche exacte par SKU
    const exactMatch = wooProducts.find(
      (woo) => woo.sku && woo.sku.toLowerCase() === localProduct.sku.toLowerCase()
    );

    if (exactMatch) return exactMatch;

    // Recherche par nom (similarité)
    if (!localProduct.name) return null;

    const localName = this.normalizeString(localProduct.name);
    const nameMatch = wooProducts.find((woo) => {
      if (!woo.name) return false;
      const wooName = this.normalizeString(woo.name);
      return this.calculateSimilarity(localName, wooName) > 0.8;
    });

    return nameMatch;
  }

  // Normalise les chaînes pour la comparaison
  normalizeString(str) {
    return str
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Calcule la similarité entre deux chaînes (Jaro-Winkler simplifié)
  calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;

    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0 || len2 === 0) return 0.0;

    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    const str1Matches = new Array(len1).fill(false);
    const str2Matches = new Array(len2).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Identifier les correspondances
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);

      for (let j = start; j < end; j++) {
        if (str2Matches[j] || str1[i] !== str2[j]) continue;
        str1Matches[i] = true;
        str2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Calculer les transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!str1Matches[i]) continue;
      while (!str2Matches[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }

    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3.0;

    // Bonus Winkler pour les préfixes communs
    let prefix = 0;
    for (let i = 0; i < Math.min(len1, len2, 4); i++) {
      if (str1[i] === str2[i]) prefix++;
      else break;
    }

    return jaro + 0.1 * prefix * (1.0 - jaro);
  }

  async detectObsoleteWooIds() {
    try {
      console.log('🔍 DÉTECTION DES WOO_ID OBSOLÈTES');
      console.log('═'.repeat(80));

      // 1. Charger les données
      console.log('\n📦 ÉTAPE 1: Chargement des données...');
      const [localProducts, wooProducts] = await Promise.all([
        this.readProductsFromFile(),
        this.getAllWooProducts(),
      ]);

      // 2. Filtrer les produits avec woo_id
      const syncedProducts = localProducts.filter((p) => p.woo_id);
      console.log(`🔗 Produits locaux avec woo_id: ${syncedProducts.length}`);

      // 3. Créer des index pour performances
      const wooById = new Map();
      const wooBySku = new Map();

      wooProducts.forEach((woo) => {
        wooById.set(woo.id.toString(), woo);
        if (woo.sku) {
          wooBySku.set(woo.sku.toLowerCase(), woo);
        }
      });

      // 4. Analyser les correspondances
      console.log('\n🔍 ÉTAPE 2: Analyse des correspondances...');

      const results = {
        correctSync: [], // woo_id correct
        obsoleteWooId: [], // woo_id obsolète mais produit trouvé
        reallyMissing: [], // produit vraiment absent
        duplicateSkus: [], // SKU dupliqués sur WooCommerce
      };

      let processedCount = 0;

      for (const localProduct of syncedProducts) {
        processedCount++;

        if (processedCount % 100 === 0) {
          console.log(`   Traité ${processedCount}/${syncedProducts.length} produits...`);
        }

        // Vérifier si le woo_id existe toujours
        const wooByCurrentId = wooById.get(localProduct.woo_id.toString());

        if (wooByCurrentId) {
          // Le woo_id est toujours valide
          results.correctSync.push({
            local: localProduct,
            woo: wooByCurrentId,
            status: 'sync_ok',
          });
        } else {
          // Le woo_id n'existe plus, chercher par SKU/nom
          const matchingWoo = this.findMatchingWooProduct(localProduct, wooProducts);

          if (matchingWoo) {
            // Produit trouvé mais avec un nouvel ID
            results.obsoleteWooId.push({
              local: localProduct,
              woo: matchingWoo,
              oldWooId: localProduct.woo_id,
              newWooId: matchingWoo.id,
              matchType: matchingWoo.sku === localProduct.sku ? 'sku_exact' : 'name_similarity',
            });
          } else {
            // Produit vraiment manquant
            results.reallyMissing.push(localProduct);
          }
        }
      }

      // 5. Détecter les SKU dupliqués sur WooCommerce
      const skuCounts = new Map();
      wooProducts.forEach((woo) => {
        if (woo.sku) {
          const sku = woo.sku.toLowerCase();
          if (!skuCounts.has(sku)) {
            skuCounts.set(sku, []);
          }
          skuCounts.get(sku).push(woo);
        }
      });

      skuCounts.forEach((products, sku) => {
        if (products.length > 1) {
          results.duplicateSkus.push({
            sku: sku,
            products: products,
          });
        }
      });

      console.log(`✅ Analyse terminée: ${processedCount} produits traités`);

      // 6. Afficher le rapport
      this.displayDetectionReport(results);

      return results;
    } catch (error) {
      console.error('❌ Erreur lors de la détection:', error.message);
      throw error;
    }
  }

  displayDetectionReport(results) {
    console.log('\n═'.repeat(80));
    console.log('📊 RAPPORT DE DÉTECTION DES WOO_ID OBSOLÈTES');
    console.log('═'.repeat(80));

    console.log('\n📈 RÉSUMÉ:');
    console.log(`   ✅ Synchronisations correctes: ${results.correctSync.length}`);
    console.log(`   🔄 WooIDs obsolètes détectés: ${results.obsoleteWooId.length}`);
    console.log(`   ❌ Produits vraiment manquants: ${results.reallyMissing.length}`);
    console.log(`   ⚠️  SKUs dupliqués sur WooCommerce: ${results.duplicateSkus.length}`);

    // Détail des woo_id obsolètes
    if (results.obsoleteWooId.length > 0) {
      console.log('\n🔄 PRODUITS AVEC WOO_ID OBSOLÈTES:');
      console.log('─'.repeat(80));

      results.obsoleteWooId.forEach((item, index) => {
        const local = item.local;
        const woo = item.woo;

        console.log(
          `${(index + 1).toString().padStart(2)}. ${(local.name || 'Sans nom').substring(0, 50)}`
        );
        console.log(`    ID Local: ${local._id}`);
        console.log(`    SKU: ${local.sku || 'N/A'}`);
        console.log(`    ❌ Ancien woo_id: ${item.oldWooId} (n'existe plus)`);
        console.log(`    ✅ Nouveau woo_id: ${item.newWooId}`);
        console.log(
          `    🔍 Trouvé par: ${item.matchType === 'sku_exact' ? 'SKU exact' : 'Similarité nom'}`
        );
        console.log(`    🌐 Nom WooCommerce: ${woo.name.substring(0, 50)}`);
        console.log(`    📅 Créé le: ${woo.date_created}`);
        console.log('');
      });
    }

    // SKUs dupliqués
    if (results.duplicateSkus.length > 0) {
      console.log('\n⚠️  SKUs DUPLIQUÉS SUR WOOCOMMERCE:');
      console.log('─'.repeat(80));

      results.duplicateSkus.slice(0, 10).forEach((item, index) => {
        console.log(`${(index + 1).toString().padStart(2)}. SKU: ${item.sku}`);
        item.products.forEach((product) => {
          console.log(`    - ID: ${product.id} | Nom: ${product.name.substring(0, 40)}`);
        });
        console.log('');
      });
    }

    // Produits vraiment manquants
    if (results.reallyMissing.length > 0) {
      console.log('\n❌ PRODUITS VRAIMENT MANQUANTS:');
      console.log('─'.repeat(80));

      results.reallyMissing.slice(0, 10).forEach((product, index) => {
        console.log(
          `${(index + 1).toString().padStart(2)}. ${(product.name || 'Sans nom').substring(0, 50)}`
        );
        console.log(`    ID Local: ${product._id}`);
        console.log(`    SKU: ${product.sku || 'N/A'}`);
        console.log(`    WooID supposé: ${product.woo_id}`);
        console.log('');
      });
    }

    console.log('\n💡 PROCHAINES ÉTAPES:');
    console.log('─'.repeat(80));
    if (results.obsoleteWooId.length > 0) {
      console.log(`🔧 PRIORITÉ 1: Corriger ${results.obsoleteWooId.length} woo_id obsolètes`);
      console.log('   → Exécuter le script de correction pour mettre à jour la base locale');
    }
    if (results.duplicateSkus.length > 0) {
      console.log(
        `⚠️  PRIORITÉ 2: Résoudre ${results.duplicateSkus.length} doublons SKU sur WooCommerce`
      );
      console.log('   → Nettoyer les doublons avant la correction');
    }
    if (results.reallyMissing.length > 0) {
      console.log(
        `❌ PRIORITÉ 3: Traiter ${results.reallyMissing.length} produits vraiment manquants`
      );
      console.log('   → Resynchroniser ou supprimer ces références');
    }

    console.log('\n═'.repeat(80));
  }

  // Sauvegarder le rapport détaillé en JSON (optionnel)
  async saveDetailedReport(results) {
    const reportPath = `./reports/woo_id_analysis_${Date.now()}.json`;

    try {
      // Créer le dossier reports s'il n'existe pas
      await fs.mkdir('./reports', { recursive: true });

      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          correctSync: results.correctSync.length,
          obsoleteWooId: results.obsoleteWooId.length,
          reallyMissing: results.reallyMissing.length,
          duplicateSkus: results.duplicateSkus.length,
        },
        details: {
          obsoleteWooIds: results.obsoleteWooId.map((item) => ({
            localId: item.local._id,
            localName: item.local.name,
            sku: item.local.sku,
            oldWooId: item.oldWooId,
            newWooId: item.newWooId,
            matchType: item.matchType,
            wooName: item.woo.name,
            wooCreatedDate: item.woo.date_created,
          })),
          reallyMissing: results.reallyMissing.map((p) => ({
            localId: p._id,
            name: p.name,
            sku: p.sku,
            supposedWooId: p.woo_id,
          })),
          duplicateSkus: results.duplicateSkus,
        },
      };

      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Rapport détaillé sauvegardé: ${reportPath}`);

      return reportPath;
    } catch (error) {
      console.warn(`⚠️  Impossible de sauvegarder le rapport: ${error.message}`);
      return null;
    }
  }
}

// Fonction principale
async function runDetection() {
  try {
    const detector = new ObsoleteWooIdDetector();
    const results = await detector.detectObsoleteWooIds();

    // Sauvegarder un rapport détaillé optionnel
    await detector.saveDetailedReport(results);

    console.log('✅ Analyse terminée avec succès!');
    console.log(`📊 Résumé: ${results.obsoleteWooId.length} woo_id obsolètes détectés`);

    return results;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  runDetection()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { ObsoleteWooIdDetector, runDetection };
