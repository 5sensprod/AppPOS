//AppServe\models\Category.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');
const { buildCategoryPath } = require('../utils/categoryHelpers');

class Category extends BaseModel {
  constructor() {
    super(db.categories, 'categories');
  }

  async findByParentId(parentId) {
    return this.promisifyCall(this.collection.find, { parent_id: parentId });
  }

  // 💡 On garde cette méthode intacte pour le moment
  async getCategoryPath(categoryId) {
    try {
      const allCategories = await this.findAll();
      const pathInfo = buildCategoryPath(allCategories, categoryId);

      // Formater les noms dans le chemin
      const formattedPathInfo = {
        ...pathInfo,
        path: pathInfo.path.map((name) => formatCategoryName(name)),
      };

      // Reconstruire path_string à partir des noms formatés
      formattedPathInfo.path_string = formattedPathInfo.path.join(' > ');

      return formattedPathInfo;
    } catch (error) {
      console.error('Erreur récupération chemin catégorie:', error);
      throw error;
    }
  }
}

module.exports = new Category();
