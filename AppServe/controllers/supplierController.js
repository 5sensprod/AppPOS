const BaseController = require('./base/BaseController');
const Supplier = require('../models/Supplier');
const Brand = require('../models/Brand');
const ResponseHandler = require('../handlers/ResponseHandler');
const { getEntityEventService } = require('../services/events/entityEvents');
const { createSupplier, updateSupplier, deleteSupplier } = require('../services/supplierService');

class SupplierController extends BaseController {
  constructor() {
    super(Supplier, null, {
      image: { type: 'single' },
    });
    this.eventService = getEntityEventService(this.entityName);
  }

  async create(req, res) {
    try {
      const supplier = await createSupplier(req.body);
      return ResponseHandler.created(res, supplier);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const existing = await this.getByIdOr404(req.params.id, res);
      if (!existing) return;

      const updated = await updateSupplier(req.params.id, req.body);
      await this.model.updateProductCount(req.params.id);

      // Maj des marques liées
      const affectedBrands = new Set([...(existing.brands || []), ...(updated.brands || [])]);
      for (const brandId of affectedBrands) {
        await Brand.updateProductCount(brandId);
      }

      return ResponseHandler.success(res, updated);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const supplier = await this.getByIdOr404(req.params.id, res);
      if (!supplier) return;

      await this.handleImageDeletion(supplier);
      const result = await deleteSupplier(supplier);

      return ResponseHandler.success(res, result);
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

      this.eventService.updated(id, updatedItem);
      return ResponseHandler.success(res, updatedItem);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

const supplierController = new SupplierController();
const exportController = require('../utils/exportController');

module.exports = exportController(supplierController, [
  'getAll',
  'getById',
  'create',
  'update',
  'delete',
  'uploadImage',
  'updateImageMetadata',
  'deleteImage',
  'updateWithMetadata',
]);
