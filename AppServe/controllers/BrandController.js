const BaseController = require('./base/BaseController');
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const brandWooCommerceService = require('../services/BrandWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');
const { getEntityEventService } = require('../services/events/entityEvents');
const { createBrand, updateBrand, deleteBrand } = require('../services/brandService');

class BrandController extends BaseController {
  constructor() {
    super(Brand, brandWooCommerceService, {
      image: { type: 'single' },
      deleteFromWoo: (id) => brandWooCommerceService.deleteBrand(id),
    });
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
      const brand = await createBrand(req.body);

      const syncResponse = await this.syncIfNeeded([brand], res);
      if (syncResponse) return syncResponse;

      return ResponseHandler.created(res, brand);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const brand = await this.getByIdOr404(req.params.id, res);
      if (!brand) return;

      const updated = await updateBrand(req.params.id, req.body);

      const syncResponse = await this.syncIfNeeded([updated], res);
      if (syncResponse) return syncResponse;

      return ResponseHandler.success(res, updated);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const brand = await this.getByIdOr404(req.params.id, res);
      if (!brand) return;

      await this.handleImageDeletion(brand);
      await this.handleWooCommerceDelete(brand);

      const result = await deleteBrand(brand);
      return ResponseHandler.success(res, {
        ...result,
        woo_status: brand.woo_id ? 'synchronized' : 'not_applicable',
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

const brandController = new BrandController();

const exportController = require('../utils/exportController');

module.exports = {
  ...exportController(brandController, [
    'getAll',
    'getById',
    'create',
    'update',
    'delete',
    'uploadImage',
    'updateImageMetadata',
    'deleteImage',
  ]),
  getBySupplier: brandController.getBySupplier.bind(brandController),
};
