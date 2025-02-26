// middleware/wooSyncMiddleware.js
const ProductWooCommerceService = require('../services/ProductWooCommerceService');

/**
 * Middleware pour synchroniser automatiquement les modifications avec WooCommerce
 * À ajouter aux routes de mise à jour des produits
 */
async function wooSyncMiddleware(req, res, next) {
  // Sauvegarder la réponse originale
  const originalSend = res.send;

  // Intercepter la réponse
  res.send = function (body) {
    try {
      // Récupérer les données de la réponse
      const data = typeof body === 'string' ? JSON.parse(body) : body;

      // Vérifier si c'est une réponse de succès avec des données de produit
      if (data && data.success && data.data) {
        // Si c'est un tableau, prendre le premier élément, sinon utiliser directement
        const product = Array.isArray(data.data) ? data.data[0] : data.data;

        // Vérifier si le produit a un woo_id (déjà synchronisé avec WooCommerce)
        if (product.woo_id) {
          // Lancer la synchronisation en arrière-plan
          syncWithWooCommerce(product)
            .then((result) => {
              if (result.success) {
                console.log(`Produit ${product._id} synchronisé avec WooCommerce`);
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

    // Appeler la fonction send originale
    return originalSend.call(this, body);
  };

  // Continuer le traitement de la requête
  next();
}

// Fonction pour synchroniser avec WooCommerce
async function syncWithWooCommerce(product) {
  try {
    // Créer un objet de données filtré avec seulement les champs nécessaires pour WooCommerce
    const wcProduct = {
      _id: product._id,
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      description_short: product.description_short || '',
      price: product.price,
      regular_price: product.regular_price || product.price,
      sale_price: product.sale_price,
      status: product.status,
      manage_stock: product.manage_stock,
      stock: product.stock,
      brand_id: product.brand_id,
      category_id: product.category_id,
      categories: product.categories,
      meta_data: product.meta_data,
    };

    // Si le produit a un woo_id, l'inclure pour permettre les mises à jour
    if (product.woo_id) {
      wcProduct.woo_id = product.woo_id;
    }

    console.log('Synchronisation du produit avec WooCommerce (champs filtrés):', wcProduct._id);

    // Utiliser le service de synchronisation WooCommerce
    return await ProductWooCommerceService.syncToWooCommerce(wcProduct);
  } catch (error) {
    console.error('Erreur lors de la synchronisation avec WooCommerce:', error);
    return { success: false, error: error.message };
  }
}

module.exports = wooSyncMiddleware;
