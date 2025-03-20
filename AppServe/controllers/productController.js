// controllers/productController.js
const BaseController = require('./base/BaseController');
const Product = require('../models/Product');
const Category = require('../models/Category');
const productWooCommerceService = require('../services/ProductWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');

// Fonction utilitaire pour mettre à jour les références de catégories
async function updateCategoryRefs(productId, categoryIds) {
  try {
    // Si aucune catégorie, effacer les références
    if (!categoryIds || categoryIds.length === 0) {
      await Product.update(productId, {
        categories_refs: [],
        category_ref: null,
      });
      return;
    }

    // Récupérer les détails des catégories
    const categories = await Category.findAll();
    const categoryRefs = categoryIds
      .map((catId) => {
        const category = categories.find((c) => c._id === catId);
        if (category) {
          return {
            id: category._id,
            name: category.name,
            woo_id: category.woo_id || null,
          };
        }
        return null;
      })
      .filter((ref) => ref !== null);

    // Aussi mettre à jour category_ref (première catégorie)
    const primaryCategoryRef =
      categoryRefs.length > 0
        ? {
            id: categoryRefs[0].id,
            name: categoryRefs[0].name,
          }
        : null;

    // Mettre à jour le produit avec les références de catégories
    await Product.update(productId, {
      categories_refs: categoryRefs,
      category_ref: primaryCategoryRef,
    });

    console.log(`[WS-DEBUG] Mise à jour des references de catégories pour le produit ${productId}`);
  } catch (error) {
    console.error('[WS-DEBUG] Erreur lors de la mise à jour des references de catégories:', error);
    throw error;
  }
}

class ProductController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      entity: 'products',
      type: 'gallery',
    });
  }

  async validateCategories(categoryIds) {
    if (!categoryIds || (Array.isArray(categoryIds) && categoryIds.length === 0)) return true;

    if (!Array.isArray(categoryIds)) {
      categoryIds = [categoryIds];
    }

    const categories = await Category.findAll();
    const validCategories = categories.filter((cat) => categoryIds.includes(cat._id));

    if (validCategories.length === 0 || validCategories.length !== categoryIds.length) {
      throw new Error("Certaines catégories spécifiées n'existent pas");
    }

    if (this.shouldSync()) {
      const nonSyncedCategories = validCategories
        .filter((cat) => !cat.woo_id)
        .map((cat) => cat._id);
      if (nonSyncedCategories.length > 0) {
        throw new Error(
          `Catégories non synchronisées avec WooCommerce: ${nonSyncedCategories.join(', ')}`
        );
      }
    }

    return validCategories;
  }

  async create(req, res) {
    try {
      const categories =
        req.body.categories || (req.body.category_id ? [req.body.category_id] : []);

      if (categories.length > 0) {
        await this.validateCategories(categories);
      }

      req.body.categories = categories;
      req.body.category_id = categories.length > 0 ? categories[0] : null;

      // Initialiser categories_refs comme un tableau vide
      req.body.categories_refs = [];

      // Utiliser super.create mais ne pas envoyer la réponse tout de suite
      const newItem = await this.model.create(req.body);

      // Mise à jour des références de catégories
      if (categories.length > 0) {
        await updateCategoryRefs(newItem._id, categories);
      }

      // Notifier du changement de l'arborescence
      if (categories.length > 0) {
        console.log(
          "[WS-DEBUG] Création d'un produit avec catégorie, envoi de category_tree_changed"
        );
        const websocketManager = require('../websocket/websocketManager');
        websocketManager.notifyCategoryTreeChange();
      }

      // Récupérer le produit mis à jour avec les références de catégories
      const updatedItem = await this.model.findById(newItem._id);

      // Standardisation des notifications WebSocket (délégué au BaseController)
      const websocketManager = require('../websocket/websocketManager');
      websocketManager.notifyEntityCreated(this.entityName, updatedItem);

      // Maintenant envoyer la réponse
      return ResponseHandler.created(res, updatedItem);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      let categoryChanged = false;
      let categoriesForRefs = null;

      if ('category_id' in req.body || 'categories' in req.body) {
        const categories =
          req.body.categories || (req.body.category_id ? [req.body.category_id] : []);

        if (categories.length > 0) {
          await this.validateCategories(categories);
        }

        // Vérifier si la catégorie a changé
        const existingProduct = await this.model.findById(req.params.id);
        if (existingProduct) {
          const oldCategories = existingProduct.categories || [];
          if (JSON.stringify(oldCategories.sort()) !== JSON.stringify(categories.sort())) {
            categoryChanged = true;
            categoriesForRefs = categories;
          }
        }

        req.body.categories = categories;
        req.body.category_id = categories.length > 0 ? categories[0] : null;
      }

      // Mise à jour directe sans appeler super.update pour éviter l'envoi de réponse
      const id = req.params.id;
      const updateData = req.body;

      const existing = await this.model.findById(id);
      if (!existing) return ResponseHandler.notFound(res);

      if (existing.woo_id) {
        updateData.pending_sync = true;
      }

      await this.model.update(id, updateData);

      // Mise à jour des références de catégories si nécessaire
      if (categoryChanged && categoriesForRefs !== null) {
        await updateCategoryRefs(id, categoriesForRefs);
      }

      if (categoryChanged) {
        console.log(
          "[WS-DEBUG] La catégorie d'un produit a changé, envoi de category_tree_changed"
        );
        const websocketManager = require('../websocket/websocketManager');
        websocketManager.notifyCategoryTreeChange();
      }

      // Récupérer le produit mis à jour
      const updatedItem = await this.model.findById(id);

      // Standardisation des notifications WebSocket
      const websocketManager = require('../websocket/websocketManager');
      websocketManager.notifyEntityUpdated(this.entityName, id, updatedItem);

      // Gestion de la synchronisation WooCommerce si nécessaire
      if (this.shouldSync() && this.wooCommerceService) {
        try {
          await this.wooCommerceService.syncToWooCommerce([updatedItem]);
          await this.model.update(id, { pending_sync: false });
        } catch (syncError) {
          return ResponseHandler.partialSuccess(res, updatedItem, syncError);
        }
      }

      // Envoyer la réponse une seule fois à la fin
      return ResponseHandler.success(res, updatedItem);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

const productController = new ProductController();

module.exports = {
  getAll: productController.getAll.bind(productController),
  getById: productController.getById.bind(productController),
  create: productController.create.bind(productController),
  update: productController.update.bind(productController),
  delete: productController.delete.bind(productController),
  uploadImage: productController.uploadImage,
  updateImageMetadata: productController.updateImageMetadata,
  deleteImage: productController.deleteImage,
  setMainImage: productController.setMainImage,
  updateCategoryRefs: updateCategoryRefs, // Exposer la fonction pour l'utiliser ailleurs si nécessaire
};
