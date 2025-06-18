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

  async searchByCode(req, res) {
    try {
      const { code } = req.params;
      const { type = 'auto', limit = 5 } = req.query; // Ajouter limite de résultats

      if (!code) {
        return ResponseHandler.badRequest(res, 'Code requis');
      }

      let products = [];
      let searchType = type;

      // Créer la regex pour NeDB
      const regex = new RegExp(code.trim(), 'i');

      // Si type = auto, essayer dans cet ordre : SKU, designation, puis barcode
      if (type === 'auto') {
        // 1. Essayer d'abord par SKU
        products = await this.model.find({ sku: regex });
        if (products.length > 0) {
          searchType = 'sku';
        } else {
          // 2. Puis par designation
          products = await this.model.find({ designation: regex });
          if (products.length > 0) {
            searchType = 'designation';
          } else {
            // 3. Enfin par code-barres
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
        }
      } else if (type === 'sku') {
        products = await this.model.find({ sku: regex });
      } else if (type === 'designation') {
        products = await this.model.find({ designation: regex });
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

      // Limiter le nombre de résultats
      const limitedProducts = products.slice(0, parseInt(limit));

      // ✅ NOUVEAU : Si plusieurs résultats, les retourner tous
      if (limitedProducts.length > 1) {
        // Retourner tous les produits avec leurs infos complètes
        const productsWithCategory = await Promise.all(
          limitedProducts.map((product) => this.model.findByIdWithCategoryInfo(product._id))
        );

        return ResponseHandler.success(res, {
          multiple: true,
          total_found: products.length,
          results: productsWithCategory.map((product) => ({
            ...product,
            search_info: {
              searched_code: code,
              found_by: searchType,
              total_found: products.length,
            },
          })),
        });
      }

      // ✅ Si un seul résultat, format actuel (pour code-barres exact)
      const productWithCategory = await this.model.findByIdWithCategoryInfo(limitedProducts[0]._id);

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

  async searchByDesignation(req, res) {
    try {
      const { designation } = req.params;
      const { partial = 'true' } = req.query; // Par défaut partielle pour designation

      if (!designation) {
        return ResponseHandler.badRequest(res, 'Designation requise');
      }

      let searchQuery;
      if (partial === 'true') {
        const regex = new RegExp(designation.trim(), 'i');
        searchQuery = { designation: regex };
      } else {
        searchQuery = { designation: designation.trim() };
      }

      const products = await this.model.find(searchQuery);

      if (products.length === 0) {
        return ResponseHandler.notFound(
          res,
          `Aucun produit trouvé avec la designation: ${designation}`
        );
      }

      const productWithCategory = await this.model.findByIdWithCategoryInfo(products[0]._id);
      return ResponseHandler.success(res, productWithCategory);
    } catch (error) {
      console.error('Erreur recherche designation:', error);
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

  // Statistique Stock
  async getStockStatistics(req, res) {
    try {
      const allProducts = await this.model.findAll();

      // Filtrer: produits simples uniquement
      const simpleProducts = allProducts.filter((p) => p.type === 'simple');

      // Filtrer: stock > 0
      const productsInStock = simpleProducts.filter((p) => (p.stock || 0) > 0);

      if (productsInStock.length === 0) {
        return ResponseHandler.success(res, {
          summary: {
            total_products: allProducts.length,
            simple_products: simpleProducts.length,
            products_in_stock: 0,
            excluded_products: simpleProducts.length,
          },
          financial: {
            inventory_value: 0,
            retail_value: 0,
            potential_margin: 0,
            tax_amount: 0,
            tax_breakdown: {},
          },
        });
      }

      // Calculs financiers avec détail par taux de TVA
      let inventoryValue = 0;
      let retailValue = 0;
      let totalTaxAmount = 0;
      const taxBreakdown = {}; // Détail par taux de TVA

      for (const product of productsInStock) {
        const stock = product.stock || 0;
        const purchasePrice = product.purchase_price || 0;
        const price = product.price || 0;
        const taxRate = product.tax_rate || 0;

        const productInventoryValue = stock * purchasePrice;
        const productRetailValue = stock * price;

        inventoryValue += productInventoryValue;
        retailValue += productRetailValue;

        // Initialiser le taux s'il n'existe pas
        if (!taxBreakdown[taxRate]) {
          taxBreakdown[taxRate] = {
            rate: taxRate,
            product_count: 0,
            inventory_value: 0,
            retail_value: 0,
            tax_amount: 0,
          };
        }

        // Ajouter aux totaux pour ce taux
        taxBreakdown[taxRate].product_count++;
        taxBreakdown[taxRate].inventory_value += productInventoryValue;
        taxBreakdown[taxRate].retail_value += productRetailValue;

        // Calcul TVA: (prix_ttc × taux) / (100 + taux)
        const productTaxAmount = taxRate > 0 ? (productRetailValue * taxRate) / (100 + taxRate) : 0;

        taxBreakdown[taxRate].tax_amount += productTaxAmount;
        totalTaxAmount += productTaxAmount;
      }

      const potentialMargin = retailValue - inventoryValue;
      const marginPercentage = inventoryValue > 0 ? (potentialMargin / inventoryValue) * 100 : 0;

      // Préparer le détail des taxes avec arrondis
      const taxDetails = {};
      Object.keys(taxBreakdown).forEach((rate) => {
        const data = taxBreakdown[rate];
        taxDetails[`rate_${rate}`] = {
          rate: parseFloat(rate),
          product_count: data.product_count,
          inventory_value: Math.round(data.inventory_value * 100) / 100,
          retail_value: Math.round(data.retail_value * 100) / 100,
          tax_amount: Math.round(data.tax_amount * 100) / 100,
        };
      });

      const statistics = {
        summary: {
          total_products: allProducts.length,
          simple_products: simpleProducts.length,
          products_in_stock: productsInStock.length,
          excluded_products: simpleProducts.length - productsInStock.length,
        },
        financial: {
          inventory_value: Math.round(inventoryValue * 100) / 100,
          retail_value: Math.round(retailValue * 100) / 100,
          potential_margin: Math.round(potentialMargin * 100) / 100,
          margin_percentage: Math.round(marginPercentage * 100) / 100,
          tax_amount: Math.round(totalTaxAmount * 100) / 100,
          tax_breakdown: taxDetails,
        },
        performance: {
          avg_inventory_per_product:
            productsInStock.length > 0
              ? Math.round((inventoryValue / productsInStock.length) * 100) / 100
              : 0,
          avg_retail_per_product:
            productsInStock.length > 0
              ? Math.round((retailValue / productsInStock.length) * 100) / 100
              : 0,
        },
      };

      return ResponseHandler.success(res, statistics);
    } catch (error) {
      console.error('Erreur calcul statistiques stock:', error);
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

  async exportStockStatisticsToPDF(req, res) {
    try {
      const { companyInfo = {} } = req.body;

      // Récupérer les statistiques
      const allProducts = await this.model.findAll();
      const simpleProducts = allProducts.filter((p) => p.type === 'simple');
      const productsInStock = simpleProducts.filter((p) => (p.stock || 0) > 0);

      if (productsInStock.length === 0) {
        return ResponseHandler.badRequest(res, 'Aucun produit en stock à exporter');
      }

      // Calculs (même logique que l'endpoint statistics)
      let inventoryValue = 0;
      let retailValue = 0;
      let totalTaxAmount = 0;
      const taxBreakdown = {};

      for (const product of productsInStock) {
        const stock = product.stock || 0;
        const purchasePrice = product.purchase_price || 0;
        const price = product.price || 0;
        const taxRate = product.tax_rate || 0;

        const productInventoryValue = stock * purchasePrice;
        const productRetailValue = stock * price;

        inventoryValue += productInventoryValue;
        retailValue += productRetailValue;

        if (!taxBreakdown[taxRate]) {
          taxBreakdown[taxRate] = {
            rate: taxRate,
            product_count: 0,
            inventory_value: 0,
            retail_value: 0,
            tax_amount: 0,
          };
        }

        taxBreakdown[taxRate].product_count++;
        taxBreakdown[taxRate].inventory_value += productInventoryValue;
        taxBreakdown[taxRate].retail_value += productRetailValue;

        const productTaxAmount = taxRate > 0 ? (productRetailValue * taxRate) / (100 + taxRate) : 0;

        taxBreakdown[taxRate].tax_amount += productTaxAmount;
        totalTaxAmount += productTaxAmount;
      }

      const potentialMargin = retailValue - inventoryValue;
      const marginPercentage = inventoryValue > 0 ? (potentialMargin / inventoryValue) * 100 : 0;

      const stockStats = {
        summary: {
          total_products: allProducts.length,
          simple_products: simpleProducts.length,
          products_in_stock: productsInStock.length,
          excluded_products: simpleProducts.length - productsInStock.length,
        },
        financial: {
          inventory_value: Math.round(inventoryValue * 100) / 100,
          retail_value: Math.round(retailValue * 100) / 100,
          potential_margin: Math.round(potentialMargin * 100) / 100,
          margin_percentage: Math.round(marginPercentage * 100) / 100,
          tax_amount: Math.round(totalTaxAmount * 100) / 100,
          tax_breakdown: taxBreakdown,
        },
        performance: {
          avg_inventory_per_product:
            productsInStock.length > 0
              ? Math.round((inventoryValue / productsInStock.length) * 100) / 100
              : 0,
          avg_retail_per_product:
            productsInStock.length > 0
              ? Math.round((retailValue / productsInStock.length) * 100) / 100
              : 0,
        },
      };

      // Générer le PDF
      const PDFDocument = require('pdfkit');
      const os = require('os');
      const fs = require('fs');
      const path = require('path');

      const tempDir = os.tmpdir();
      const filename = `rapport_stock_${new Date().toISOString().split('T')[0]}.pdf`;
      const tempFilePath = path.join(tempDir, filename);

      await this.generateStockStatsPDF(tempFilePath, stockStats, companyInfo);

      // Envoyer le fichier
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const fileStream = fs.createReadStream(tempFilePath);
      fileStream.pipe(res);

      fileStream.on('end', () => {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error('Erreur suppression fichier temporaire:', err);
        });
      });
    } catch (error) {
      console.error('Erreur export PDF statistiques:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async generateStockStatsPDF(filePath, stockStats, companyInfo) {
    const PDFDocument = require('pdfkit');
    const fs = require('fs');

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Helper functions
    const formatCurrency = (amount) => {
      return `${amount
        .toFixed(2)
        .replace('.', ',')
        .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`;
    };

    const formatNumber = (num) => {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    const formatPercentage = (num) => {
      return `${num.toFixed(1).replace('.', ',')} %`;
    };

    const getTaxRateLabel = (rate) => {
      if (rate === 0) return 'Exonéré (0%)';
      if (rate === 5.5) return 'Réduit (5.5%)';
      if (rate === 20) return 'Normal (20%)';
      return `${rate}%`;
    };

    // Helper pour gérer les sauts de page
    const checkPageBreak = (neededHeight = 100) => {
      if (doc.y + neededHeight > doc.page.height - 80) {
        doc.addPage();
        return true;
      }
      return false;
    };

    // Helper pour dessiner une ligne horizontale
    const drawHorizontalLine = (y = null) => {
      const currentY = y || doc.y;
      doc
        .moveTo(50, currentY)
        .lineTo(doc.page.width - 50, currentY)
        .stroke();
    };

    // Helper pour ajouter des titres alignés correctement
    const addTitle = (text, fontSize = 16) => {
      doc.x = 50; // Toujours réinitialiser X à la marge gauche
      doc
        .fontSize(fontSize)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text(text, 50, doc.y, { align: 'left' });
    };

    // === EN-TÊTE ===
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('RAPPORT DE STOCK', 50, doc.y, { align: 'left' });

    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#7f8c8d')
      .text(
        `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
        50,
        doc.y,
        { align: 'left' }
      );

    doc.moveDown(1);
    drawHorizontalLine();
    doc.moveDown(1);

    // === INFORMATIONS SOCIÉTÉ ===
    if (companyInfo.name) {
      doc.x = 50; // Réinitialiser X
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text(companyInfo.name, 50, doc.y);

      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').fillColor('#34495e');

      if (companyInfo.address) {
        doc.text(companyInfo.address, 50, doc.y);
      }
      if (companyInfo.siret) {
        doc.text(`SIRET: ${companyInfo.siret}`, 50, doc.y);
      }
      doc.moveDown(1.5);
    }

    // === RÉSUMÉ EXÉCUTIF ===
    checkPageBreak(200);

    addTitle('RÉSUMÉ EXÉCUTIF');

    doc.moveDown(0.5);

    const summaryData = [
      ['Produits en stock', formatNumber(stockStats.summary.products_in_stock)],
      ['Produits exclus (stock inférieur à 1)', formatNumber(stockStats.summary.excluded_products)],
      ['Valeur stock (achat)', formatCurrency(stockStats.financial.inventory_value)],
      ['Valeur potentielle (vente)', formatCurrency(stockStats.financial.retail_value)],
      ['Marge potentielle', formatCurrency(stockStats.financial.potential_margin)],
      ['Taux de marge', formatPercentage(stockStats.financial.margin_percentage)],
      ['TVA collectée potentielle', formatCurrency(stockStats.financial.tax_amount)],
    ];

    // Créer un tableau pour le résumé
    const startY = doc.y;
    const leftCol = 50;
    const rightCol = 300;
    const rowHeight = 20;

    doc.fontSize(11).fillColor('#34495e');

    summaryData.forEach(([label, value], index) => {
      const currentY = startY + index * rowHeight;

      // Label à gauche
      doc.font('Helvetica').text(label, leftCol, currentY, { width: 240, align: 'left' });

      // Valeur à droite
      doc.font('Helvetica-Bold').text(value, rightCol, currentY, { width: 200, align: 'right' });
    });

    doc.y = startY + summaryData.length * rowHeight + 20;

    // === RÉPARTITION PAR TVA ===
    checkPageBreak(250);

    // Utiliser la fonction helper pour garantir l'alignement
    addTitle('RÉPARTITION PAR TAUX DE TVA');

    doc.moveDown(0.8);

    // Configuration du tableau TVA
    const tableStartX = 50;
    const tableWidth = doc.page.width - 100;
    const colWidths = [90, 55, 85, 85, 85, 85];

    let currentY = doc.y;

    // Dessiner l'en-tête du tableau
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50');

    const headers = ['Taux TVA', 'Nb Prod.', 'Val. Achat', 'Val. Vente', 'TVA Collect.', 'Marge'];
    const headerAlignments = ['left', 'right', 'right', 'right', 'right', 'right'];

    // Fond gris pour l'en-tête
    doc.rect(tableStartX, currentY - 5, tableWidth, 20).fillAndStroke('#ecf0f1', '#bdc3c7');

    let currentX = tableStartX + 5;
    headers.forEach((header, i) => {
      doc.fillColor('#2c3e50').text(header, currentX, currentY, {
        width: colWidths[i] - 10,
        align: headerAlignments[i],
      });
      currentX += colWidths[i];
    });

    currentY += 25;

    // Données du tableau
    doc.fontSize(9).font('Helvetica').fillColor('#34495e');

    Object.entries(stockStats.financial.tax_breakdown).forEach(([key, data], index) => {
      const marginValue = data.retail_value - data.inventory_value;

      // Alternance de couleur pour les lignes
      if (index % 2 === 0) {
        doc.rect(tableStartX, currentY - 3, tableWidth, 18).fill('#f8f9fa');
      }

      const rowData = [
        getTaxRateLabel(data.rate),
        formatNumber(data.product_count),
        formatCurrency(data.inventory_value),
        formatCurrency(data.retail_value),
        formatCurrency(data.tax_amount),
        formatCurrency(marginValue),
      ];

      const dataAlignments = ['left', 'right', 'right', 'right', 'right', 'right'];

      currentX = tableStartX + 5;
      rowData.forEach((value, i) => {
        doc.fillColor('#34495e').text(value, currentX, currentY, {
          width: colWidths[i] - 10,
          align: dataAlignments[i],
        });
        currentX += colWidths[i];
      });

      currentY += 18;

      // Vérifier si on a besoin d'une nouvelle page
      if (currentY > doc.page.height - 150) {
        doc.addPage();
        currentY = 80;
      }
    });

    doc.y = currentY + 20;

    // === FOOTER ===
    const footerY = doc.page.height - 30;
    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('#95a5a6')
      .text('Rapport généré automatiquement par le système APPPOS', 50, footerY, {
        align: 'center',
        width: doc.page.width - 100,
      });

    // Ligne de séparation au-dessus du footer
    doc
      .moveTo(50, footerY - 10)
      .lineTo(doc.page.width - 50, footerY - 10)
      .stroke('#ecf0f1');

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
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
  'searchByDesignation',
  'updateStock',
  'getBestSellers',
  'getProductStats',
  'recalculateProductStats',
  'getStockStatistics',
  'exportStockStatisticsToPDF',
]);
