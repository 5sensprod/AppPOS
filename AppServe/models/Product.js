// models/Product.js
const db = require('../config/database');
const path = require('path');
const fs = require('fs/promises');

class Product {
  static create(productData) {
    return new Promise((resolve, reject) => {
      db.products.insert(productData, (err, newDoc) => {
        if (err) reject(err);
        resolve(newDoc);
      });
    });
  }

  static findAll() {
    return new Promise((resolve, reject) => {
      db.products.find({}, (err, docs) => {
        if (err) reject(err);
        resolve(docs);
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.products.findOne({ _id: id }, (err, doc) => {
        if (err) reject(err);
        resolve(doc);
      });
    });
  }

  static update(id, updateData) {
    return new Promise((resolve, reject) => {
      db.products.update({ _id: id }, { $set: updateData }, {}, (err, numReplaced) => {
        if (err) reject(err);
        resolve(numReplaced);
      });
    });
  }

  static async delete(id) {
    try {
      const product = await this.findById(id);
      if (!product) return 0;

      if (product.image?.local_path) {
        const projectRoot = path.resolve(__dirname, '../../');
        const imageDir = path.join(projectRoot, 'public', 'products', id);
        try {
          await fs.rm(imageDir, { recursive: true, force: true });
        } catch (err) {
          console.error('Erreur suppression dossier:', err);
        }
      }

      return new Promise((resolve, reject) => {
        db.products.remove({ _id: id }, {}, (err, numRemoved) => {
          if (err) reject(err);
          resolve(numRemoved);
        });
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Product;
