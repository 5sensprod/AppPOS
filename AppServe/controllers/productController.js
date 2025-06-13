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
const Sale = require('../models/Sale');

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

  async searchByBarcode(req, res) {
    try {
      const { code } = req.params;

      if (!code) {
        return ResponseHandler.badRequest(res, 'Code-barres requis');
      }

      // Rechercher par code-barres dans meta_data
      const products = await this.model.find({
        meta_data: {
          $elemMatch: {
            key: 'barcode',
            value: code,
          },
        },
      });

      if (products.length === 0) {
        return ResponseHandler.notFound(res, `Aucun produit trouvé avec le code-barres: ${code}`);
      }

      // Retourner le premier produit trouvé avec ses infos complètes
      const productWithCategory = await this.model.findByIdWithCategoryInfo(products[0]._id);
      return ResponseHandler.success(res, productWithCategory);
    } catch (error) {
      console.error('Erreur recherche code-barres:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async searchBySku(req, res) {
    try {
      const { sku } = req.params;
      const { partial = 'false' } = req.query;

      if (!sku) {
        return ResponseHandler.badRequest(res, 'SKU requis');
      }

      let searchQuery;

      if (partial === 'true') {
        // ✅ CORRECTION NEDB: Utiliser un objet RegExp JavaScript
        const regex = new RegExp(sku.trim(), 'i'); // 'i' = insensible à la casse
        searchQuery = {
          sku: regex,
        };
      } else {
        // Recherche exacte
        searchQuery = {
          sku: sku.trim(),
        };
      }

      const products = await this.model.find(searchQuery);

      if (products.length === 0) {
        return ResponseHandler.notFound(res, `Aucun produit trouvé avec le SKU: ${sku}`);
      }

      // Retourner le premier produit trouvé
      const productWithCategory = await this.model.findByIdWithCategoryInfo(products[0]._id);
      return ResponseHandler.success(res, productWithCategory);
    } catch (error) {
      console.error('Erreur recherche SKU:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async searchBySku(req, res) {
    try {
      const { sku } = req.params;
      const { partial = 'false' } = req.query;

      if (!sku) {
        return ResponseHandler.badRequest(res, 'SKU requis');
      }

      let searchQuery;

      if (partial === 'true') {
        // ✅ CORRECTION NEDB: Utiliser un objet RegExp JavaScript
        const regex = new RegExp(sku.trim(), 'i'); // 'i' = insensible à la casse
        searchQuery = {
          sku: regex,
        };
      } else {
        // Recherche exacte
        searchQuery = {
          sku: sku.trim(),
        };
      }

      const products = await this.model.find(searchQuery);

      if (products.length === 0) {
        return ResponseHandler.notFound(res, `Aucun produit trouvé avec le SKU: ${sku}`);
      }

      // Retourner le premier produit trouvé
      const productWithCategory = await this.model.findByIdWithCategoryInfo(products[0]._id);
      return ResponseHandler.success(res, productWithCategory);
    } catch (error) {
      console.error('Erreur recherche SKU:', error);
      return ResponseHandler.error(res, error);
    }
  }

  // Et aussi corrige searchByCode :

  async searchByCode(req, res) {
    try {
      const { code } = req.params;
      const { type = 'auto' } = req.query;

      if (!code) {
        return ResponseHandler.badRequest(res, 'Code requis');
      }

      let products = [];
      let searchType = type;

      // Créer la regex pour NeDB
      const regex = new RegExp(code.trim(), 'i');

      // Si type = auto, essayer d'abord SKU puis barcode
      if (type === 'auto') {
        // Essayer d'abord par SKU avec regex NeDB
        products = await this.model.find({ sku: regex });
        searchType = 'sku';

        // Si pas trouvé par SKU, essayer par code-barres
        if (products.length === 0) {
          products = await this.model.find({
            meta_data: {
              $elemMatch: {
                key: 'barcode',
                value: regex,
              },
            },
          });
          searchType = 'barcode';
        }
      } else if (type === 'sku') {
        products = await this.model.find({ sku: regex });
      } else if (type === 'barcode') {
        products = await this.model.find({
          meta_data: {
            $elemMatch: {
              key: 'barcode',
              value: regex,
            },
          },
        });
      }

      if (products.length === 0) {
        return ResponseHandler.notFound(res, `Aucun produit trouvé avec le code: ${code}`);
      }

      // Retourner le premier produit trouvé avec ses infos complètes
      const productWithCategory = await this.model.findByIdWithCategoryInfo(products[0]._id);

      return ResponseHandler.success(res, {
        ...productWithCategory,
        search_info: {
          searched_code: code,
          found_by: searchType,
          total_found: products.length,
        },
      });
    } catch (error) {
      console.error('Erreur recherche code:', error);
      return ResponseHandler.error(res, error);
    }
  }
  async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { stock, reason = 'manual_adjustment' } = req.body;

      if (stock === undefined || stock === null) {
        return ResponseHandler.badRequest(res, 'Nouvelle quantité de stock requise');
      }

      if (stock < 0) {
        return ResponseHandler.badRequest(res, 'Le stock ne peut pas être négatif');
      }

      const existing = await this.getByIdOr404(id, res);
      if (!existing) return;

      await this.model.update(id, {
        stock: parseInt(stock),
        updated_at: new Date(),
      });

      const updated = await this.model.findById(id);

      // Log de l'ajustement
      console.log(`Stock ajusté pour ${updated.name}: ${existing.stock} → ${stock} (${reason})`);

      return ResponseHandler.success(res, {
        product: updated,
        message: `Stock mis à jour: ${existing.stock} → ${stock}`,
        previous_stock: existing.stock,
        new_stock: stock,
        reason,
      });
    } catch (error) {
      console.error('Erreur mise à jour stock:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async getBestSellers(req, res) {
    try {
      const { limit = 10 } = req.query;

      const products = await this.model.findAll();

      const bestSellers = products
        .filter((p) => (p.total_sold || 0) > 0)
        .sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0))
        .slice(0, parseInt(limit))
        .map((p) => ({
          _id: p._id,
          name: p.name,
          sku: p.sku,
          total_sold: p.total_sold || 0,
          sales_count: p.sales_count || 0,
          revenue_total: p.revenue_total || 0,
          last_sold_at: p.last_sold_at,
        }));

      return ResponseHandler.success(res, {
        best_sellers: bestSellers,
        count: bestSellers.length,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // Statistiques d'un produit
  async getProductStats(req, res) {
    try {
      const product = await this.getByIdOr404(req.params.id, res);
      if (!product) return;

      const stats = {
        product_id: product._id,
        product_name: product.name,
        sku: product.sku,

        // Statistiques brutes (avec arrondis)
        total_sold: product.total_sold || 0,
        sales_count: product.sales_count || 0,
        last_sold_at: product.last_sold_at,
        revenue_total: Math.round((product.revenue_total || 0) * 100) / 100, // 🆕 ARRONDI

        // Stock actuel
        current_stock: product.stock || 0,

        // Calculs simples (avec arrondis)
        avg_quantity_per_sale:
          product.sales_count > 0
            ? Math.round(((product.total_sold || 0) / product.sales_count) * 100) / 100
            : 0,
        avg_revenue_per_sale:
          product.sales_count > 0
            ? Math.round(((product.revenue_total || 0) / product.sales_count) * 100) / 100
            : 0,
      };

      return ResponseHandler.success(res, stats);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // Recalcul des stats depuis les ventes existantes
  async recalculateProductStats(req, res) {
    try {
      const products = await this.model.findAll();
      const sales = await Sale.findAll();

      let updated = 0;

      for (const product of products) {
        let totalSold = 0;
        let salesCount = 0;
        let revenueTotal = 0;
        let lastSoldAt = null;

        // Parcourir toutes les ventes pour ce produit
        for (const sale of sales) {
          const productItems = sale.items.filter((item) => item.product_id === product._id);

          if (productItems.length > 0) {
            salesCount++;

            for (const item of productItems) {
              totalSold += item.quantity;
              revenueTotal += item.total_price;
            }

            if (!lastSoldAt || new Date(sale.created_at) > new Date(lastSoldAt)) {
              lastSoldAt = sale.created_at;
            }
          }
        }

        // Mettre à jour le produit
        await this.model.update(product._id, {
          total_sold: totalSold,
          sales_count: salesCount,
          last_sold_at: lastSoldAt,
          revenue_total: Math.round(revenueTotal * 100) / 100,
        });

        updated++;
      }

      return ResponseHandler.success(res, {
        message: `Statistiques recalculées pour ${updated} produits`,
        products_updated: updated,
        sales_analyzed: sales.length,
      });
    } catch (error) {
      console.error('Erreur recalcul stats:', error);
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
  'searchByBarcode',
  'searchBySku',
  'searchByCode',
  'updateStock',
  'getBestSellers',
  'getProductStats',
  'recalculateProductStats',
]);
