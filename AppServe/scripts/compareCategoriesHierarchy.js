// compareCategoriesHierarchy.js - Compare les hiérarchies de catégories Local vs WooCommerce
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const WooCommerceClient = require('../services/base/WooCommerceClient');

class CategoriesHierarchyComparator {
  constructor() {
    this.wooClient = new WooCommerceClient();
    this.dataPath = path.join(process.cwd(), 'data');
    console.log(`🏷️  [CATEGORIES] Répertoire de données: ${this.dataPath}`);
  }

  async readCategoriesFromFile() {
    try {
      const categoriesPath = path.join(this.dataPath, 'categories.db');

      const fileExists = await fs
        .access(categoriesPath)
        .then(() => true)
        .catch(() => false);
      if (!fileExists) {
        throw new Error(`Fichier categories.db non trouvé: ${categoriesPath}`);
      }

      console.log(`📖 Lecture du fichier: ${categoriesPath}`);
      const fileContent = await fs.readFile(categoriesPath, 'utf8');

      if (!fileContent.trim()) {
        throw new Error('Fichier categories.db vide');
      }

      const lines = fileContent.split('\n').filter((line) => line.trim());
      const categories = [];

      for (const line of lines) {
        try {
          const category = JSON.parse(line);
          categories.push(category);
        } catch (error) {
          // Ignorer les lignes JSON invalides
        }
      }

      console.log(`✅ ${categories.length} catégories lues`);
      return categories;
    } catch (error) {
      console.error('❌ Erreur lecture fichier catégories:', error.message);
      throw error;
    }
  }

