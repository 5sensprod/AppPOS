const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

class CategoriesAPISyncer {
  constructor() {
    this.dataPath = path.join(process.cwd(), 'data');
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    console.log(`🏷️  [SYNCER] Répertoire de données: ${this.dataPath}`);
    console.log(`🌐 [SYNCER] API de référence: ${this.apiBaseUrl}`);
  }

  async readCategoriesFromDB() {
    try {
      const categoriesPath = path.join(this.dataPath, 'categories.db');
      console.log(`📖 Lecture du fichier: ${categoriesPath}`);

      const fileContent = await fs.readFile(categoriesPath, 'utf8');
      const lines = fileContent.split('\n').filter((line) => line.trim());

      const categories = [];
      for (const line of lines) {
        try {
          const category = JSON.parse(line);
          categories.push(category);
        } catch (error) {
          console.warn(`⚠️ Ligne JSON invalide ignorée: ${line.substring(0, 50)}...`);
        }
      }

      console.log(`✅ ${categories.length} catégories lues depuis la DB`);
      return categories;
    } catch (error) {
      console.error('❌ Erreur lecture fichier catégories:', error.message);
      throw error;
    }
  }

  async getHierarchicalCategoriesFromAPI() {
    return new Promise((resolve, reject) => {
      const url = `${this.apiBaseUrl}/api/categories/hierarchical`;
      console.log(`🌐 Appel API: ${url}`);

      // Token JWT pour l'authentification
      const jwtToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IlVnUHdqZ3FCWlNqVnRtTHIiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU4NjM2NDYzLCJleHAiOjE3NTg3MjI4NjMsImF1ZCI6IkFwcFBPUy1DbGllbnQiLCJpc3MiOiJBcHBQT1MtU2VydmVyIn0.cylgsIiVcEQjv5JUN_63OGQTDdtWf4UwjjDjBtq8cf4';

      const options = {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'User-Agent': 'Categories-Syncer/1.0',
          'Content-Type': 'application/json',
        },
      };

      const protocol = this.apiBaseUrl.startsWith('https') ? require('https') : http;

      protocol
        .get(url, options, (res) => {
          if (res.statusCode === 401) {
            reject(
              new Error(
                'Token JWT expiré ou invalide. Veuillez vous reconnecter pour obtenir un nouveau token.'
              )
            );
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`API Error: ${res.statusCode} - ${res.statusMessage}`));
            return;
          }

          let data = '';
          res.on('data', (chunk) => (data += chunk));

          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (response.success && Array.isArray(response.data)) {
                console.log(
                  `✅ ${response.data.length} catégories racines récupérées depuis l'API`
                );
                resolve(response.data);
              } else {
                reject(new Error('Format de réponse API invalide'));
              }
            } catch (error) {
              reject(error);
            }
          });
        })
        .on('error', reject);
    });
  }

  // Convertir l'arbre hiérarchique en liste plate
  flattenHierarchy(hierarchicalCategories, parentPath = [], level = 0) {
    const flatCategories = [];

    for (const category of hierarchicalCategories) {
      // Créer la catégorie aplatie
      const flatCategory = {
        _id: category._id,
        name: category.name,
        parent_id: category.parent_id,
        level: level,
        woo_id: category.woo_id || null,
        last_sync: category.last_sync || null,
        image: category.image || null,
        pending_sync: category.pending_sync || false,
        // Informations supplémentaires depuis l'API
        path: [...parentPath, category.name],
        path_string: [...parentPath, category.name].join(' > '),
        children_count: category.children ? category.children.length : 0,
        product_count: category.product_count || 0,
      };

      flatCategories.push(flatCategory);

      // Traiter récursivement les enfants
      if (category.children && category.children.length > 0) {
        const childrenFlat = this.flattenHierarchy(
          category.children,
          [...parentPath, category.name],
          level + 1
        );
        flatCategories.push(...childrenFlat);
      }
    }

    return flatCategories;
  }

  compareCategories(dbCategories, apiCategories) {
    console.log('\n🔍 COMPARAISON DB vs API...');
    console.log(`   DB: ${dbCategories.length} catégories`);
    console.log(`   API: ${apiCategories.length} catégories`);

    // Créer des index pour la comparaison
    const dbById = new Map();
    const apiById = new Map();

    dbCategories.forEach((cat) => dbById.set(cat._id, cat));
    apiCategories.forEach((cat) => apiById.set(cat._id, cat));

    const results = {
      identical: [],
      different: [],
      onlyInDB: [],
      onlyInAPI: [],
      systemCategories: [], // Catégories système à préserver
      levelMismatches: [],
      nameDifferences: [],
      parentMismatches: [],
    };

    // Debug: vérifier une catégorie spécifique
    const violonDB = dbById.get('RQmV2ZdU7VRzKoJm');
    const violonAPI = apiById.get('RQmV2ZdU7VRzKoJm');

    console.log('\n🔍 DEBUG - Catégorie Violon:');
    console.log(
      '   DB:',
      violonDB ? `"${violonDB.name}" (level: ${violonDB.level})` : 'NON TROUVÉE'
    );
    console.log(
      '   API:',
      violonAPI ? `"${violonAPI.name}" (level: ${violonAPI.level})` : 'NON TROUVÉE'
    );

    // Comparer les catégories communes
    for (const [id, dbCat] of dbById) {
      const apiCat = apiById.get(id);

      if (!apiCat) {
        // Vérifier si c'est une catégorie système à préserver
        const isSystemCategory = this.isSystemCategory(dbCat);
        if (isSystemCategory) {
          results.systemCategories.push(dbCat);
          console.log(
            `   🔧 Catégorie système détectée: "${dbCat.name || 'undefined'}" (${dbCat._id || 'undefined'}) - À PRÉSERVER`
          );
        } else {
          results.onlyInDB.push(dbCat);
        }

        if (id === 'RQmV2ZdU7VRzKoJm') {
          console.log('   ❌ Violon classée comme "onlyInDB" - ERREUR !');
        }
        continue;
      }

      const differences = [];

      // Comparer les noms
      if (dbCat.name !== apiCat.name) {
        differences.push({
          field: 'name',
          db: dbCat.name,
          api: apiCat.name,
        });
        results.nameDifferences.push({ id, dbCat, apiCat });
      }

      // Comparer les levels
      if (dbCat.level !== apiCat.level) {
        differences.push({
          field: 'level',
          db: dbCat.level,
          api: apiCat.level,
        });
        results.levelMismatches.push({ id, dbCat, apiCat });
      }

      // Comparer les parent_id
      if (dbCat.parent_id !== apiCat.parent_id) {
        differences.push({
          field: 'parent_id',
          db: dbCat.parent_id,
          api: apiCat.parent_id,
        });
        results.parentMismatches.push({ id, dbCat, apiCat });
      }

      if (differences.length > 0) {
        results.different.push({
          id,
          dbCat,
          apiCat,
          differences,
        });
        if (id === 'RQmV2ZdU7VRzKoJm') {
          console.log('   🔄 Violon classée comme "different":', differences);
        }
      } else {
        results.identical.push({ id, dbCat, apiCat });
        if (id === 'RQmV2ZdU7VRzKoJm') {
          console.log('   ✅ Violon classée comme "identical" - CORRECT');
        }
      }
    }

    // Catégories uniquement dans l'API
    for (const [id, apiCat] of apiById) {
      if (!dbById.has(id)) {
        results.onlyInAPI.push(apiCat);
      }
    }

    return results;
  }

  // Détecter les catégories système à préserver
  isSystemCategory(category) {
    // Catégorie "undefined" ou "Non catégorisé"
    if (
      !category._id ||
      category._id === 'undefined' ||
      !category.name ||
      category.name === 'undefined'
    ) {
      return true;
    }

    // Autres catégories système possibles
    const systemNames = [
      'non catégorisé',
      'uncategorized',
      'non categorise',
      'sans catégorie',
      'default',
      'divers',
      'autre',
    ];

    if (category.name && systemNames.includes(category.name.toLowerCase())) {
      return true;
    }

    return false;
  }

  displayComparisonResults(results) {
    console.log('\n═══════════════════════════════════════════════');
    console.log('📊 RÉSULTATS DE LA COMPARAISON');
    console.log('═══════════════════════════════════════════════');

    console.log('\n📈 RÉSUMÉ:');
    console.log(`   ✅ Catégories identiques: ${results.identical.length}`);
    console.log(`   🔄 Catégories différentes: ${results.different.length}`);
    console.log(`   🔧 Catégories système (préservées): ${results.systemCategories.length}`);
    console.log(`   ❌ Uniquement en DB: ${results.onlyInDB.length}`);
    console.log(`   ➕ Uniquement en API: ${results.onlyInAPI.length}`);

    // Détailler les différences
    if (results.different.length > 0) {
      console.log('\n🔄 CATÉGORIES AVEC DIFFÉRENCES:');
      console.log('─'.repeat(50));

      results.different.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.dbCat.name} (ID: ${item.id})`);
        item.differences.forEach((diff) => {
          console.log(`   🔸 ${diff.field}: DB="${diff.db}" vs API="${diff.api}"`);
        });
        console.log('');
      });

      if (results.different.length > 10) {
        console.log(`    ... et ${results.different.length - 10} autres avec différences`);
      }
    }

    // Catégories uniquement en DB
    if (results.onlyInDB.length > 0) {
      console.log('\n❌ CATÉGORIES UNIQUEMENT EN DB (possibles orphelines):');
      console.log('─'.repeat(50));
      results.onlyInDB.slice(0, 5).forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name} (ID: ${cat._id})`);
      });
      if (results.onlyInDB.length > 5) {
        console.log(`    ... et ${results.onlyInDB.length - 5} autres`);
      }
    }

    // Catégories uniquement en API
    if (results.onlyInAPI.length > 0) {
      console.log('\n➕ CATÉGORIES UNIQUEMENT EN API (manquantes en DB):');
      console.log('─'.repeat(50));
      results.onlyInAPI.slice(0, 5).forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name} (ID: ${cat._id})`);
        console.log(`   Chemin: ${cat.path_string}`);
        console.log(`   Niveau: ${cat.level}, Produits: ${cat.product_count}`);
        console.log('');
      });
      if (results.onlyInAPI.length > 5) {
        console.log(`    ... et ${results.onlyInAPI.length - 5} autres`);
      }
    }
  }

  async updateCategoriesDB(dbCategories, apiCategories, comparison) {
    try {
      console.log('\n💾 MISE À JOUR SÉCURISÉE DE LA BASE DE DONNÉES...');

      const categoriesPath = path.join(this.dataPath, 'categories.db');
      const backupPath = path.join(this.dataPath, `categories.db.backup.${Date.now()}`);

      // Sauvegarde
      await fs.copyFile(categoriesPath, backupPath);
      console.log(`✅ Sauvegarde créée: ${backupPath}`);

      // STRATÉGIE SÉCURISÉE : Fusionner plutôt qu'écraser
      const updatedCategories = [...dbCategories]; // Copie des catégories existantes
      const dbById = new Map();
      updatedCategories.forEach((cat) => dbById.set(cat._id, cat));

      let updatedCount = 0;
      let addedCount = 0;

      // 1. Mettre à jour les catégories existantes avec les données API
      for (const item of comparison.different) {
        const dbCat = dbById.get(item.id);
        if (dbCat) {
          for (const diff of item.differences) {
            console.log(`   🔄 ${item.id}: ${diff.field} "${diff.db}" → "${diff.api}"`);
            dbCat[diff.field] = diff.api;
          }
          updatedCount++;
        }
      }

      // 2. Ajouter les catégories qui sont uniquement dans l'API
      for (const apiCat of comparison.onlyInAPI) {
        console.log(`   ➕ Ajout: ${apiCat.name} (${apiCat._id})`);
        const newCategory = {
          _id: apiCat._id,
          name: apiCat.name,
          parent_id: apiCat.parent_id,
          level: apiCat.level,
          woo_id: apiCat.woo_id,
          last_sync: apiCat.last_sync ? { $date: new Date(apiCat.last_sync).getTime() } : null,
          image: apiCat.image,
          pending_sync: apiCat.pending_sync || false,
        };
        updatedCategories.push(newCategory);
        addedCount++;
      }

      // 3. PRÉSERVER les catégories système et celles uniquement en DB
      const categoriesToPreserve = [...comparison.onlyInDB, ...comparison.systemCategories];
      if (categoriesToPreserve.length > 0) {
        console.log(`   ℹ️  Conservation de ${categoriesToPreserve.length} catégories spéciales:`);
        categoriesToPreserve.forEach((cat) => {
          const isSystem = comparison.systemCategories.includes(cat);
          const label = isSystem ? 'SYSTÈME' : 'UNIQUE DB';
          console.log(`     - ${cat.name || 'undefined'} (${cat._id || 'undefined'}) [${label}]`);
        });
      }

      // Écrire le fichier mis à jour
      const content = updatedCategories.map((cat) => JSON.stringify(cat)).join('\n');
      await fs.writeFile(categoriesPath, content);

      console.log(`✅ Base de données mise à jour:`);
      console.log(`   📝 ${updatedCount} catégories modifiées`);
      console.log(`   ➕ ${addedCount} catégories ajoutées`);
      console.log(`   💾 ${comparison.onlyInDB.length} catégories conservées`);
      console.log(`   📊 Total: ${updatedCategories.length} catégories`);

      return backupPath;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error.message);
      throw error;
    }
  }

  async syncWithAPI(applyFix = false) {
    try {
      console.log("🔄 SYNCHRONISATION DES CATÉGORIES AVEC L'API");
      console.log('═'.repeat(80));

      // 1. Charger les données
      console.log('\n📦 ÉTAPE 1: Chargement des données...');
      const [dbCategories, hierarchicalCategories] = await Promise.all([
        this.readCategoriesFromDB(),
        this.getHierarchicalCategoriesFromAPI(),
      ]);

      // 2. Aplatir la hiérarchie API
      console.log('\n🔄 ÉTAPE 2: Transformation des données API...');
      const flatAPICategories = this.flattenHierarchy(hierarchicalCategories);
      console.log(`✅ ${flatAPICategories.length} catégories aplaties depuis l'API`);

      // 3. Comparer
      console.log('\n🔍 ÉTAPE 3: Comparaison...');
      const comparison = this.compareCategories(dbCategories, flatAPICategories);

      // 4. Afficher les résultats
      this.displayComparisonResults(comparison);

      // 5. Proposition de correction
      const needsUpdate =
        comparison.different.length > 0 ||
        comparison.onlyInDB.length > 0 ||
        comparison.onlyInAPI.length > 0;

      if (needsUpdate) {
        console.log('\n💡 RECOMMANDATIONS:');
        console.log('─'.repeat(50));
        console.log("La base de données n'est pas synchronisée avec l'API.");

        if (applyFix) {
          console.log('🔧 Application de la correction sécurisée...');
          const backupPath = await this.updateCategoriesDB(
            dbCategories,
            flatAPICategories,
            comparison
          );

          console.log('\n🎉 CORRECTION APPLIQUÉE !');
          console.log(`📁 Sauvegarde: ${backupPath}`);
          console.log("📊 La base de données est maintenant synchronisée avec l'API");
        } else {
          console.log('Pour corriger la base de données, relancez avec le paramètre --fix :');
          console.log('node syncCategoriesWithAPI.js --fix');
        }
      } else {
        console.log('\n✅ PARFAIT !');
        console.log("La base de données est déjà synchronisée avec l'API");
      }

      // 6. Sauvegarder le rapport
      const report = {
        timestamp: new Date().toISOString(),
        comparison,
        needsUpdate,
        apiCategoriesCount: flatAPICategories.length,
        dbCategoriesCount: dbCategories.length,
      };

      const reportPath = `./reports/categories_api_sync_${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Rapport détaillé sauvegardé: ${reportPath}`);

      return report;
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error.message);
      throw error;
    }
  }
}

// Fonction principale
async function runCategoriesAPISync() {
  try {
    const applyFix = process.argv.includes('--fix');

    const syncer = new CategoriesAPISyncer();
    const results = await syncer.syncWithAPI(applyFix);

    console.log('\n✅ Synchronisation terminée avec succès!');

    if (results.needsUpdate && !applyFix) {
      console.log('💡 Ajoutez --fix pour appliquer les corrections automatiquement');
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  runCategoriesAPISync();
}

module.exports = { CategoriesAPISyncer, runCategoriesAPISync };
