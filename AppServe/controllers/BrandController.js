// controllers/BrandController.js
const BaseController = require('./base/BaseController');
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const brandWooCommerceService = require('../services/BrandWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');
const { getEntityEventService } = require('../services/events/entityEvents');
const {
  validateSuppliers,
  syncBrandWithSuppliers,
  removeBrandFromSuppliers,
} = require('../services/brandService');

class BrandController extends BaseController {
  constructor() {
    super(Brand, brandWooCommerceService, { entity: 'brands', type: 'single' });
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
      const { supplier_id, suppliers = [] } = req.body;
      if (supplier_id?.trim()) await validateSuppliers([supplier_id]);
      if (suppliers.length > 0) await validateSuppliers(suppliers);

      const newItem = await this.model.create(req.body);
      await syncBrandWithSuppliers(newItem._id.toString(), suppliers);

      this.eventService.created(newItem);

      const syncResponse = await this.syncIfNeeded([newItem], res);
      if (syncResponse) return syncResponse;

      await this.model.updateProductCount(newItem._id);
      return ResponseHandler.created(res, newItem);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const brand = await this.getByIdOr404(req.params.id, res);
      if (!brand) return;

      const updateData = { ...req.body };
      const { supplier_id, suppliers } = updateData;
      const oldSuppliers = Array.isArray(brand.suppliers) ? brand.suppliers : [];
      let newSuppliers = oldSuppliers;

      if (supplier_id?.trim()) await validateSuppliers([supplier_id]);

      if (Array.isArray(suppliers)) {
        if (suppliers.length > 0) {
          await validateSuppliers(suppliers);
          newSuppliers = [...new Set([...oldSuppliers, ...suppliers])];
        } else {
          newSuppliers = [];
        }
        updateData.suppliers = newSuppliers;
      } else {
        delete updateData.suppliers;
      }

      const updated = await this.model.update(req.params.id, updateData);

      await removeBrandFromSuppliers(
        req.params.id,
        oldSuppliers.filter((id) => !newSuppliers.includes(id))
      );
      await syncBrandWithSuppliers(
        req.params.id,
        newSuppliers.filter((id) => !oldSuppliers.includes(id))
      );

      this.eventService.updated(req.params.id, updated);

      const syncResponse = await this.syncIfNeeded([updated], res);
      if (syncResponse) return syncResponse;

      const finalBrand = await this.model.findById(req.params.id);
      return ResponseHandler.success(res, finalBrand);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const brand = await this.getByIdOr404(req.params.id, res);
      if (!brand) return;

      await removeBrandFromSuppliers(req.params.id, brand.suppliers);
      await this.handleImageDeletion(brand);
      await this.handleWooCommerceDelete(brand);

      await this.model.delete(req.params.id);
      this.eventService.deleted(req.params.id);

      for (const supplierId of brand.suppliers || []) {
        await Supplier.updateProductCount(supplierId);
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
