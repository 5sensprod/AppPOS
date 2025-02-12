// models/Supplier.js
const db = require('../config/database');

class Supplier {
  static create(supplierData) {
    return new Promise((resolve, reject) => {
      db.suppliers.insert(supplierData, (err, newDoc) => {
        if (err) reject(err);
        resolve(newDoc);
      });
    });
  }

  static findAll() {
    return new Promise((resolve, reject) => {
      db.suppliers.find({}, (err, docs) => {
        if (err) reject(err);
        resolve(docs);
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.suppliers.findOne({ _id: id }, (err, doc) => {
        if (err) reject(err);
        resolve(doc);
      });
    });
  }

  static update(id, updateData) {
    return new Promise((resolve, reject) => {
      db.suppliers.update({ _id: id }, { $set: updateData }, {}, (err, numReplaced) => {
        if (err) reject(err);
        resolve(numReplaced);
      });
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.suppliers.remove({ _id: id }, {}, (err, numRemoved) => {
        if (err) reject(err);
        resolve(numRemoved);
      });
    });
  }
}

module.exports = Supplier;
