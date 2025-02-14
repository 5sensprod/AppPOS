const path = require('path');
const fs = require('fs/promises');

class BaseModel {
  constructor(collection, imageFolder) {
    if (this.constructor === BaseModel) {
      throw new Error('BaseModel is abstract');
    }
    this.collection = collection;
    this.imageFolder = imageFolder;
  }

  create(data) {
    return new Promise((resolve, reject) => {
      this.collection.insert(data, (err, newDoc) => {
        if (err) reject(err);
        resolve(newDoc);
      });
    });
  }

  findAll() {
    return new Promise((resolve, reject) => {
      this.collection.find({}, (err, docs) => {
        if (err) reject(err);
        resolve(docs);
      });
    });
  }

  findById(id) {
    return new Promise((resolve, reject) => {
      this.collection.findOne({ _id: id }, (err, doc) => {
        if (err) reject(err);
        resolve(doc);
      });
    });
  }

  update(id, updateData) {
    return new Promise((resolve, reject) => {
      this.collection.update({ _id: id }, { $set: updateData }, {}, (err, numReplaced) => {
        if (err) reject(err);
        resolve(numReplaced);
      });
    });
  }

  async delete(id) {
    try {
      const entity = await this.findById(id);
      if (!entity) return 0;

      if (entity.image?.local_path) {
        const projectRoot = path.resolve(__dirname, '../../');
        const imageDir = path.join(projectRoot, 'public', this.imageFolder, id);
        try {
          await fs.rm(imageDir, { recursive: true, force: true });
        } catch (err) {
          console.error('Erreur suppression dossier:', err);
        }
      }

      return new Promise((resolve, reject) => {
        this.collection.remove({ _id: id }, {}, (err, numRemoved) => {
          if (err) reject(err);
          resolve(numRemoved);
        });
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = BaseModel;
