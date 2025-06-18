// ===== controllers/product/productImageController.js =====
const BaseController = require('../base/BaseController');
const Product = require('../../models/Product');
const productWooCommerceService = require('../../services/ProductWooCommerceService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const exportController = require('../../utils/exportController');

class ProductImageController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      image: { type: 'gallery' },
      deleteFromWoo: (id) => productWooCommerceService.deleteProduct(id),
    });
  }

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
      const uploadDir = path.join(__dirname, '../../public/products', productId);
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

      // 5. Utiliser la première image pour l'image principale
      let mainImage = null;
      if (galleryImages.length > 0) {
        const firstImage = galleryImages[0];

        mainImage = {
          _id: firstImage._id,
          name: firstImage.metadata.original_name,
          src: firstImage.src,
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

      await this.model.update(productId, updateData);

      // 7. Marquer le produit pour synchronisation si nécessaire
      if (product.woo_id) {
        await this.model.update(productId, { pending_sync: true });
      }

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

const productImageController = new ProductImageController();

module.exports = exportController(productImageController, [
  'uploadImage',
  'updateImageMetadata',
  'deleteImage',
  'setMainImage',
  'repairProductImages',
]);
