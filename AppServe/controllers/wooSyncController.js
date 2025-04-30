// controllers/wooSyncController.js
const ResponseHandler = require('../handlers/ResponseHandler');
const ProductWooCommerceService = require('../services/ProductWooCommerceService');
const { syncUpdatedProducts } = require('../services/sync/syncUpdatedProducts');
const WooCommerceClient = require('../services/base/WooCommerceClient');
const websocketManager = require('../websocket/websocketManager');

class WooSyncController {
  /**
   * Synchronise un produit spécifique avec WooCommerce
   */
  async syncProduct(req, res) {
    try {
      const productId = req.params.id;
      if (!productId) {
        return ResponseHandler.badRequest(res, 'ID du produit requis');
      }

      // Utiliser le service de synchronisation
      const result = await ProductWooCommerceService.syncToWooCommerce({ _id: productId });

      if (result.success) {
        // Réinitialiser pending_sync après synchronisation réussie
        const Product = require('../models/Product');
        await Product.update(productId, {
          pending_sync: false,
          last_sync: new Date(),
        });

        return ResponseHandler.success(res, {
          message: 'Produit synchronisé avec succès',
          data: result.data,
        });
      } else {
        return ResponseHandler.partialSuccess(res, {
          message: 'Erreur lors de la synchronisation',
          errors: result.errors,
        });
      }
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getPendingSync(req, res) {
    try {
      const Product = require('../models/Product');

      // Utiliser findAll() au lieu de find()
      const allProducts = await Product.findAll();

      // Filtrer les produits avec pending_sync=true
      const pendingProducts = allProducts.filter((product) => product.pending_sync === true);

      return ResponseHandler.success(res, {
        count: pendingProducts.length,
        data: pendingProducts,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getPendingCategories(req, res) {
    try {
      const Category = require('../models/Category');
      const allCategories = await Category.findAll();
      const pendingCategories = allCategories.filter((category) => category.pending_sync === true);

      return ResponseHandler.success(res, {
        count: pendingCategories.length,
        data: pendingCategories,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getPendingBrands(req, res) {
    try {
      const Brand = require('../models/Brand');
      const allBrands = await Brand.findAll();
      const pendingBrands = allBrands.filter((brand) => brand.pending_sync === true);

      return ResponseHandler.success(res, {
        count: pendingBrands.length,
        data: pendingBrands,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * Synchronise tous les produits modifiés avec WooCommerce
   */
  async syncAllUpdatedProducts(req, res) {
    try {
      const Product = require('../models/Product');

      // Récupérer tous les produits avec pending_sync=true
      const pendingProducts = await Product.find({ pending_sync: true });

      if (pendingProducts.length === 0) {
        return ResponseHandler.success(res, {
          message: 'Aucun produit en attente de synchronisation',
          products_synced: 0,
          errors: [],
        });
      }

      // Lancer la synchronisation pour chaque produit
      const results = {
        synced: 0,
        errors: [],
      };

      for (const product of pendingProducts) {
        try {
          const syncResult = await ProductWooCommerceService.syncToWooCommerce(product);

          if (syncResult.success) {
            // Réinitialiser pending_sync après synchronisation réussie
            await Product.update(product._id, {
              pending_sync: false,
              last_sync: new Date(),
            });
            results.synced++;
          } else {
            results.errors.push({
              product_id: product._id,
              name: product.name,
              error: syncResult.error?.message || 'Erreur inconnue',
            });
          }
        } catch (error) {
          results.errors.push({
            product_id: product._id,
            name: product.name,
            error: error.message,
          });
        }
      }

      return ResponseHandler.success(res, {
        message: 'Synchronisation terminée',
        products_synced: results.synced,
        errors: results.errors,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * Force la synchronisation de tous les produits avec WooCommerce
   */
  async forceSync(req, res) {
    try {
      // Lancer la synchronisation complète
      const result = await syncUpdatedProducts(true);

      return ResponseHandler.success(res, {
        message: 'Synchronisation forcée lancée',
        products_synced: result.synced,
        errors: result.errors,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * Compte le nombre de produits dont le SKU existe sur WooCommerce mais sans woo_id local
   */
  async countMissingWooIds(req, res) {
    try {
      const Product = require('../models/Product');

      // Récupérer tous les produits locaux qui n'ont pas de woo_id
      const localProducts = await Product.findAll();
      const productsWithoutWooId = localProducts.filter(
        (product) => !product.woo_id && product.sku && product.sku.trim() !== ''
      );

      if (productsWithoutWooId.length === 0) {
        return ResponseHandler.success(res, {
          message: 'Tous les produits avec SKU ont déjà un woo_id',
          count: 0,
          products: [],
        });
      }

      // Initialiser le client WooCommerce
      const wooClient = new WooCommerceClient();

      // Récupérer tous les produits de WooCommerce (par lots de 100)
      let page = 1;
      let allWooProducts = [];
      let hasMore = true;

      while (hasMore) {
        const response = await wooClient.get('products', {
          per_page: 100,
          page: page,
          // Optimisation: récupérer uniquement les champs nécessaires
          _fields: 'id,sku,permalink',
        });

        const products = response.data;

        if (products.length === 0) {
          hasMore = false;
        } else {
          allWooProducts = [...allWooProducts, ...products];
          page++;
        }
      }

      console.log(`Récupéré ${allWooProducts.length} produits de WooCommerce`);

      // Identifier les produits locaux qui ont un SKU correspondant dans WooCommerce
      const matchingSKUs = [];

      for (const localProduct of productsWithoutWooId) {
        const wooProduct = allWooProducts.find((wp) => wp.sku === localProduct.sku);

        if (wooProduct) {
          matchingSKUs.push({
            _id: localProduct._id,
            sku: localProduct.sku,
            name: localProduct.name,
            woo_product_id: wooProduct.id,
            woo_permalink: wooProduct.permalink,
          });
        }
      }

      return ResponseHandler.success(res, {
        message: `${matchingSKUs.length} produits avec SKU correspondant trouvés sur WooCommerce`,
        count: matchingSKUs.length,
        products: matchingSKUs,
      });
    } catch (error) {
      console.error('Erreur lors du comptage des produits manquants:', error);
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * Synchronise les produits locaux avec les informations de WooCommerce en utilisant les SKU
   */
  async syncMissingWooIds(req, res) {
    try {
      const Product = require('../models/Product');

      // Initialiser le client WooCommerce
      const wooClient = new WooCommerceClient();

      // Récupérer tous les produits locaux qui n'ont pas de woo_id
      const localProducts = await Product.findAll();
      const productsWithoutWooId = localProducts.filter(
        (product) => !product.woo_id && product.sku && product.sku.trim() !== ''
      );

      if (productsWithoutWooId.length === 0) {
        return ResponseHandler.success(res, {
          message: 'Tous les produits avec SKU ont déjà un woo_id',
          updated: 0,
        });
      }

      // Récupérer tous les produits de WooCommerce (par lots de 100)
      let page = 1;
      let allWooProducts = [];
      let hasMore = true;

      while (hasMore) {
        const response = await wooClient.get('products', {
          per_page: 100,
          page: page,
          _fields: 'id,sku,permalink,images,status',
        });

        const products = response.data;

        if (products.length === 0) {
          hasMore = false;
        } else {
          allWooProducts = [...allWooProducts, ...products];
          page++;
        }
      }

      // Mettre à jour les produits locaux avec les informations de WooCommerce
      const updatedProducts = [];
      const errors = [];

      for (const localProduct of productsWithoutWooId) {
        try {
          const wooProduct = allWooProducts.find((wp) => wp.sku === localProduct.sku);

          if (wooProduct) {
            // Fusionner les informations d'images au lieu de les remplacer
            let updatedImage = localProduct.image || {};
            let updatedGalleryImages = [...(localProduct.gallery_images || [])];

            if (wooProduct.images && wooProduct.images.length > 0) {
              const mainWooImage = wooProduct.images[0];

              // Mettre à jour l'image principale en préservant les données locales
              if (localProduct.image) {
                updatedImage = {
                  ...localProduct.image, // Conserver toutes les propriétés locales
                  wp_id: mainWooImage.id,
                  url: mainWooImage.src,
                  status: 'active',
                };
              } else {
                // Si pas d'image locale, créer une structure minimale
                updatedImage = {
                  _id: require('crypto').randomBytes(12).toString('hex'),
                  wp_id: mainWooImage.id,
                  url: mainWooImage.src,
                  status: 'active',
                };
              }

              // Mettre à jour les images de la galerie en préservant les données locales
              if (wooProduct.images.length > 1 && localProduct.gallery_images) {
                // Pour chaque image dans la galerie locale
                updatedGalleryImages = updatedGalleryImages.map((localImg, index) => {
                  // Si nous avons une image WooCommerce correspondante (par index)
                  if (index < wooProduct.images.length) {
                    return {
                      ...localImg, // Conserver toutes les propriétés locales
                      wp_id: wooProduct.images[index].id,
                      url: wooProduct.images[index].src,
                      status: 'active',
                    };
                  }
                  return localImg; // Garder inchangée si pas d'image WooCommerce correspondante
                });
              }
            }

            // Déterminer le statut en fonction de l'état WooCommerce
            let localStatus = localProduct.status;
            if (wooProduct.status === 'publish') {
              localStatus = 'published';
            } else if (wooProduct.status === 'draft') {
              localStatus = 'draft';
            }

            // Mise à jour du produit local avec les infos de WooCommerce
            await Product.update(localProduct._id, {
              woo_id: wooProduct.id,
              website_url: wooProduct.permalink,
              last_sync: new Date(),
              pending_sync: false,
              status: localStatus, // Mise à jour du statut
              image: updatedImage,
              gallery_images: updatedGalleryImages,
            });

            // Notifier via WebSocket
            if (websocketManager && websocketManager.notifyEntityUpdated) {
              websocketManager.notifyEntityUpdated(
                'products',
                localProduct._id,
                await Product.findById(localProduct._id)
              );
            }

            updatedProducts.push({
              _id: localProduct._id,
              sku: localProduct.sku,
              name: localProduct.name,
              woo_id: wooProduct.id,
              status: localStatus,
              has_images: wooProduct.images && wooProduct.images.length > 0,
            });
          }
        } catch (error) {
          console.error(`Erreur lors de la mise à jour du produit ${localProduct._id}:`, error);
          errors.push({
            _id: localProduct._id,
            sku: localProduct.sku,
            name: localProduct.name,
            error: error.message,
          });
        }
      }

      return ResponseHandler.success(res, {
        message: `${updatedProducts.length} produits ont été mis à jour avec leurs informations WooCommerce`,
        updated: updatedProducts.length,
        products: updatedProducts,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error('Erreur lors de la synchronisation des produits manquants:', error);
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * Synchronise un seul produit local avec WooCommerce en validant son SKU
   */
  async syncProductBySku(req, res) {
    try {
      const Product = require('../models/Product');
      const { id } = req.params;

      if (!id) {
        return ResponseHandler.badRequest(res, 'ID du produit requis');
      }

      // Trouver le produit local par ID
      const localProduct = await Product.findById(id);

      if (!localProduct) {
        return ResponseHandler.notFound(res, `Produit avec l'ID "${id}" non trouvé`);
      }

      if (localProduct.woo_id) {
        return ResponseHandler.badRequest(
          res,
          `Le produit a déjà un woo_id: ${localProduct.woo_id}`
        );
      }

      if (!localProduct.sku || localProduct.sku.trim() === '') {
        return ResponseHandler.badRequest(
          res,
          'Le produit doit avoir un SKU valide pour être synchronisé'
        );
      }

      // Initialiser le client WooCommerce
      const wooClient = new WooCommerceClient();

      // Récupérer le produit WooCommerce correspondant par SKU
      const wooResponse = await wooClient.get('products', {
        sku: localProduct.sku,
        _fields: 'id,sku,permalink,images,name,status',
      });

      const wooProducts = wooResponse.data;

      if (!wooProducts || wooProducts.length === 0) {
        return ResponseHandler.notFound(
          res,
          `Aucun produit avec le SKU "${localProduct.sku}" trouvé sur WooCommerce`
        );
      }

      const wooProduct = wooProducts[0]; // Prendre le premier correspondant

      // Fusionner les informations d'images au lieu de les remplacer
      let updatedImage = localProduct.image || {};
      let updatedGalleryImages = [...(localProduct.gallery_images || [])];

      if (wooProduct.images && wooProduct.images.length > 0) {
        const mainWooImage = wooProduct.images[0];

        // Mettre à jour l'image principale en préservant les données locales
        if (localProduct.image) {
          updatedImage = {
            ...localProduct.image, // Conserver toutes les propriétés locales
            wp_id: mainWooImage.id,
            url: mainWooImage.src,
            status: 'active',
          };
        } else {
          // Si pas d'image locale, créer une structure minimale
          updatedImage = {
            _id: require('crypto').randomBytes(12).toString('hex'),
            wp_id: mainWooImage.id,
            url: mainWooImage.src,
            status: 'active',
          };
        }

        // Mettre à jour les images de la galerie en préservant les données locales
        if (wooProduct.images.length > 1 && localProduct.gallery_images) {
          // Pour chaque image dans la galerie locale
          updatedGalleryImages = updatedGalleryImages.map((localImg, index) => {
            // Si nous avons une image WooCommerce correspondante (par index)
            if (index < wooProduct.images.length) {
              return {
                ...localImg, // Conserver toutes les propriétés locales
                wp_id: wooProduct.images[index].id,
                url: wooProduct.images[index].src,
                status: 'active',
              };
            }
            return localImg; // Garder inchangée si pas d'image WooCommerce correspondante
          });
        }
      }

      // Déterminer le statut en fonction de l'état WooCommerce
      let localStatus = localProduct.status;
      if (wooProduct.status === 'publish') {
        localStatus = 'published';
      } else if (wooProduct.status === 'draft') {
        localStatus = 'draft';
      }

      // Mise à jour du produit local avec les infos de WooCommerce
      await Product.update(localProduct._id, {
        woo_id: wooProduct.id,
        website_url: wooProduct.permalink,
        last_sync: new Date(),
        pending_sync: false,
        status: localStatus, // Mise à jour du statut
        image: updatedImage,
        gallery_images: updatedGalleryImages,
      });

      // Notifier via WebSocket
      if (websocketManager && websocketManager.notifyEntityUpdated) {
        websocketManager.notifyEntityUpdated(
          'products',
          localProduct._id,
          await Product.findById(localProduct._id)
        );
      }

      return ResponseHandler.success(res, {
        message: `Produit "${localProduct.name}" synchronisé avec succès avec "${wooProduct.name}" de WooCommerce`,
        product: {
          _id: localProduct._id,
          sku: localProduct.sku,
          name: localProduct.name,
          woo_id: wooProduct.id,
          woo_permalink: wooProduct.permalink,
          status: localStatus,
          has_images: wooProduct.images && wooProduct.images.length > 0,
          image_preserved: true,
        },
      });
    } catch (error) {
      console.error(`Erreur lors de la synchronisation du produit:`, error);
      return ResponseHandler.error(res, error);
    }
  }
}

const wooSyncController = new WooSyncController();

module.exports = {
  syncProduct: wooSyncController.syncProduct.bind(wooSyncController),
  syncAllUpdatedProducts: wooSyncController.syncAllUpdatedProducts.bind(wooSyncController),
  forceSync: wooSyncController.forceSync.bind(wooSyncController),
  getPendingSync: wooSyncController.getPendingSync.bind(wooSyncController),
  getPendingCategories: wooSyncController.getPendingCategories.bind(wooSyncController),
  getPendingBrands: wooSyncController.getPendingBrands.bind(wooSyncController),
  countMissingWooIds: wooSyncController.countMissingWooIds.bind(wooSyncController),
  syncMissingWooIds: wooSyncController.syncMissingWooIds.bind(wooSyncController),
  syncProductBySku: wooSyncController.syncProductBySku.bind(wooSyncController),
};
