// ===== controllers/product/productController.js =====
const fs = require('fs');
const path = require('path');
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

      if (req.query.has_image === 'true') {
        query.$or = [
          { 'image.src': { $exists: true, $ne: '', $ne: null } },
          { 'gallery_images.0.src': { $exists: true, $ne: '', $ne: null } },
        ];
      }

      const products = await this.model.find(query);
      return ResponseHandler.success(res, products);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // DUPLICATION
  // Corrections apportées :
  //   1. Le produit est créé SANS images pour obtenir le newId d'abord
  //   2. Les fichiers images sont copiés PHYSIQUEMENT dans /public/products/{newId}/
  //   3. src et local_path sont remappés vers le nouveau dossier
  //   4. wp_id, woo_media_id et _id sont purgés de chaque image copiée
  // ─────────────────────────────────────────────────────────────────
  async duplicate(req, res) {
    try {
      const originalId = req.params.id;

      // 1. Récupérer le produit original
      const originalProduct = await this.model.findByIdWithCategoryInfo(originalId);
      if (!originalProduct) {
        return ResponseHandler.notFound(res, 'Produit à dupliquer non trouvé');
      }

      // Aplatir le document Mongoose si nécessaire
      const raw = originalProduct.toObject ? originalProduct.toObject() : originalProduct;

      const {
        _id,
        woo_id,
        last_sync,
        pending_sync,
        category_info,
        image: originalImage,
        gallery_images: originalGallery,
        ...productData
      } = raw;

      // 2. Créer le produit SANS images pour obtenir le newId
      const duplicatedData = {
        ...productData,
        name: productData.name ? `${productData.name} (Copie)` : 'Produit copié',
        designation: productData.designation
          ? `${productData.designation} (Copie)`
          : 'Produit copié',
        sku: productData.sku ? `${productData.sku}_COPY_${Date.now()}` : `COPY_${Date.now()}`,

        // Statistiques de vente réinitialisées
        total_sold: 0,
        sales_count: 0,
        last_sold_at: null,
        revenue_total: 0,

        // Données WooCommerce réinitialisées
        woo_id: null,
        last_sync: null,
        pending_sync: false,
        website_url: null,

        // Images volontairement vides — remplies après copie physique
        image: null,
        gallery_images: [],

        dateSoumission: new Date().toISOString(),
      };

      const duplicatedProduct = await this.model.create(duplicatedData);
      const newId = duplicatedProduct._id.toString();

      // 3. Copie physique des fichiers images et remappage des références
      const srcDir = path.join(__dirname, '../../public/products', originalId);
      const destDir = path.join(__dirname, '../../public/products', newId);

      // Purge tous les identifiants liés à l'original et repointe vers newId
      const remapImage = (img) => {
        if (!img?.src) return null;

        const filename = path.basename(img.src);
        const srcFile = path.join(srcDir, filename);
        const destFile = path.join(destDir, filename);

        // Copie physique du fichier si disponible
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, destFile);
        } else {
          console.warn(`[duplicate] Fichier source introuvable : ${srcFile}`);
        }

        // Reconstruction propre — aucun ID de l'original conservé
        const { _id, wp_id, woo_media_id, local_path, src, ...rest } = img;
        return {
          ...rest,
          src: `/public/products/${newId}/${filename}`,
          local_path: destFile,
          wp_id: null,
          woo_media_id: null,
          // _id omis → Mongoose en génère un nouveau
          status: 'active',
        };
      };

      let newImage = null;
      let newGallery = [];

      const hasImages =
        (originalImage?.src || (originalGallery && originalGallery.length > 0)) &&
        fs.existsSync(srcDir);

      if (hasImages) {
        fs.mkdirSync(destDir, { recursive: true });

        newImage = remapImage(originalImage);
        newGallery = (originalGallery || []).map(remapImage).filter(Boolean);
      }

      // 4. Mettre à jour le produit avec les nouvelles références d'images
      await this.model.update(newId, {
        image: newImage,
        gallery_images: newGallery,
      });

      // 5. Récupérer le résultat final avec les infos de catégorie
      const result = await this.model.findByIdWithCategoryInfo(newId);

      // 6. Émettre l'événement si le service est disponible
      if (this.eventService && typeof this.eventService.emit === 'function') {
        this.eventService.emit('created', {
          id: result._id,
          data: result,
        });
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

  async decrementStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      if (!quantity || typeof quantity !== 'number' || quantity < 0) {
        return ResponseHandler.badRequest(res, 'Quantité invalide');
      }

      const product = await this.model.findById(id);
      if (!product) {
        return ResponseHandler.notFound(res, 'Resource not found');
      }

      const currentStock = product.stock || 0;
      const newStock = Math.max(0, currentStock - quantity);

      await this.model.update(id, {
        stock: newStock,
        updated_at: new Date(),
      });

      const updatedProduct = await this.model.findById(id);
      console.log(`✅ [Stock] ${product.name}: ${currentStock} → ${newStock} (-${quantity})`);

      this.eventService.updated(id, updatedProduct);

      return ResponseHandler.success(res, updatedProduct);
    } catch (error) {
      console.error('❌ [decrementStock] Erreur:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async incrementStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity, destination, reason } = req.body;

      if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
        return ResponseHandler.badRequest(res, 'Quantité invalide (doit être > 0)');
      }

      const product = await this.model.findById(id);
      if (!product) {
        return ResponseHandler.notFound(res, 'Produit introuvable');
      }

      if (destination === 'sav' || destination === 'stock_b') {
        console.log(
          `📋 [Stock] ${product.name}: retour ${destination} x${quantity}` +
            (reason ? ` — "${reason}"` : '')
        );
        return ResponseHandler.success(res, {
          ...product,
          _returnDestination: destination,
          _returnQuantity: quantity,
        });
      }

      const currentStock = product.stock || 0;
      const newStock = currentStock + quantity;

      await this.model.update(id, { stock: newStock, updated_at: new Date() });

      const updatedProduct = await this.model.findById(id);
      console.log(`✅ [Stock] ${product.name}: ${currentStock} → ${newStock} (+${quantity})`);

      this.eventService.updated(id, updatedProduct);

      return ResponseHandler.success(res, updatedProduct);
    } catch (error) {
      console.error('❌ [incrementStock] Erreur:', error);
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
  'decrementStock',
  'incrementStock',
]);
