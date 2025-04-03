// utils/categoryHelpers.js
const db = require('../config/database');

async function calculateLevel(parent_id) {
  if (!parent_id) return 0;

  try {
    const parent = await new Promise((resolve, reject) => {
      db.categories.findOne({ _id: parent_id }, (err, doc) => {
        if (err) {
          console.error(`Erreur récupération parent (${parent_id}):`, err);
          resolve(null); // Évite le plantage en cas d'erreur DB
        }
        resolve(doc);
      });
    });

    return parent ? (parent.level || 0) + 1 : 0;
  } catch (error) {
    console.error('Erreur dans calculateLevel:', error);
    return 0; // Retourne 0 en cas d’erreur
  }
}

function buildCategoryPath(allCategories, categoryId, visited = new Set()) {
  if (visited.has(categoryId)) {
    console.error(`Boucle détectée dans la hiérarchie: ${categoryId}`);
    return { path: [], path_ids: [] };
  }

  const category = allCategories.find((c) => c._id === categoryId);
  if (!category) return { path: [], path_ids: [] };

  if (!category.parent_id) {
    return {
      path: [category.name],
      path_ids: [category._id],
    };
  }

  visited.add(categoryId);
  const parentPath = buildCategoryPath(allCategories, category.parent_id, visited);

  return {
    path: [...parentPath.path, category.name],
    path_ids: [...parentPath.path_ids, category._id],
  };
}

module.exports = { calculateLevel, buildCategoryPath };
