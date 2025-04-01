// controllers/SupplierController.js
const BaseController = require('./base/BaseController');
const Supplier = require('../models/Supplier');
const Brand = require('../models/Brand');
const ResponseHandler = require('../handlers/ResponseHandler');
const { getEntityEventService } = require('../services/events/entityEvents');

class SupplierController extends BaseController {
  constructor() {
    // Pas de service WooCommerce pour les fournisseurs
    super(Supplier, null, {
      entity: 'suppliers',
      type: 'single',
    });
    // Initialiser le service d'événements
    this.eventService = getEntityEventService(this.entityName);
  }

  async create(req, res) {
    try {
      // Vérifier si des marques sont spécifiées
      if (req.body.brands && Array.isArray(req.body.brands) && req.body.brands.length > 0) {
        // Vérifier l'existence de chaque marque
        for (const brandId of req.body.brands) {
          const brand = await Brand.findById(brandId);
          if (!brand) {
            return ResponseHandler.badRequest(res, {
              message: `La marque avec l'ID ${brandId} n'existe pas`,
            });
          }
        }
      }

      // Créer le nouveau fournisseur
      const newItem = await this.model.create(req.body);

      // Mettre à jour les marques associées à ce fournisseur
      if (req.body.brands && Array.isArray(req.body.brands) && req.body.brands.length > 0) {
        for (const brandId of req.body.brands) {
          const brand = await Brand.findById(brandId);

          // Ajouter ce fournisseur à la liste des fournisseurs de la marque
          const existingSuppliers = Array.isArray(brand.suppliers) ? brand.suppliers : [];
          if (!existingSuppliers.includes(newItem._id.toString())) {
            await Brand.update(brandId, {
              suppliers: [...existingSuppliers, newItem._id.toString()],
            });
          }
        }
      }

      // Utiliser le service d'événements
      this.eventService.created(newItem);

      return ResponseHandler.created(res, newItem);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getAll(req, res) {
    try {
      const items = await this.model.findAll();
      return ResponseHandler.success(res, items);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getById(req, res) {
    try {
      const item = await this.model.findById(req.params.id);
      if (!item) return ResponseHandler.notFound(res);
      return ResponseHandler.success(res, item);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const supplier = await this.model.findById(req.params.id);
      if (!supplier) return ResponseHandler.notFound(res);

      // Préparer les données de mise à jour
      const updateData = { ...req.body };

      // Récupérer la liste actuelle des marques
      const oldBrands = Array.isArray(supplier.brands) ? supplier.brands : [];

      // Déterminer les nouvelles marques
      let newBrands = oldBrands;
      if (updateData.brands && Array.isArray(updateData.brands)) {
        // Gérer l'ajout de marques sans écraser les existantes
        // Fusionner avec les marques existantes si le tableau n'est pas vide
        if (updateData.brands.length > 0) {
          // Fusionner les listes sans doublons
          newBrands = [...new Set([...oldBrands, ...updateData.brands])];

          // Vérifier l'existence de chaque nouvelle marque
          for (const brandId of updateData.brands) {
            const brand = await Brand.findById(brandId);
            if (!brand) {
              return ResponseHandler.badRequest(res, {
                message: `La marque avec l'ID ${brandId} n'existe pas`,
              });
            }
          }
        } else {
          // Si brands est un tableau vide, cela effacera les marques (comportement voulu)
          newBrands = [];
        }
        updateData.brands = newBrands;
      } else {
        // Si brands n'est pas défini, ne pas le modifier
        delete updateData.brands;
      }

      // Mettre à jour avec les données validées
      const updated = await this.model.update(req.params.id, updateData);

      // Gérer les associations bidirectionnelles
      // 1. Supprimer ce fournisseur des marques qui ne sont plus associées
      const removedBrands = oldBrands.filter((id) => !newBrands.includes(id));
      for (const brandId of removedBrands) {
        const brand = await Brand.findById(brandId);
        if (brand && brand.suppliers) {
          const updatedSuppliers = brand.suppliers.filter((id) => id.toString() !== req.params.id);
          await Brand.update(brandId, { suppliers: updatedSuppliers });
        }
      }

      // 2. Ajouter ce fournisseur aux nouvelles marques
      const addedBrands = newBrands.filter((id) => !oldBrands.includes(id));
      for (const brandId of addedBrands) {
        const brand = await Brand.findById(brandId);
        if (brand) {
          const existingSuppliers = Array.isArray(brand.suppliers) ? brand.suppliers : [];
          if (!existingSuppliers.includes(req.params.id)) {
            await Brand.update(brandId, {
              suppliers: [...existingSuppliers, req.params.id],
            });
          }
        }
      }

      // Émettre l'événement de mise à jour
      this.eventService.updated(req.params.id, updated);

      const finalSupplier = await this.model.findById(req.params.id);

      await this.model.updateProductCount(req.params.id);

      // Recalculer les compteurs pour les marques modifiées
      if (addedBrands.length > 0 || removedBrands.length > 0) {
        const Brand = require('../models/Brand');
        const affectedBrands = [...new Set([...addedBrands, ...removedBrands])];

        for (const brandId of affectedBrands) {
          await Brand.updateProductCount(brandId);
        }
      }

      return ResponseHandler.success(res, finalSupplier);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const supplier = await this.model.findById(req.params.id);
      if (!supplier) return ResponseHandler.notFound(res);

      // Supprimer ce fournisseur de toutes les marques associées
      if (supplier.brands && Array.isArray(supplier.brands)) {
        for (const brandId of supplier.brands) {
          const brand = await Brand.findById(brandId);
          if (brand && brand.suppliers) {
            const updatedSuppliers = brand.suppliers.filter(
              (id) => id.toString() !== req.params.id
            );
            await Brand.update(brandId, { suppliers: updatedSuppliers });
          }
        }
      }

      // Supprimer les images associées
      await this.handleImageDeletion(supplier);

      // Supprimer l'entité dans la base de données
      await this.model.delete(req.params.id);

      // Utiliser le service d'événements
      this.eventService.deleted(req.params.id);

      if (supplier.brands && Array.isArray(supplier.brands)) {
        const Brand = require('../models/Brand');
        for (const brandId of supplier.brands) {
          await Brand.updateProductCount(brandId);
        }
      }

      return ResponseHandler.success(res, {
        message: 'Fournisseur supprimé avec succès',
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async updateWithMetadata(req, res) {
    try {
      const id = req.params.id;
      const updateData = { ...req.body, updated_at: new Date() };

      await this.model.update(id, updateData);
      const updatedItem = await this.model.findById(id);

      // Émettre l'événement de mise à jour
      this.eventService.updated(id, updatedItem);

      return ResponseHandler.success(res, updatedItem);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

const supplierController = new SupplierController();

module.exports = {
  getAll: supplierController.getAll.bind(supplierController),
  getById: supplierController.getById.bind(supplierController),
  create: supplierController.create.bind(supplierController),
  update: supplierController.update.bind(supplierController),
  delete: supplierController.delete.bind(supplierController),
  uploadImage: supplierController.uploadImage,
  updateImageMetadata: supplierController.updateImageMetadata,
  deleteImage: supplierController.deleteImage,
  updateWithMetadata: supplierController.updateWithMetadata.bind(supplierController),
};
