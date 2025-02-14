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
}

module.exports = new Category();