  async getAllWooCategories() {
    const allCategories = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    console.log('🌐 Récupération des catégories WooCommerce...');

    while (hasMore) {
      try {
        console.log(`   📄 Page ${page}...`);
        const response = await this.wooClient.get('products/categories', {
          page: page,
          per_page: perPage,
          hide_empty: false,
          orderby: 'id',
          order: 'asc',
        });

        const categories = response.data;
        allCategories.push(...categories);

        hasMore = categories.length === perPage;
        page++;

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ Erreur page ${page}:`, error.message);
        hasMore = false;
      }
    }

    console.log(`✅ ${allCategories.length} catégories WooCommerce récupérées`);
    return allCategories;
  }

  buildLocalHierarchy(categories) {
    // Créer un index par ID
    const categoriesById = new Map();
    categories.forEach((cat) => categoriesById.set(cat._id, { ...cat, children: [] }));

    // Construire l'arbre
    const rootCategories = [];

    categories.forEach((category) => {
      const cat = categoriesById.get(category._id);

      if (!category.parent_id || !categoriesById.has(category.parent_id)) {
        // Catégorie racine ou parent inexistant
        rootCategories.push(cat);
      } else {
        // Ajouter aux enfants du parent
        const parent = categoriesById.get(category.parent_id);
        if (parent) {
          parent.children.push(cat);
        }
      }
    });

    return { rootCategories, categoriesById };
  }

  buildWooHierarchy(wooCategories) {
    // Créer un index par ID
    const categoriesById = new Map();
    wooCategories.forEach((cat) => categoriesById.set(cat.id, { ...cat, children: [] }));

    // Construire l'arbre
    const rootCategories = [];

    wooCategories.forEach((category) => {
      const cat = categoriesById.get(category.id);

      if (!category.parent || !categoriesById.has(category.parent)) {
        // Catégorie racine
        rootCategories.push(cat);
      } else {
        // Ajouter aux enfants du parent
        const parent = categoriesById.get(category.parent);
        if (parent) {
          parent.children.push(cat);
        }
      }
    });

    return { rootCategories, categoriesById };
  }

  printHierarchy(categories, prefix = '', isRoot = true) {
    if (isRoot) {
      console.log(`📁 HIÉRARCHIE (${categories.length} catégories racine):`);
    }

    categories.forEach((category, index) => {
      const isLast = index === categories.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');

      // Informations sur la catégorie
      let info = '';
      if (category.woo_id || category.id) {
        const wooId = category.woo_id || category.id;
        info = ` (woo_id: ${wooId})`;
      } else {
        info = ' [NON SYNCHRONISÉ]';
      }

      console.log(`${prefix}${connector}${category.name}${info}`);

      // Afficher les enfants
      if (category.children && category.children.length > 0) {
        this.printHierarchy(category.children, nextPrefix, false);
      }
    });
  }

  async compareHierarchies() {
    try {
      console.log('🏷️  COMPARAISON DES HIÉRARCHIES DE CATÉGORIES');
      console.log('═'.repeat(80));

      // 1. Charger les données
      console.log('\n📦 ÉTAPE 1: Chargement des données...');
      const [localCategories, wooCategories] = await Promise.all([
        this.readCategoriesFromFile(),
        this.getAllWooCategories(),
      ]);

      // 2. Analyser les synchronisations
      const syncedCategories = localCategories.filter((cat) => cat.woo_id);
      const unsyncedCategories = localCategories.filter((cat) => !cat.woo_id);

      console.log(`🔗 Catégories locales synchronisées: ${syncedCategories.length}`);
      console.log(`❌ Catégories locales non synchronisées: ${unsyncedCategories.length}`);

      // 3. Identifier les orphelins WooCommerce
      const localWooIds = new Set(syncedCategories.map((cat) => cat.woo_id));
      const orphanWooCategories = wooCategories.filter((woo) => !localWooIds.has(woo.id));

      console.log(`🔵 Catégories WooCommerce orphelines: ${orphanWooCategories.length}`);

      // 4. Construire les hiérarchies
      console.log('\n🏗️  ÉTAPE 2: Construction des hiérarchies...');
      const localHierarchy = this.buildLocalHierarchy(localCategories);
      const wooHierarchy = this.buildWooHierarchy(wooCategories);

      // 5. Afficher les hiérarchies
      console.log('\n═'.repeat(80));
      console.log('🏷️  HIÉRARCHIE LOCALE:');
      console.log('─'.repeat(80));
      this.printHierarchy(localHierarchy.rootCategories);

      console.log('\n═'.repeat(80));
      console.log('🌐 HIÉRARCHIE WOOCOMMERCE:');
      console.log('─'.repeat(80));
      this.printHierarchy(wooHierarchy.rootCategories);

      // 6. Analyser les différences
      console.log('\n═'.repeat(80));
      console.log('📊 ANALYSE DES DIFFÉRENCES:');
      console.log('─'.repeat(80));

      console.log('\n🚨 PROBLÈMES DÉTECTÉS:');
      console.log(`   🔴 Catégories locales non synchronisées: ${unsyncedCategories.length}`);
      console.log(`   🔵 Catégories WooCommerce orphelines: ${orphanWooCategories.length}`);

      // Afficher les catégories non synchronisées
      if (unsyncedCategories.length > 0) {
        console.log('\n❌ CATÉGORIES LOCALES NON SYNCHRONISÉES:');
        console.log('─'.repeat(50));
        unsyncedCategories.slice(0, 10).forEach((cat, index) => {
          const parentInfo = cat.parent_id ? ` (parent: ${cat.parent_id})` : ' (racine)';
          console.log(`${index + 1}. ${cat.name} (ID: ${cat._id})${parentInfo}`);
        });
        if (unsyncedCategories.length > 10) {
          console.log(`    ... et ${unsyncedCategories.length - 10} autres`);
        }
      }

      // Afficher les catégories orphelines WooCommerce
      if (orphanWooCategories.length > 0) {
        console.log('\n🔵 CATÉGORIES WOOCOMMERCE ORPHELINES:');
        console.log('─'.repeat(50));
        orphanWooCategories.slice(0, 10).forEach((cat, index) => {
          const parentInfo = cat.parent ? ` (parent: ${cat.parent})` : ' (racine)';
          console.log(`${index + 1}. ${cat.name} (ID: ${cat.id})${parentInfo}`);
        });
        if (orphanWooCategories.length > 10) {
          console.log(`    ... et ${orphanWooCategories.length - 10} autres`);
        }
      }

      // 7. Rechercher les correspondances par nom
      console.log('\n🔍 CORRESPONDANCES POTENTIELLES PAR NOM:');
      console.log('─'.repeat(50));

      const potentialMatches = [];
      for (const localCat of unsyncedCategories) {
        for (const wooCat of orphanWooCategories) {
          if (this.normalizeString(localCat.name) === this.normalizeString(wooCat.name)) {
            potentialMatches.push({
              local: localCat,
              woo: wooCat,
              matchType: 'name_exact',
            });
          }
        }
      }

      if (potentialMatches.length > 0) {
        potentialMatches.forEach((match, index) => {
          console.log(`${index + 1}. "${match.local.name}"`);
          console.log(`   Local: ${match.local._id} (niveau ${match.local.level})`);
          console.log(`   WooCommerce: ${match.woo.id}`);
          console.log('');
        });
      } else {
        console.log('Aucune correspondance exacte par nom trouvée');
      }

      console.log('\n💡 PROCHAINES ÉTAPES RECOMMANDÉES:');
      console.log('─'.repeat(80));
      if (potentialMatches.length > 0) {
        console.log(
          `🔧 PRIORITÉ 1: Resynchroniser ${potentialMatches.length} correspondances par nom`
        );
      }
      if (unsyncedCategories.length > potentialMatches.length) {
        console.log(
          `📤 PRIORITÉ 2: Synchroniser ${unsyncedCategories.length - potentialMatches.length} catégories locales vers WooCommerce`
        );
      }
      if (orphanWooCategories.length > potentialMatches.length) {
        console.log(
          `🗑️  PRIORITÉ 3: Nettoyer ${orphanWooCategories.length - potentialMatches.length} catégories WooCommerce orphelines`
        );
      }

      // 8. Sauvegarder le rapport
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          localTotal: localCategories.length,
          localSynced: syncedCategories.length,
          localUnsynced: unsyncedCategories.length,
          wooTotal: wooCategories.length,
          wooOrphans: orphanWooCategories.length,
          potentialMatches: potentialMatches.length,
        },
        localHierarchy: localHierarchy.rootCategories,
        wooHierarchy: wooHierarchy.rootCategories,
        unsyncedCategories,
        orphanWooCategories,
        potentialMatches,
      };

      const reportPath = `./reports/categories_hierarchy_${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Rapport détaillé sauvegardé: ${reportPath}`);

      return report;
    } catch (error) {
      console.error('❌ Erreur lors de la comparaison:', error.message);
      throw error;
    }
  }

  normalizeString(str) {
    if (!str || typeof str !== 'string') return '';

    return str
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }
}

// Fonction principale
async function runCategoriesComparison() {
  try {
    const comparator = new CategoriesHierarchyComparator();
    const results = await comparator.compareHierarchies();

    console.log('\n✅ Comparaison terminée avec succès!');
    console.log(`📊 Résumé: ${results.summary.potentialMatches} correspondances trouvées`);

    return results;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  runCategoriesComparison()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { CategoriesHierarchyComparator, runCategoriesComparison };
