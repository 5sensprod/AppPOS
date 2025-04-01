// controllers/productController.js
const BaseController = require('./base/BaseController');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const productWooCommerceService = require('../services/ProductWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');
const { getEntityEventService } = require('../services/events/entityEvents');

// Fonction utilitaire pour mettre à jour les références de catégories
async function updateCategoryRefs(productId, categoryIds) {
  try {
    const eventService = getEntityEventService('products');

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
    // Initialiser le service d'événements
    this.eventService = getEntityEventService(this.entityName);
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

      // Mise à jour des compteurs si une marque ou un fournisseur est spécifié
      if (req.body.brand_id) {
        await Brand.updateProductCount(req.body.brand_id);
      }

      if (req.body.supplier_id) {
        await Supplier.updateProductCount(req.body.supplier_id);
      }

      // Mise à jour des références de catégories
      if (categories.length > 0) {
        await updateCategoryRefs(newItem._id, categories);
      }

      // Notifier du changement de l'arborescence avec le service d'événements
      if (categories.length > 0) {
        console.log(
          "[WS-DEBUG] Création d'un produit avec catégorie, envoi de category_tree_changed"
        );
        // Obtenir le service d'événements pour les catégories
        const categoryEventService = getEntityEventService('categories');
        categoryEventService.categoryTreeChanged();
      }

      // Récupérer le produit mis à jour avec les références de catégories
      const updatedItem = await this.model.findById(newItem._id);

      // Émettre l'événement de création
      this.eventService.created(updatedItem);
      this.eventService.created(newItem);

      // Maintenant envoyer la réponse
      return ResponseHandler.created(res, updatedItem);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const existingProduct = await this.model.findById(req.params.id);
      if (!existingProduct) return ResponseHandler.notFound(res);

      // Sauvegarder les anciennes valeurs pour vérifier les changements
      const oldBrandId = existingProduct.brand_id;
      const oldSupplierId = existingProduct.supplier_id;
      const oldCategories = existingProduct.categories || [];

      let categoryChanged = false;
      let categoriesForRefs = null;

      if ('category_id' in req.body || 'categories' in req.body) {
        const categories =
          req.body.categories || (req.body.category_id ? [req.body.category_id] : []);

        if (categories.length > 0) {
          await this.validateCategories(categories);
        }

        // Vérifier si la catégorie a changé
        if (JSON.stringify(oldCategories.sort()) !== JSON.stringify(categories.sort())) {
          categoryChanged = true;
          categoriesForRefs = categories;
        }

        req.body.categories = categories;
        req.body.category_id = categories.length > 0 ? categories[0] : null;
      }

      // Mise à jour directe
      const id = req.params.id;
      const updateData = req.body;

      if (existingProduct.woo_id) {
        updateData.pending_sync = true;
      }

      await this.model.update(id, updateData);

      // Importer les modèles à l'intérieur de la fonction pour éviter les erreurs
      const Brand = require('../models/Brand');
      const Supplier = require('../models/Supplier');

      // Mise à jour des références de catégories si nécessaire
      if (categoryChanged && categoriesForRefs !== null) {
        await updateCategoryRefs(id, categoriesForRefs);
      }

      if (categoryChanged) {
        console.log(
          "[WS-DEBUG] La catégorie d'un produit a changé, envoi de category_tree_changed"
        );
        // Obtenir le service d'événements pour les catégories
        const categoryEventService = getEntityEventService('categories');
        categoryEventService.categoryTreeChanged();
      }

      // Vérifier si la marque a changé et mettre à jour les compteurs
      if ('brand_id' in updateData && updateData.brand_id !== oldBrandId) {
        console.log(
          `Marque changée de ${oldBrandId} à ${updateData.brand_id}, mise à jour des compteurs`
        );

        // Mettre à jour le compteur pour l'ancienne marque
        if (oldBrandId) {
          await Brand.updateProductCount(oldBrandId);
        }

        // Mettre à jour le compteur pour la nouvelle marque
        if (updateData.brand_id) {
          await Brand.updateProductCount(updateData.brand_id);
        }
      }

      // Vérifier si le fournisseur a changé et mettre à jour les compteurs
      if ('supplier_id' in updateData && updateData.supplier_id !== oldSupplierId) {
        console.log(
          `Fournisseur changé de ${oldSupplierId} à ${updateData.supplier_id}, mise à jour des compteurs`
        );

        // Mettre à jour le compteur pour l'ancien fournisseur
        if (oldSupplierId) {
          await Supplier.updateProductCount(oldSupplierId);
        }

        // Mettre à jour le compteur pour le nouveau fournisseur
        if (updateData.supplier_id) {
          await Supplier.updateProductCount(updateData.supplier_id);
        }
      }

      // Récupérer le produit mis à jour
      const updatedItem = await this.model.findById(id);

      // Émettre l'événement de mise à jour
      this.eventService.updated(id, updatedItem);

      // Gestion de la synchronisation WooCommerce si nécessaire
      if (this.shouldSync() && this.wooCommerceService) {
        try {
          await this.wooCommerceService.syncToWooCommerce([updatedItem]);
          await this.model.update(id, { pending_sync: false });
        } catch (syncError) {
          return ResponseHandler.partialSuccess(res, updatedItem, syncError);
        }
      }

      // Envoyer la réponse
      return ResponseHandler.success(res, updatedItem);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const existingProduct = await this.model.findById(req.params.id);
      if (!existingProduct) return ResponseHandler.notFound(res);

      // Sauvegarder les IDs pour la mise à jour des compteurs après suppression
      const brandId = existingProduct.brand_id;
      const supplierId = existingProduct.supplier_id;

      // Supprimer le produit
      await this.model.delete(req.params.id);

      // Mettre à jour les compteurs après suppression
      if (brandId) {
        await Brand.updateProductCount(brandId);
      }

      if (supplierId) {
        await Supplier.updateProductCount(supplierId);
      }

      // Émettre l'événement de suppression
      this.eventService.deleted(req.params.id);

      return ResponseHandler.success(res, {
        message: 'Produit supprimé avec succès',
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // Nouvelle méthode pour recalculer tous les compteurs
  async recalculateAllCounts(req, res) {
    try {
      await Brand.recalculateAllProductCounts();
      await Supplier.recalculateAllProductCounts();

      return ResponseHandler.success(res, {
        message: 'Tous les compteurs de produits ont été recalculés',
      });
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
  updateCategoryRefs: updateCategoryRefs,
  recalculateAllCounts: productController.recalculateAllCounts.bind(productController),
};
