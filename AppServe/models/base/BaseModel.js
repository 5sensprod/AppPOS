//AppServe\models\base\BaseModel.js
const path = require('path');

class BaseModel {
  constructor(collection, imageFolder) {
    if (this.constructor === BaseModel) {
      throw new Error('BaseModel is abstract');
    }
    this.collection = collection;
    this.imageFolder = imageFolder;
  }

  // 🔁 Méthode utilitaire DRY pour éviter la répétition des callbacks
  promisifyCall(method, ...args) {
    return new Promise((resolve, reject) => {
      method.call(this.collection, ...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  // 🧱 Méthode extensible par les classes enfants
  getDefaultValues() {
    return {};
  }

  // 🔨 CRUD standard avec support de valeurs par défaut
  async create(data) {
    const toInsert = { ...this.getDefaultValues(), ...data };
    return this.promisifyCall(this.collection.insert, toInsert);
  }

  findAll() {
    return this.promisifyCall(this.collection.find, {});
  }

  find(query = {}) {
    return this.promisifyCall(this.collection.find, query);
  }

  findById(id) {
    return this.promisifyCall(this.collection.findOne, { _id: id });
  }

  update(id, updateData) {
    return this.promisifyCall(this.collection.update, { _id: id }, { $set: updateData }, {});
  }

  async delete(id) {
    const entity = await this.findById(id);
    if (!entity) return 0;

    return this.promisifyCall(this.collection.remove, { _id: id }, {});
  }
}

module.exports = BaseModel;
