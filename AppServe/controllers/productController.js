// controllers/productController.js
const BaseController = require('./base/BaseController');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const productWooCommerceService = require('../services/ProductWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');
const { getEntityEventService } = require('../services/events/entityEvents');

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

  async getAll(req, res) {
    try {
      const products = await this.model.findAll();
      const productsWithCategoryInfo = await Promise.all(
        products.map((product) => this.model.findByIdWithCategoryInfo(product._id))
      );
      return ResponseHandler.success(res, productsWithCategoryInfo);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getById(req, res) {
    try {
      const product = await this.model.findByIdWithCategoryInfo(req.params.id);
      if (!product) return ResponseHandler.notFound(res);
      return ResponseHandler.success(res, product);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async create(req, res) {
    try {
      const categories = req.body.categories || [];

      if (categories.length > 0) {
        await this.validateCategories(categories);
      }

      // Créer le produit de base
      const newProduct = await this.model.create({
        ...req.body,
        categories: categories,
      });

      // Récupérer avec informations complètes
      const productWithCategoryInfo = await this.model.findByIdWithCategoryInfo(newProduct._id);

      // Mise à jour des compteurs pour marque et fournisseur
      if (req.body.brand_id) {
        await Brand.updateProductCount(req.body.brand_id);
      }

      if (req.body.supplier_id) {
        await Supplier.updateProductCount(req.body.supplier_id);
      }

      // Notifier du changement si des catégories sont impliquées
      if (categories.length > 0) {
        console.log('[WS-DEBUG] Création produit avec catégorie, category_tree_changed');
        const categoryEventService = getEntityEventService('categories');
        categoryEventService.categoryTreeChanged();
      }

      // Émettre l'événement de création
      this.eventService.created(productWithCategoryInfo);

      // Synchronisation WooCommerce si nécessaire
      if (this.shouldSync() && this.wooCommerceService) {
        try {
          const syncResult = await this.wooCommerceService.syncToWooCommerce([
            productWithCategoryInfo,
          ]);
          if (syncResult.errors.length > 0) {
            return ResponseHandler.partialSuccess(res, productWithCategoryInfo, {
              message: syncResult.errors.join(', '),
            });
          }
        } catch (syncError) {
          return ResponseHandler.partialSuccess(res, productWithCategoryInfo, syncError);
        }
      }

      return ResponseHandler.created(res, productWithCategoryInfo);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const existingProduct = await this.model.findById(req.params.id);
      if (!existingProduct) return ResponseHandler.notFound(res);

      // Sauvegarder les anciennes valeurs
      const oldBrandId = existingProduct.brand_id;
      const oldSupplierId = existingProduct.supplier_id;
      const oldCategories = existingProduct.categories || [];

      // Traiter les catégories
      let categoryChanged = false;
      let categories = oldCategories;

      if ('categories' in req.body) {
        categories = req.body.categories || [];
        if (categories.length > 0) {
          await this.validateCategories(categories);
        }

        if (JSON.stringify(oldCategories.sort()) !== JSON.stringify(categories.sort())) {
          categoryChanged = true;
        }
      }

      // Ajouter pending_sync si le produit existe sur WooCommerce
      const updateData = { ...req.body };
      if (existingProduct.woo_id) {
        updateData.pending_sync = true;
      }

      // Utiliser la nouvelle méthode pour mise à jour
      const updatedProduct = await this.model.updateWithCategoryInfo(req.params.id, {
        ...updateData,
        categories: categories,
      });

      // Gérer mise à jour compteurs marque/fournisseur
      if ('brand_id' in updateData && updateData.brand_id !== oldBrandId) {
        console.log(
          `Marque changée de ${oldBrandId} à ${updateData.brand_id}, mise à jour des compteurs`
        );
        if (oldBrandId) {
          await Brand.updateProductCount(oldBrandId);
        }
        if (updateData.brand_id) {
          await Brand.updateProductCount(updateData.brand_id);
        }
      }

      if ('supplier_id' in updateData && updateData.supplier_id !== oldSupplierId) {
        console.log(
          `Fournisseur changé de ${oldSupplierId} à ${updateData.supplier_id}, mise à jour des compteurs`
        );
        if (oldSupplierId) {
          await Supplier.updateProductCount(oldSupplierId);
        }
        if (updateData.supplier_id) {
          await Supplier.updateProductCount(updateData.supplier_id);
        }
      }

      // Notifier du changement si des catégories ont changé
      if (categoryChanged) {
        console.log(
          "[WS-DEBUG] La catégorie d'un produit a changé, envoi de category_tree_changed"
        );
        const categoryEventService = getEntityEventService('categories');
        categoryEventService.categoryTreeChanged();
      }

      // Émettre l'événement de mise à jour
      this.eventService.updated(req.params.id, updatedProduct);

      // Synchronisation WooCommerce si nécessaire
      if (this.shouldSync() && this.wooCommerceService) {
        try {
          await this.wooCommerceService.syncToWooCommerce([updatedProduct]);
          await this.model.update(req.params.id, { pending_sync: false });
        } catch (syncError) {
          return ResponseHandler.partialSuccess(res, updatedProduct, syncError);
        }
      }

      return ResponseHandler.success(res, updatedProduct);
    } catch (error) {
      console.error('Erreur mise à jour produit:', error);
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

      // Supprimer sur WooCommerce si le produit est synchronisé
      if (existingProduct.woo_id) {
        try {
          // Suppression des images
          if (existingProduct.image?.wp_id) {
            await this.wooCommerceService.client.deleteMedia(existingProduct.image.wp_id);
          }
          if (existingProduct.gallery_images?.length) {
            for (const image of existingProduct.gallery_images) {
              if (image.wp_id) {
                await this.wooCommerceService.client.deleteMedia(image.wp_id);
              }
            }
          }
          // Suppression du produit
          await this.wooCommerceService.client.delete(`products/${existingProduct.woo_id}`, {
            force: true,
          });
          console.log(`Produit ${existingProduct._id} supprimé de WooCommerce`);
        } catch (error) {
          console.error(`Erreur lors de la suppression sur WooCommerce:`, error);
          // On continue malgré l'erreur pour supprimer en local
        }
      }

      // Supprimer les images associées
      await this.handleImageDeletion(existingProduct);

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
  recalculateAllCounts: productController.recalculateAllCounts.bind(productController),
};
