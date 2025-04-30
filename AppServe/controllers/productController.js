//AppServe\controllers\productController.js
const BaseController = require('./base/BaseController');
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const productWooCommerceService = require('../services/ProductWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');
const { getEntityEventService } = require('../services/events/entityEvents');
const { createProduct, updateProduct, deleteProduct } = require('../services/productService');
const Category = require('../models/Category');
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

  async batchUpdateStatus(req, res) {
    try {
      const { productIds, status } = req.body;

      // Validation
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return ResponseHandler.badRequest(
          res,
          'IDs de produits requis et doivent être un tableau non vide'
        );
      }

      if (!status || !['published', 'draft', 'archived'].includes(status)) {
        return ResponseHandler.badRequest(
          res,
          'Statut invalide. Les valeurs autorisées sont: published, draft, archived'
        );
      }

      const updatedProducts = [];
      const errors = [];

      // Traiter chaque produit
      for (const productId of productIds) {
        try {
          // Chercher le produit
          const product = await this.model.findById(productId);

          if (!product) {
            errors.push({
              productId,
              message: 'Produit non trouvé',
            });
            continue;
          }

          // Mettre à jour le statut
          const updatedData = {
            ...product,
            status: status,
            // Si le produit est déjà synchronisé avec WooCommerce, marquer comme en attente de synchro
            pending_sync: product.woo_id ? true : product.pending_sync,
          };

          // Utiliser la méthode update existante
          await this.model.update(productId, updatedData);

          // Déclencher un événement de mise à jour si nécessaire
          if (this.eventService) {
            this.eventService.emit('updated', {
              id: productId,
              data: updatedData,
              original: product,
            });
          }

          updatedProducts.push(productId);
        } catch (error) {
          console.error(`Erreur lors de la mise à jour du produit ${productId}:`, error);
          errors.push({
            productId,
            message: error.message || 'Erreur de mise à jour',
          });
        }
      }

      // Préparer la réponse
      const result = {
        success: updatedProducts.length > 0,
        message: `${updatedProducts.length} produits mis à jour avec succès${errors.length > 0 ? `, ${errors.length} erreurs` : ''}`,
        updatedProducts,
      };

      // Ajouter les erreurs à la réponse si nécessaire
      if (errors.length > 0) {
        result.errors = errors;
      }

      return ResponseHandler.success(res, result);
    } catch (error) {
      console.error('Erreur lors de la mise à jour par lot des statuts:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async batchUpdateCategory(req, res) {
    try {
      const { productIds, categoryId } = req.body;

      // Validation
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return ResponseHandler.badRequest(
          res,
          'IDs de produits requis et doivent être un tableau non vide'
        );
      }

      if (!categoryId) {
        return ResponseHandler.badRequest(res, 'ID de catégorie requis');
      }

      // Vérifier si la catégorie existe
      const category = await Category.findById(categoryId);
      if (!category) {
        return ResponseHandler.notFound(res, 'Catégorie non trouvée');
      }

      const updatedProducts = [];
      const errors = [];

      // Traiter chaque produit
      for (const productId of productIds) {
        try {
          // Chercher le produit
          const product = await this.model.findById(productId);

          if (!product) {
            errors.push({
              productId,
              message: 'Produit non trouvé',
            });
            continue;
          }

          // Préparer les catégories
          // Nous conservons d'éventuelles catégories secondaires
          const currentCategories = product.categories || [];

          // Nouvelle liste de catégories avec la nouvelle catégorie principale en premier
          let newCategories = [categoryId];

          // Ajouter les autres catégories existantes qui ne sont pas la nouvelle catégorie
          for (const catId of currentCategories) {
            if (catId !== categoryId) {
              newCategories.push(catId);
            }
          }

          // Mettre à jour le produit
          const updatedData = {
            ...product,
            categories: newCategories,
            category_id: categoryId, // Définir comme catégorie principale
            // Si le produit est déjà synchronisé avec WooCommerce, marquer comme en attente de synchro
            pending_sync: product.woo_id ? true : product.pending_sync,
          };

          // Utiliser la méthode update existante
          await this.model.update(productId, updatedData);

          // Déclencher un événement de mise à jour si nécessaire
          if (this.eventService) {
            this.eventService.emit('updated', {
              id: productId,
              data: updatedData,
              original: product,
            });
          }

          updatedProducts.push(productId);
        } catch (error) {
          console.error(
            `Erreur lors de la mise à jour de la catégorie du produit ${productId}:`,
            error
          );
          errors.push({
            productId,
            message: error.message || 'Erreur de mise à jour',
          });
        }
      }

      // Préparer la réponse
      const result = {
        success: updatedProducts.length > 0,
        message: `${updatedProducts.length} produits mis à jour avec succès${errors.length > 0 ? `, ${errors.length} erreurs` : ''}`,
        updatedProducts,
      };

      // Ajouter les erreurs à la réponse si nécessaire
      if (errors.length > 0) {
        result.errors = errors;
      }

      return ResponseHandler.success(res, result);
    } catch (error) {
      console.error('Erreur lors de la mise à jour par lot des catégories:', error);
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
  // Version corrigée prenant en compte les deux formats différents
  async repairProductImages(req, res) {
    try {
      const productId = req.params.id;
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');

      // 1. Récupérer le produit
      const product = await this.model.findById(productId);
      if (!product) {
        return ResponseHandler.notFound(res, 'Produit non trouvé');
      }

      // 2. Vérifier si le répertoire d'images existe
      const uploadDir = path.join(__dirname, '../public/products', productId);
      if (!fs.existsSync(uploadDir)) {
        return ResponseHandler.badRequest(res, `Répertoire d'images non trouvé: ${uploadDir}`);
      }

      // 3. Lire les images du répertoire
      const files = fs.readdirSync(uploadDir);
      const imageFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });

      if (imageFiles.length === 0) {
        return ResponseHandler.success(res, {
          message: 'Aucune image trouvée dans le répertoire du produit',
          productId,
        });
      }

      // 4. Créer les métadonnées pour chaque image
      const galleryImages = [];

      for (const file of imageFiles) {
        const filePath = path.join(uploadDir, file);
        const fileStats = fs.statSync(filePath);
        const imageId = crypto.randomBytes(12).toString('hex');

        // Format utilisé pour gallery_images (format 1)
        const galleryImageMetadata = {
          _id: imageId,
          src: `/public/products/${productId}/${file}`,
          local_path: filePath,
          status: 'active',
          type: path.extname(file).substring(1),
          metadata: {
            original_name: file,
            size: fileStats.size,
            mimetype: `image/${path.extname(file).substring(1)}`,
          },
        };

        galleryImages.push(galleryImageMetadata);
      }

      // 5. Utiliser la première image pour l'image principale avec le format approprié
      let mainImage = null;
      if (galleryImages.length > 0) {
        const firstImage = galleryImages[0];

        // Format utilisé pour l'image principale (format 2)
        mainImage = {
          _id: firstImage._id,
          name: firstImage.metadata.original_name,
          src: firstImage.src, // Utiliser le même chemin que la galerie
          alt: `${product.name || 'Produit'} - ${firstImage.metadata.original_name}`,
          size: firstImage.metadata.size,
          type: firstImage.type,
          uploaded_at: new Date().toISOString(),
        };
      }

      // 6. Mettre à jour le produit avec les nouvelles images
      const updateData = {
        gallery_images: galleryImages,
      };

      if (mainImage) {
        updateData.image = mainImage;
      }

      // 7. Mettre à jour le produit dans la base de données
      await this.model.update(productId, updateData);

      // 8. Marquer le produit pour synchronisation si nécessaire
      if (product.woo_id) {
        await this.model.update(productId, { pending_sync: true });
      }

      // 9. Récupérer le produit mis à jour
      const updatedProduct = await this.model.findById(productId);

      return ResponseHandler.success(res, {
        message: `${galleryImages.length} images restaurées avec succès`,
        productId,
        images: galleryImages,
        mainImage: mainImage,
        product: updatedProduct,
      });
    } catch (error) {
      console.error('Erreur lors de la réparation des images:', error);
      return ResponseHandler.error(res, error);
    }
  }
}

const productController = new ProductController();

const exportController = require('../utils/exportController');

module.exports = exportController(productController, [
  'getAll',
  'getById',
  'create',
  'update',
  'delete',
  'batchUpdateStatus',
  'batchUpdateCategory',
  'uploadImage',
  'updateImageMetadata',
  'deleteImage',
  'setMainImage',
  'recalculateAllCounts',
  'filter',
  'repairProductImages',
]);
