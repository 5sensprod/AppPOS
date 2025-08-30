// ===== controllers/product/productController.js =====
const BaseController = require('../base/BaseController');
const Product = require('../../models/Product');
const productWooCommerceService = require('../../services/ProductWooCommerceService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const { getEntityEventService } = require('../../services/events/entityEvents');
const { createProduct, updateProduct, deleteProduct } = require('../../services/productService');
const exportController = require('../../utils/exportController');

class ProductController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      image: { type: 'gallery' },
      deleteFromWoo: (id) => productWooCommerceService.deleteProduct(id),
    });
    this.eventService = getEntityEventService(this.entityName);
  }

  async getAll(req, res) {
    try {
      const products = await this.model.findAll();
      const withCategoryInfo = await Promise.all(
        products.map((product) => this.model.findByIdWithCategoryInfo(product._id))
      );
      return ResponseHandler.success(res, withCategoryInfo);
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
      const product = await createProduct(req.body);
      const syncResult = await this.syncIfNeeded([product], res);
      if (syncResult) return syncResult;
      return ResponseHandler.created(res, product);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const existing = await this.getByIdOr404(req.params.id, res);
      if (!existing) return;

      const updated = await updateProduct(req.params.id, req.body);
      const syncResult = await this.syncIfNeeded([updated], res);
      if (syncResult) return syncResult;

      return ResponseHandler.success(res, updated);
    } catch (error) {
      console.error('Erreur mise à jour produit:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const existing = await this.getByIdOr404(req.params.id, res);
      if (!existing) return;

      await this.handleImageDeletion(existing);
      await this.handleWooCommerceDelete(existing);
      const result = await deleteProduct(existing);

      return ResponseHandler.success(res, result);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async filter(req, res) {
    try {
      const query = {};

      // 🔍 Filtre pour produits avec au moins une image
      if (req.query.has_image === 'true') {
        query.$or = [
          { 'image.src': { $exists: true, $ne: '', $ne: null } },
          { 'gallery_images.0.src': { $exists: true, $ne: '', $ne: null } },
        ];
      }

      // ➕ Tu peux ajouter d'autres filtres ici (brand_id, price, etc.)

      const products = await this.model.find(query);
      return ResponseHandler.success(res, products);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async duplicate(req, res) {
    try {
      const originalId = req.params.id;

      // Récupérer le produit original avec ses informations de catégorie
      const originalProduct = await this.model.findByIdWithCategoryInfo(originalId);

      if (!originalProduct) {
        return ResponseHandler.notFound(res, 'Produit à dupliquer non trouvé');
      }

      // Créer une copie en excluant _id et woo_id
      const {
        _id,
        woo_id,
        last_sync,
        pending_sync,
        category_info, // On exclut category_info car il sera regénéré
        ...productData
      } = originalProduct;

      // Modifier certains champs pour la duplication
      const duplicatedData = {
        ...productData,
        // Ajouter un suffixe au nom/designation pour différencier
        name: productData.name ? `${productData.name} (Copie)` : 'Produit copié',
        designation: productData.designation
          ? `${productData.designation} (Copie)`
          : 'Produit copié',

        // Modifier le SKU pour éviter les doublons
        sku: productData.sku ? `${productData.sku}_COPY_${Date.now()}` : `COPY_${Date.now()}`,

        // Réinitialiser les statistiques de vente
        total_sold: 0,
        sales_count: 0,
        last_sold_at: null,
        revenue_total: 0,

        // Réinitialiser les données WooCommerce
        woo_id: null,
        last_sync: null,
        pending_sync: false,
        website_url: null,

        // Copier les images mais sans les IDs uniques
        image: productData.image
          ? {
              ...productData.image,
              _id: undefined, // Laissera le système générer un nouvel ID
            }
          : null,

        gallery_images: productData.gallery_images
          ? productData.gallery_images.map((img) => ({
              ...img,
              _id: undefined, // Laissera le système générer de nouveaux IDs
            }))
          : [],

        // Ajouter la date de soumission actuelle
        dateSoumission: new Date().toISOString(),
      };

      // Créer le nouveau produit
      const duplicatedProduct = await this.model.create(duplicatedData);

      // Récupérer le produit créé avec ses informations de catégorie
      const result = await this.model.findByIdWithCategoryInfo(duplicatedProduct._id);

      // CORRECTION : Émettre l'événement seulement si eventService est disponible
      if (this.eventService && typeof this.eventService.emit === 'function') {
        this.eventService.emit('created', {
          id: result._id,
          data: result,
        });
      } else {
        console.log('EventService non disponible pour la duplication, continuons sans événement');
      }

      return ResponseHandler.created(res, {
        message: 'Produit dupliqué avec succès',
        original: {
          _id: originalId,
          name: originalProduct.name,
          sku: originalProduct.sku,
        },
        duplicated: result,
      });
    } catch (error) {
      console.error('Erreur lors de la duplication du produit:', error);
      return ResponseHandler.error(res, error);
    }
  }
}

const productController = new ProductController();

module.exports = exportController(productController, [
  'getAll',
  'getById',
  'create',
  'update',
  'delete',
  'filter',
  'duplicate',
]);
