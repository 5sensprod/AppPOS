// Modification de Supplier.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class Supplier extends BaseModel {
  constructor() {
    super(db.suppliers, 'suppliers');
  }

  // Ajout de méthodes pour gérer le compteur de produits
  async create(data) {
    return new Promise((resolve, reject) => {
      this.collection.insert(
        {
          ...data,
          products_count: 0, // Initialiser le compteur à 0
        },
        (err, newDoc) => {
          if (err) reject(err);
          resolve(newDoc);
        }
      );
    });
  }

  // Nouvelle méthode pour mettre à jour le compteur
  async updateProductCount(supplierId) {
    return new Promise((resolve, reject) => {
      // Cette requête complexe doit vérifier les deux relations possibles:
      // 1. Produits directement liés au fournisseur via supplier_id
      // 2. Produits liés indirectement via une marque associée au fournisseur

      // D'abord, récupérer tous les produits
      db.products.find({}, (err, allProducts) => {
        if (err) {
          reject(err);
          return;
        }

        // Récupérer le fournisseur
        this.findById(supplierId)
          .then((supplier) => {
            if (!supplier) {
              reject(new Error(`Fournisseur avec ID ${supplierId} non trouvé`));
              return;
            }

            // Récupérer toutes les marques associées à ce fournisseur
            const brandIds = Array.isArray(supplier.brands) ? supplier.brands : [];

            // Compteur de produits
            let count = 0;

            // Vérifier chaque produit
            allProducts.forEach((product) => {
              // Un produit est lié à un fournisseur si:
              if (
                // 1. Il a un supplier_id qui correspond
                (product.supplier_id && product.supplier_id === supplierId) ||
                // 2. Il appartient à une marque liée à ce fournisseur
                (product.brand_id && brandIds.includes(product.brand_id))
              ) {
                count++;
              }
            });

            // Mettre à jour le document du fournisseur avec le nouveau compteur
            this.collection.update(
              { _id: supplierId },
              { $set: { products_count: count } },
              {},
              (updateErr) => {
                if (updateErr) {
                  reject(updateErr);
                  return;
                }

                console.log(
                  `Compteur de produits mis à jour pour le fournisseur ${supplierId}: ${count} produits`
                );
                resolve(count);
              }
            );
          })
          .catch(reject);
      });
    });
  }

  // Méthode pour calculer les compteurs pour tous les fournisseurs
  async recalculateAllProductCounts() {
    return new Promise(async (resolve, reject) => {
      try {
        // Récupérer tous les fournisseurs
        const suppliers = await this.findAll();

        // Pour chaque fournisseur, calculer et mettre à jour le compteur
        const updatePromises = suppliers.map((supplier) => this.updateProductCount(supplier._id));

        // Attendre que toutes les mises à jour soient terminées
        await Promise.all(updatePromises);

        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new Supplier();
