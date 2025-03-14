// middleware/wooSyncMiddleware.js
const ProductWooCommerceService = require('../services/ProductWooCommerceService');
const websocketManager = require('../websocket/websocketManager');
/**
 * Middleware pour synchroniser automatiquement les modifications avec WooCommerce
 * @param {Object} options - Options de configuration
 *@param {boolean} options.forceSync - Force la synchronisation automatique
 * @param {boolean} options.manualSync - Indique si c'est une synchronisation manuelle (via API)
 */
function wooSyncMiddleware(options = { forceSync: false, manualSync: false }) {
  return async function (req, res, next) {
    // Pour synchronisation manuelle via API
    if (options.manualSync) {
      try {
        const entityId = req.params.id;
        const Model = req.model;

        if (!Model) {
          return res.status(400).json({
            success: false,
            message: 'Modèle non spécifié pour la synchronisation',
          });
        }

        const entity = await Model.findById(entityId);
        if (!entity) {
          return res.status(404).json({
            success: false,
            message: 'Entité non trouvée',
          });
        }

        // Déterminer quel service utiliser selon le modèle
        let syncService;
        let entityType;

        if (Model.name === 'Product' || Model.constructor.name === 'Product') {
          syncService = require('../services/ProductWooCommerceService');
          entityType = 'produit';
        } else if (Model.name === 'Category' || Model.constructor.name === 'Category') {
          syncService = require('../services/CategoryWooCommerceService');
          entityType = 'catégorie';
        } else if (Model.name === 'Brand' || Model.constructor.name === 'Brand') {
          syncService = require('../services/BrandWooCommerceService');
          entityType = 'marque';
        } else {
          return res.status(400).json({
            success: false,
            message: "Type d'entité non pris en charge pour la synchronisation",
          });
        }

        const result = await syncService.syncToWooCommerce(entity);

        // Réinitialiser pending_sync après synchronisation réussie
        if (result.success) {
          await Model.update(entityId, {
            pending_sync: false,
            last_sync: new Date(),
          });

          // Récupérer l'entité mise à jour avec son woo_id
          const updatedEntity = await Model.findById(entityId);

          // Déterminer le nom de l'entité pour la notification WebSocket
          const websocketEntityName =
            entityType === 'produit'
              ? 'products'
              : entityType === 'catégorie'
                ? 'categories'
                : 'brands';

          // Envoyer une notification WebSocket
          websocketManager.notifyEntityUpdated(websocketEntityName, entityId, updatedEntity);
        }

        return res.json({
          success: result.success,
          message: result.success
            ? `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} synchronisé avec succès ${result.data[0].woo_id ? '(mis à jour)' : '(créé)'}`
            : `Échec de la synchronisation de ${entityType}`,
          data: result,
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    }
    // Pour synchronisation automatique (comportement existant)
    const originalSend = res.send;

    res.send = function (body) {
      try {
        const data = typeof body === 'string' ? JSON.parse(body) : body;

        if (data && data.success && data.data) {
          const product = Array.isArray(data.data) ? data.data[0] : data.data;

          // Synchroniser si forceSync est true OU si le produit a déjà un woo_id
          const shouldSync = options.forceSync || req.query.sync === 'true';

          if (shouldSync) {
            syncWithWooCommerce(product)
              .then((result) => {
                if (result.success) {
                  console.log(`Produit ${product._id} synchronisé avec WooCommerce`);
                  // Réinitialiser pending_sync
                  const Product = require('../models/Product');
                  Product.update(product._id, { pending_sync: false }).catch((err) =>
                    console.error('Erreur réinitialisation pending_sync:', err)
                  );
                } else {
                  console.error(
                    `Erreur lors de la synchronisation du produit ${product._id}:`,
                    result.error
                  );
                }
              })
              .catch((error) => {
                console.error(
                  `Erreur non gérée lors de la synchronisation du produit ${product._id}:`,
                  error
                );
              });
          }
        }
      } catch (error) {
        console.error('Erreur dans le middleware de synchronisation WooCommerce:', error);
      }

      return originalSend.call(this, body);
    };

    next();
  };
}

// Fonction pour synchroniser avec WooCommerce reste inchangée
async function syncWithWooCommerce(product) {
  try {
    // S'assurer que le produit est complet (avec toutes les données d'image)
    const productWithImages = product;

    // Si les images ne sont pas complètes dans l'objet product,
    // on récupère le produit complet depuis la base de données
    if ((!product.image || !product.gallery_images) && product._id) {
      const Product = require('../models/Product');
      productWithImages = await Product.findById(product._id);
    }

    // Créer un objet de données filtré avec seulement les champs nécessaires pour WooCommerce
    const wcProduct = {
      _id: productWithImages._id,
      name: productWithImages.name,
      sku: productWithImages.sku,
      description: productWithImages.description || '',
      description_short: productWithImages.description_short || '',
      price: productWithImages.price,
      regular_price: productWithImages.regular_price || productWithImages.price,
      sale_price: productWithImages.sale_price,
      status: productWithImages.status,
      manage_stock: productWithImages.manage_stock,
      stock: productWithImages.stock,
      brand_id: productWithImages.brand_id,
      category_id: productWithImages.category_id,
      categories: productWithImages.categories,
      meta_data: productWithImages.meta_data,
      image: productWithImages.image,
      gallery_images: productWithImages.gallery_images,
    };

    // Si le produit a un woo_id, l'inclure pour permettre les mises à jour
    if (productWithImages.woo_id) {
      wcProduct.woo_id = productWithImages.woo_id;
    }

    console.log('Synchronisation du produit avec WooCommerce:', wcProduct._id);

    // Utiliser le service de synchronisation WooCommerce
    return await ProductWooCommerceService.syncToWooCommerce(wcProduct);
  } catch (error) {
    console.error('Erreur lors de la synchronisation avec WooCommerce:', error);
    return { success: false, error: error.message };
  }
}

module.exports = wooSyncMiddleware;
