// controllers/BrandController.js
const BaseController = require('./base/BaseController');
const Brand = require('../models/Brand');
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

  async update(req, res) {
    try {
      const brand = await this.model.findById(req.params.id);
      if (!brand) return ResponseHandler.notFound(res);

      const updated = await this.model.update(req.params.id, req.body);

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

      // Vérification des produits liés (si nécessaire)
      // ...

      // Supprimer l'image et l'entité de WooCommerce (si synchronisée)
      await this.handleImageDeletion(brand);
      await this.handleWooCommerceDelete(brand);

      // Supprimer l'entité localement
      await this.model.delete(req.params.id);

      // Émettre l'événement de suppression via le service d'événements
      this.eventService.deleted(req.params.id);

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
