//AppServe\models\Category.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class Category extends BaseModel {
  constructor() {
    super(db.categories, 'categories');
  }

  // Méthodes spécifiques aux catégories
  async findByParentId(parentId) {
    return new Promise((resolve, reject) => {
      this.collection.find({ parent_id: parentId }, (err, docs) => {
        if (err) reject(err);
        resolve(docs);
      });
    });
  }
  async getCategoryPath(categoryId) {
    try {
      const allCategories = await this.findAll();

      // Fonction récursive pour construire le chemin
      const buildPath = (id, visited = new Set()) => {
        // Éviter les boucles infinies
        if (visited.has(id)) {
          console.error(`Boucle détectée dans la hiérarchie: ${id}`);
          return { path: [], path_ids: [] };
        }

        const category = allCategories.find((c) => c._id === id);
        if (!category) return { path: [], path_ids: [] };

        // Si c'est une catégorie racine
        if (!category.parent_id) {
          return {
            path: [category.name],
            path_ids: [category._id],
          };
        }

        // Sinon, récursivement construire le chemin
        visited.add(id);
        const parentPath = buildPath(category.parent_id, visited);

        return {
          path: [...parentPath.path, category.name],
          path_ids: [...parentPath.path_ids, category._id],
        };
      };

      // Construire le chemin pour la catégorie demandée
      const pathInfo = buildPath(categoryId);

      return {
        ...pathInfo,
        path_string: pathInfo.path.join(' > '),
      };
    } catch (error) {
      console.error('Erreur récupération chemin catégorie:', error);
      throw error;
    }
  }
}

module.exports = new Category();
