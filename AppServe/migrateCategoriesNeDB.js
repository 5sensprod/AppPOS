// migrateCategoriesNeDB.js
const fs = require('fs').promises;
const path = require('path');
const Datastore = require('nedb');
const util = require('util');

// Chemins des fichiers
const SOURCE_FILE = path.join(__dirname, 'data', 'source', 'old_categories.db');
const TARGET_FILE = path.join(__dirname, 'data', 'target', 'categories.db');

// Promisify nedb functions
function createDatastore(filePath) {
  const db = new Datastore({ filename: filePath, autoload: true });
  db.findAsync = util.promisify(db.find);
  db.insertAsync = util.promisify(db.insert);
  db.updateAsync = util.promisify(db.update); // Ajout pour upsert
  return db;
}

// Fonction principale de migration
async function migrateCategories() {
  console.log('Démarrage de la migration des catégories...');

  try {
    // 1. Lecture du fichier source
    const sourceData = await fs.readFile(SOURCE_FILE, 'utf8');
    const categories = sourceData
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));

    console.log(`Lecture de ${categories.length} catégories depuis la source.`);

    // 2. Construire la hiérarchie des catégories
    const categoriesWithLevels = buildCategoryHierarchy(categories);
    console.log('Hiérarchie construite avec niveaux calculés.');

    // 3. Connexion à la base cible
    const targetDb = createDatastore(TARGET_FILE);

    // 4. Migrer les données (en mode upsert pour éviter les erreurs de doublons)
    let importedCount = 0;
    let errorCount = 0;

    for (const category of categoriesWithLevels) {
      try {
        await targetDb.updateAsync({ _id: category._id }, category, { upsert: true });
        importedCount++;
      } catch (error) {
        console.error(`Erreur lors de l'import de la catégorie ${category._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(
      `Migration terminée: ${importedCount} catégories importées ou mises à jour, ${errorCount} erreurs.`
    );
    return { success: true, imported: importedCount, errors: errorCount };
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    return { success: false, error: error.message };
  }
}

// Construire la hiérarchie et calculer les niveaux
function buildCategoryHierarchy(categories) {
  const categoryMap = {};
  categories.forEach((cat) => {
    categoryMap[cat._id] = cat;
  });

  return categories.map((cat) => {
    const level = calculateLevel(cat._id, categoryMap);

    return {
      _id: cat._id,
      name: cat.name,
      parent_id: cat.parentId || null,
      level: level,
      woo_id: null,
      last_sync: null,
      image: null,
    };
  });
}

// Calculer le niveau hiérarchique d'une catégorie
function calculateLevel(categoryId, categoryMap, visited = new Set()) {
  if (visited.has(categoryId)) {
    console.warn(`Référence circulaire détectée pour la catégorie ${categoryId}`);
    return 0;
  }

  const category = categoryMap[categoryId];
  if (!category) return 0;
  if (!category.parentId) return 0;

  visited.add(categoryId);
  return calculateLevel(category.parentId, categoryMap, visited) + 1;
}

// Exécuter la migration
if (require.main === module) {
  migrateCategories()
    .then((result) => {
      if (result.success) {
        console.log('Migration réussie!');
      } else {
        console.error('Échec de la migration:', result.error);
      }
    })
    .catch((error) => {
      console.error('Erreur non gérée:', error);
    });
}

module.exports = { migrateCategories };
