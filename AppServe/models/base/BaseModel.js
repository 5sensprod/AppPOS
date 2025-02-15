//AppServe\models\base\BaseModel.js
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
      // 1. Trouver l'entité
      const entity = await this.findById(id);
      if (!entity) return 0;

      // 2. Supprimer le dossier d'images si existe
      if (entity.image?.local_path) {
        try {
          // 2.1 Vérifier que le dossier existe
          const projectRoot = path.resolve(__dirname, '../../');
          const imageDir = path.join(projectRoot, 'public', this.imageFolder, id);

          // 2.2 Vérifier si le dossier existe avant de tenter de le supprimer
          const dirExists = await fs
            .access(imageDir)
            .then(() => true)
            .catch(() => false);

          if (dirExists) {
            // 2.3 Supprimer d'abord le fichier image spécifique
            if (entity.image.local_path) {
              await fs
                .unlink(entity.image.local_path)
                .catch((err) => console.warn('Erreur suppression fichier:', err));
            }

            // 2.4 Puis supprimer le dossier complet
            await fs
              .rm(imageDir, { recursive: true, force: true })
              .catch((err) => console.warn('Erreur suppression dossier:', err));
          }
        } catch (err) {
          console.error('Erreur lors de la suppression des fichiers:', err);
          // On continue la suppression de l'entité même si erreur fichiers
        }
      }

      // 3. Supprimer l'entité de la base de données
      return new Promise((resolve, reject) => {
        this.collection.remove({ _id: id }, {}, (err, numRemoved) => {
          if (err) {
            console.error('Erreur suppression base de données:', err);
            reject(err);
          }
          resolve(numRemoved);
        });
      });
    } catch (error) {
      console.error('Erreur générale lors de la suppression:', error);
      throw error;
    }
  }
}

module.exports = BaseModel;
