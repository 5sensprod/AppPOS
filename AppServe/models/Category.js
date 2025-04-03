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
