// controllers/SupplierController.js
const BaseController = require('./base/BaseController');
const Supplier = require('../models/Supplier');
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

  // Vous pouvez ajouter ici des méthodes spécifiques aux fournisseurs qui utilisent this.eventService
  // Exemple:
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
  // Si vous ajoutez la méthode updateWithMetadata, exportez-la ici
  // updateWithMetadata: supplierController.updateWithMetadata.bind(supplierController),
};
