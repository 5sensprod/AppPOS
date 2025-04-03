// controllers/productController.js
const BaseController = require('./base/BaseController');
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const productWooCommerceService = require('../services/ProductWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');
const { getEntityEventService } = require('../services/events/entityEvents');
const {
  validateCategories,
  updateBrandAndSupplierCount,
  categoriesChanged,
  notifyCategoryTreeChangedIfNeeded,
} = require('../services/productService');

class ProductController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      entity: 'products',
      type: 'gallery',
    });
    this.eventService = getEntityEventService(this.entityName);
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
      if (categories.length > 0) await validateCategories(categories);

      const newItem = await this.model.create({ ...req.body, categories });

      if (req.body.brand_id) await Brand.updateProductCount(req.body.brand_id);
      if (req.body.supplier_id) await Supplier.updateProductCount(req.body.supplier_id);

      notifyCategoryTreeChangedIfNeeded(categories.length > 0);
      this.eventService.created(newItem);

      const productWithCategoryInfo = await this.model.findByIdWithCategoryInfo(newItem._id);
      const syncResult = await this.syncIfNeeded([productWithCategoryInfo], res);
      if (syncResult) return syncResult;

      return ResponseHandler.created(res, productWithCategoryInfo);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const existingProduct = await this.getByIdOr404(req.params.id, res);
      if (!existingProduct) return;

      const oldBrandId = existingProduct.brand_id;
      const oldSupplierId = existingProduct.supplier_id;
      const oldCategories = existingProduct.categories || [];

      let categories = oldCategories;
      let categoryChanged = false;

      if ('categories' in req.body) {
        categories = req.body.categories || [];
        if (categories.length > 0) await validateCategories(categories);
        categoryChanged = categoriesChanged(oldCategories, categories);
      }

      const updateData = { ...req.body, categories };
      if (existingProduct.woo_id) updateData.pending_sync = true;

      const updatedProduct = await this.model.updateWithCategoryInfo(req.params.id, updateData);

      await updateBrandAndSupplierCount(
        oldBrandId,
        updateData.brand_id,
        oldSupplierId,
        updateData.supplier_id
      );

      notifyCategoryTreeChangedIfNeeded(categoryChanged);
      this.eventService.updated(req.params.id, updatedProduct);

      const syncResult = await this.syncIfNeeded([updatedProduct], res);
      if (syncResult) return syncResult;

      return ResponseHandler.success(res, updatedProduct);
    } catch (error) {
      console.error('Erreur mise à jour produit:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const existingProduct = await this.getByIdOr404(req.params.id, res);
      if (!existingProduct) return;

      const brandId = existingProduct.brand_id;
      const supplierId = existingProduct.supplier_id;

      if (existingProduct.woo_id) {
        try {
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

          await this.wooCommerceService.client.delete(`products/${existingProduct.woo_id}`, {
            force: true,
          });
        } catch (error) {
          console.error(`Erreur lors de la suppression sur WooCommerce:`, error);
        }
      }

      await this.handleImageDeletion(existingProduct);
      await this.model.delete(req.params.id);

      if (brandId) await Brand.updateProductCount(brandId);
      if (supplierId) await Supplier.updateProductCount(supplierId);

      this.eventService.deleted(req.params.id);

      return ResponseHandler.success(res, {
        message: 'Produit supprimé avec succès',
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

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
