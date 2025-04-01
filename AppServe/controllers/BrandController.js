// controllers/BrandController.js
const BaseController = require('./base/BaseController');
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const brandWooCommerceService = require('../services/BrandWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');
const { getEntityEventService } = require('../services/events/entityEvents');

class BrandController extends BaseController {
  constructor() {
    super(Brand, brandWooCommerceService, {
      entity: 'brands',
      type: 'single',
    });
    // Initialiser le service d'événements
    this.eventService = getEntityEventService(this.entityName);
  }

  async getBySupplier(req, res) {
    try {
      const brands = await this.model.findBySupplier(req.params.supplierId);
      return ResponseHandler.success(res, brands);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async create(req, res) {
    try {
      // Vérifier si un fournisseur est spécifié et n'est pas null/undefined/vide
      if (req.body.supplier_id && req.body.supplier_id.trim() !== '') {
        // Vérifier si le fournisseur existe
        const supplier = await Supplier.findById(req.body.supplier_id);
        if (!supplier) {
          return ResponseHandler.badRequest(res, {
            message: "Le fournisseur spécifié n'existe pas",
          });
        }
      }

      // Vérifier si des fournisseurs sont spécifiés via le tableau suppliers
      if (
        req.body.suppliers &&
        Array.isArray(req.body.suppliers) &&
        req.body.suppliers.length > 0
      ) {
        // Vérifier l'existence de chaque fournisseur
        for (const supplierId of req.body.suppliers) {
          const supplier = await Supplier.findById(supplierId);
          if (!supplier) {
            return ResponseHandler.badRequest(res, {
              message: `Le fournisseur avec l'ID ${supplierId} n'existe pas`,
            });
          }
        }
      }

      // Créer la nouvelle marque
      const newItem = await this.model.create(req.body);

      // Mettre à jour les fournisseurs associés à cette marque
      if (
        req.body.suppliers &&
        Array.isArray(req.body.suppliers) &&
        req.body.suppliers.length > 0
      ) {
        for (const supplierId of req.body.suppliers) {
          const supplier = await Supplier.findById(supplierId);

          // Ajouter cette marque à la liste des marques du fournisseur
          const existingBrands = Array.isArray(supplier.brands) ? supplier.brands : [];
          if (!existingBrands.includes(newItem._id.toString())) {
            await Supplier.update(supplierId, {
              brands: [...existingBrands, newItem._id.toString()],
            });
          }
        }
      }

      // Utiliser le service d'événements
      this.eventService.created(newItem);

      if (this.shouldSync() && this.wooCommerceService) {
        try {
          const syncResult = await this.wooCommerceService.syncToWooCommerce([newItem]);
          if (syncResult.errors.length > 0) {
            return ResponseHandler.partialSuccess(res, newItem, {
              message: syncResult.errors.join(', '),
            });
          }
        } catch (syncError) {
          return ResponseHandler.partialSuccess(res, newItem, syncError);
        }
      }

      const finalBrand = await this.model.findById(req.params.id);

      // Recalculer les compteurs de produits
      await this.model.updateProductCount(req.params.id);

      return ResponseHandler.created(res, newItem);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const brand = await this.model.findById(req.params.id);
      if (!brand) return ResponseHandler.notFound(res);

      // Préparer les données de mise à jour
      const updateData = { ...req.body };

      // Vérifier si un nouveau fournisseur est spécifié via supplier_id
      if (updateData.supplier_id && updateData.supplier_id.trim() !== '') {
        // Vérifier si le fournisseur existe
        const supplier = await Supplier.findById(updateData.supplier_id);
        if (!supplier) {
          return ResponseHandler.badRequest(res, {
            message: "Le fournisseur spécifié n'existe pas",
          });
        }
      }

      // Récupérer la liste actuelle des fournisseurs
      const oldSuppliers = Array.isArray(brand.suppliers) ? brand.suppliers : [];

      // Déterminer les nouveaux fournisseurs
      let newSuppliers = oldSuppliers;
      if (updateData.suppliers && Array.isArray(updateData.suppliers)) {
        // Gérer l'ajout de fournisseurs sans écraser les existants
        // Fusionner avec les fournisseurs existants si le tableau n'est pas vide
        if (updateData.suppliers.length > 0) {
          // Fusionner les listes sans doublons
          newSuppliers = [...new Set([...oldSuppliers, ...updateData.suppliers])];

          // Vérifier l'existence de chaque fournisseur
          for (const supplierId of updateData.suppliers) {
            const supplier = await Supplier.findById(supplierId);
            if (!supplier) {
              return ResponseHandler.badRequest(res, {
                message: `Le fournisseur avec l'ID ${supplierId} n'existe pas`,
              });
            }
          }
        } else {
          // Si suppliers est un tableau vide, cela effacera les fournisseurs (comportement voulu)
          newSuppliers = [];
        }
        updateData.suppliers = newSuppliers;
      } else {
        // Si suppliers n'est pas défini, ne pas le modifier
        delete updateData.suppliers;
      }

      const updated = await this.model.update(req.params.id, updateData);

      // Gérer les associations bidirectionnelles
      // 1. Supprimer cette marque des fournisseurs qui ne sont plus associés
      const removedSuppliers = oldSuppliers.filter((id) => !newSuppliers.includes(id));
      for (const supplierId of removedSuppliers) {
        const supplier = await Supplier.findById(supplierId);
        if (supplier && supplier.brands) {
          const updatedBrands = supplier.brands.filter((id) => id.toString() !== req.params.id);
          await Supplier.update(supplierId, { brands: updatedBrands });
        }
      }

      // 2. Ajouter cette marque aux nouveaux fournisseurs
      const addedSuppliers = newSuppliers.filter((id) => !oldSuppliers.includes(id));
      for (const supplierId of addedSuppliers) {
        const supplier = await Supplier.findById(supplierId);
        if (supplier) {
          const existingBrands = Array.isArray(supplier.brands) ? supplier.brands : [];
          if (!existingBrands.includes(req.params.id)) {
            await Supplier.update(supplierId, {
              brands: [...existingBrands, req.params.id],
            });
          }
        }
      }

      // Émettre l'événement de mise à jour via le service d'événements
      this.eventService.updated(req.params.id, updated);

      if (this.shouldSync() && this.wooCommerceService) {
        const updatedBrand = await this.model.findById(req.params.id);
        try {
          await this.wooCommerceService.syncToWooCommerce(updatedBrand);
        } catch (syncError) {
          return ResponseHandler.partialSuccess(res, updated, syncError);
        }
      }

      const finalBrand = await this.model.findById(req.params.id);
      return ResponseHandler.success(res, finalBrand);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const brand = await this.model.findById(req.params.id);
      if (!brand) return ResponseHandler.notFound(res);

      // Supprimer cette marque de tous les fournisseurs associés
      if (brand.suppliers && Array.isArray(brand.suppliers)) {
        for (const supplierId of brand.suppliers) {
          const supplier = await Supplier.findById(supplierId);
          if (supplier && supplier.brands) {
            const updatedBrands = supplier.brands.filter((id) => id.toString() !== req.params.id);
            await Supplier.update(supplierId, { brands: updatedBrands });
          }
        }
      }

      // Vérification des produits liés (si nécessaire)
      // ...

      // Supprimer l'image et l'entité de WooCommerce (si synchronisée)
      await this.handleImageDeletion(brand);
      await this.handleWooCommerceDelete(brand);

      // Supprimer l'entité localement
      await this.model.delete(req.params.id);

      // Émettre l'événement de suppression via le service d'événements
      this.eventService.deleted(req.params.id);

      if (brand.suppliers && Array.isArray(brand.suppliers)) {
        const Supplier = require('../models/Supplier');
        for (const supplierId of brand.suppliers) {
          await Supplier.updateProductCount(supplierId);
        }
      }

      return ResponseHandler.success(res, {
        message: 'Marque supprimée avec succès',
        woo_status: brand.woo_id ? 'synchronized' : 'not_applicable',
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

const brandController = new BrandController();

module.exports = {
  getAll: brandController.getAll.bind(brandController),
  getById: brandController.getById.bind(brandController),
  create: brandController.create.bind(brandController),
  update: brandController.update.bind(brandController),
  delete: brandController.delete.bind(brandController),
  getBySupplier: brandController.getBySupplier.bind(brandController),
  uploadImage: brandController.uploadImage,
  updateImageMetadata: brandController.updateImageMetadata,
  deleteImage: brandController.deleteImage,
};
