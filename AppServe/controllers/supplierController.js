// controllers/SupplierController.js
const BaseController = require('./base/BaseController');
const Supplier = require('../models/Supplier');
const Brand = require('../models/Brand');
const ResponseHandler = require('../handlers/ResponseHandler');
const { getEntityEventService } = require('../services/events/entityEvents');
const {
  validateBrands,
  syncSupplierWithBrands,
  removeSupplierFromBrands,
} = require('../services/supplierService');

class SupplierController extends BaseController {
  constructor() {
    super(Supplier, null, { entity: 'suppliers', type: 'single' });
    this.eventService = getEntityEventService(this.entityName);
  }

  async create(req, res) {
    try {
      const { brands = [] } = req.body;
      if (brands.length > 0) await validateBrands(brands);

      const newItem = await this.model.create(req.body);
      await syncSupplierWithBrands(newItem._id.toString(), brands);

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
      const supplier = await this.getByIdOr404(req.params.id, res);
      if (!supplier) return;

      const updateData = { ...req.body };
      const oldBrands = Array.isArray(supplier.brands) ? supplier.brands : [];
      let newBrands = oldBrands;

      if (Array.isArray(updateData.brands)) {
        if (updateData.brands.length > 0) {
          await validateBrands(updateData.brands);
          newBrands = [...new Set([...oldBrands, ...updateData.brands])];
        } else {
          newBrands = [];
        }
        updateData.brands = newBrands;
      } else {
        delete updateData.brands;
      }

      const updated = await this.model.update(req.params.id, updateData);

      const removedBrands = oldBrands.filter((id) => !newBrands.includes(id));
      const addedBrands = newBrands.filter((id) => !oldBrands.includes(id));

      await removeSupplierFromBrands(req.params.id, removedBrands);
      await syncSupplierWithBrands(req.params.id, addedBrands);

      this.eventService.updated(req.params.id, updated);

      const finalSupplier = await this.model.findById(req.params.id);
      await this.model.updateProductCount(req.params.id);

      if (addedBrands.length > 0 || removedBrands.length > 0) {
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
      const supplier = await this.getByIdOr404(req.params.id, res);
      if (!supplier) return;

      await removeSupplierFromBrands(req.params.id, supplier.brands);
      await this.handleImageDeletion(supplier);
      await this.model.delete(req.params.id);

      this.eventService.deleted(req.params.id);

      for (const brandId of supplier.brands || []) {
        await Brand.updateProductCount(brandId);
      }

      return ResponseHandler.success(res, { message: 'Fournisseur supprimé avec succès' });
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
