// services/sync/ProductSync.js
const SyncStrategy = require('../base/SyncStrategy');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const Brand = require('../../models/Brand');
const categoryWooCommerceService = require('../CategoryWooCommerceService');
const brandWooCommerceService = require('../BrandWooCommerceService');
const { v4: uuidv4 } = require('uuid');

class ProductSyncStrategy extends SyncStrategy {
  constructor() {
    super('products');
  }

  async _mapLocalToWooCommerce(product) {
    const wcData = {
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      regular_price: (product.regular_price || product.price).toString(),
      price: product.price.toString(),
      sale_price: (product.sale_price || '').toString(),
      status: product.status === 'published' ? 'publish' : 'draft',
      manage_stock: product.manage_stock || false,
      stock_quantity: product.stock || 0,
      meta_data: [...(product.meta_data || []), { key: 'brand_id', value: product.brand_id }],
    };

    // Gestion des catégories
    wcData.categories = await this._prepareCategoryData(product);

    // Gestion de la marque
    if (product.brand_id) {
      wcData.brands = await this._prepareBrandData(product.brand_id);
    }

    // Gestion des images
    wcData.images = this._prepareImageData(product);

    return wcData;
  }

  async _prepareCategoryData(product) {
    // Si categories est vide ET category_id est null, utiliser "non classée"
    if (
      (!product.categories || product.categories.length === 0) &&
      (!product.category_id || product.category_id === null)
    ) {
      console.log('[WS-DEBUG] Aucune catégorie définie, utilisation de "non classée"');
      return [{ id: 1 }]; // Catégorie "non classée" de WooCommerce
    }

    // Utiliser categories s'il existe, sinon utiliser category_id
    const categoryIds =
      product.categories?.length > 0
        ? product.categories
        : product.category_id
          ? [product.category_id]
          : [];

    // Récupérer les catégories et vérifier si elles sont synchronisées
    const categories = await Category.findAll();
    const productCategories = categories.filter((cat) => categoryIds.includes(cat._id));
    const unsyncedCategories = productCategories.filter((cat) => !cat.woo_id);

    // Si des catégories ne sont pas synchronisées, les synchroniser
    if (unsyncedCategories.length > 0) {
      console.log(
        `[WS-DEBUG] Catégories non synchronisées pour produit ${product._id}: ${unsyncedCategories.map((c) => c._id).join(', ')}`
      );
      await this._syncCategories(unsyncedCategories);
    }

    // Récupérer à nouveau les catégories après la synchronisation
    const updatedCategories = await Category.findAll();
    const mappedCategories = updatedCategories
      .filter((cat) => categoryIds.includes(cat._id) && cat.woo_id)
      .map((cat) => ({ id: parseInt(cat.woo_id) }));

    // Si aucune catégorie valide trouvée, utiliser "non classée"
    if (mappedCategories.length === 0) {
      console.log('[WS-DEBUG] Aucune catégorie valide trouvée, utilisation de "non classée"');
      return [{ id: 1 }];
    }

    return mappedCategories;
  }

  /**
   * Prépare les données de la marque pour WooCommerce et assure sa synchronisation
   * @param {string} brandId - ID de la marque
   * @returns {Promise<Array>} - Tableau contenant la référence à la marque WooCommerce
   */
  async _prepareBrandData(brandId) {
    if (!brandId) return null;

    // Récupérer la marque
    const brand = await Brand.findById(brandId);
    if (!brand) {
      console.log(`[WS-DEBUG] Marque avec ID ${brandId} non trouvée`);
      return null;
    }

    // Vérifier si la marque est déjà synchronisée
    if (brand.woo_id) {
      return [{ id: parseInt(brand.woo_id) }];
    }

    // Si la marque n'est pas synchronisée, la synchroniser
    console.log(
      `[WS-DEBUG] Marque non synchronisée: ${brand.name} (${brand._id}), synchronisation...`
    );

    try {
      // Synchroniser la marque
      const syncResult = await this._syncBrand(brand);

      if (syncResult.success) {
        // Récupérer la marque mise à jour
        const updatedBrand = await Brand.findById(brandId);
        if (updatedBrand.woo_id) {
          console.log(
            `[WS-DEBUG] Marque synchronisée avec succès: ${updatedBrand.name} (woo_id: ${updatedBrand.woo_id})`
          );
          return [{ id: parseInt(updatedBrand.woo_id) }];
        }
      } else {
        console.error(
          `[WS-DEBUG] Erreur lors de la synchronisation de la marque:`,
          syncResult.error
        );
      }
    } catch (error) {
      console.error(`[WS-DEBUG] Exception lors de la synchronisation de la marque:`, error);
    }

    // En cas d'échec, retourner null
    return null;
  }

  /**
   * Synchronise une marque avec WooCommerce
   * @param {Object} brand - La marque à synchroniser
   * @returns {Promise<Object>} - Résultat de la synchronisation
   */
  async _syncBrand(brand) {
    try {
      const syncResult = await brandWooCommerceService.syncToWooCommerce([brand]);

      if (syncResult.errors && syncResult.errors.length > 0) {
        console.error(
          `[WS-DEBUG] Erreurs lors de la synchronisation de la marque:`,
          syncResult.errors
        );
        return { success: false, error: syncResult.errors[0] };
      }

      return { success: true, brand: syncResult.data[0] };
    } catch (error) {
      console.error(`[WS-DEBUG] Erreur lors de la synchronisation de la marque:`, error);
      return { success: false, error };
    }
  }

  /**
   * Synchronise les catégories spécifiées avec WooCommerce
   * @param {Array} categories - Liste des catégories à synchroniser
   */
  async _syncCategories(categories) {
    if (!categories || categories.length === 0) return;

    try {
      console.log(`[WS-DEBUG] Synchronisation de ${categories.length} catégories avant produit`);

      // Trier les catégories par niveau pour synchroniser les parents d'abord
      const sortedCategories = this._sortCategoriesByLevel(categories);

      // Utiliser le service de catégorie pour la synchronisation
      const syncResult = await categoryWooCommerceService.syncToWooCommerce(sortedCategories);

      if (syncResult.errors && syncResult.errors.length > 0) {
        console.error(
          `[WS-DEBUG] Erreurs lors de la synchronisation des catégories:`,
          syncResult.errors
        );
      } else {
        console.log(
          `[WS-DEBUG] ${syncResult.created + syncResult.updated} catégories synchronisées avec succès`
        );
      }
    } catch (error) {
      console.error(`[WS-DEBUG] Erreur lors de la synchronisation des catégories:`, error);
      // Ne pas propager l'erreur pour permettre au produit d'être synchronisé quand même
    }
  }

  /**
   * Trie les catégories par niveau (parents d'abord)
   * @param {Array} categories - Liste des catégories à trier
   * @returns {Array} - Liste des catégories triées
   */
  _sortCategoriesByLevel(categories) {
    return categories.sort((a, b) => {
      const levelA = a.level || (a.parent_id ? 1 : 0);
      const levelB = b.level || (b.parent_id ? 1 : 0);
      return levelA - levelB;
    });
  }

  _prepareImageData(product) {
    const images = [];

    // Ajouter l'image principale si elle existe
    if (product.image?.wp_id) {
      images.push({
        id: parseInt(product.image.wp_id),
        src: product.image.url,
        position: 0,
        alt: product.name,
      });
    }

    // Ajouter toutes les images de la galerie (sauf l'image principale pour éviter les doublons)
    if (product.gallery_images?.length) {
      const galleryImages = product.gallery_images
        .filter((img) => img.wp_id && (!product.image || img.wp_id !== product.image.wp_id))
        .map((img, index) => ({
          id: parseInt(img.wp_id),
          src: img.url,
          position: index + 1,
          alt: `${product.name} - ${index + 1}`,
        }));

      images.push(...galleryImages);
    }

    // Si aucune image n'a été ajoutée mais qu'il y a des images avec wp_id dans la galerie
    if (images.length === 0 && product.gallery_images?.some((img) => img.wp_id)) {
      const firstImage = product.gallery_images.find((img) => img.wp_id);
      if (firstImage) {
        images.push({
          id: parseInt(firstImage.wp_id),
          src: firstImage.url,
          position: 0,
          alt: product.name,
        });
      }
    }

    return images;
  }

  async _mapWooCommerceToLocal(wcProduct) {
    return {
      name: wcProduct.name,
      sku: wcProduct.sku,
      description: wcProduct.description,
      price: parseFloat(wcProduct.price),
      regular_price: parseFloat(wcProduct.regular_price),
      sale_price: wcProduct.sale_price ? parseFloat(wcProduct.sale_price) : null,
      status: wcProduct.status === 'publish' ? 'published' : 'draft',
      manage_stock: wcProduct.manage_stock,
      stock: wcProduct.stock_quantity,
      woo_id: wcProduct.id,
      website_url: wcProduct.permalink || null,
      categories: wcProduct.categories?.map((cat) => cat.id) || [],
      meta_data: wcProduct.meta_data || [],
    };
  }

  async syncToWooCommerce(product, client, results = { created: 0, updated: 0, errors: [] }) {
    try {
      // Vérifier et téléverser les images en attente vers WordPress
      await this._syncPendingImages(product);

      // Recharger le produit avec les images mises à jour
      const Product = require('../../models/Product');
      const updatedProduct = await Product.findById(product._id);

      const wcData = await this._mapLocalToWooCommerce(updatedProduct);

      let response;
      if (updatedProduct.woo_id) {
        // Produit existant
        response = await client.put(`${this.endpoint}/${updatedProduct.woo_id}`, wcData);
        await this._updateLocalProduct(updatedProduct._id, response.data);
        results.updated++;
      } else {
        // Nouveau produit
        response = await client.post(this.endpoint, wcData);
        // Immédiatement après création, mettre à jour avec les images
        if (response.data.id && wcData.images && wcData.images.length > 0) {
          // Mettre à jour le produit local avec le woo_id
          await Product.update(updatedProduct._id, { woo_id: response.data.id });

          // Réessayer avec PUT pour s'assurer que les images sont bien associées
          const imageUpdateData = {
            id: response.data.id,
            images: wcData.images,
          };

          await client.put(`${this.endpoint}/${response.data.id}`, imageUpdateData);
        }

        await this._updateLocalProduct(updatedProduct._id, response.data);
        results.created++;
      }

      return {
        success: true,
        product: await Product.findById(updatedProduct._id),
        results,
      };
    } catch (error) {
      results.errors.push({
        product_id: product._id,
        error: error.message,
      });
      return { success: false, error, results };
    }
  }

  async _syncPendingImages(product) {
    if (!product.gallery_images?.length) return product;

    const pendingImages = product.gallery_images.filter(
      (img) => img.status === 'pending' || !img.wp_id || !img.url
    );

    if (!pendingImages.length) return product;

    const wpSync = new (require('../../services/image/WordPressImageSync'))();
    const Product = require('../../models/Product');
    const updatedGallery = [...product.gallery_images];

    // Uploader chaque image en attente
    for (let i = 0; i < updatedGallery.length; i++) {
      const img = updatedGallery[i];
      if (img.status === 'pending' || !img.wp_id || !img.url) {
        try {
          if (!img.local_path) continue;

          const wpData = await wpSync.uploadToWordPress(img.local_path);
          updatedGallery[i] = {
            ...img, // Préserver toutes les propriétés incluant _id
            wp_id: wpData.id,
            url: wpData.url,
            status: 'active',
          };
        } catch (error) {
          console.error(`Erreur upload WP pour image ${i}:`, error);
        }
      }
    }

    // Mettre à jour l'image principale si nécessaire
    let mainImage = product.image;
    if (mainImage && (mainImage.status === 'pending' || !mainImage.wp_id || !mainImage.url)) {
      // Trouver cette image dans la galerie mise à jour
      const matchingImg = updatedGallery.find(
        (img) => img.local_path === mainImage.local_path || img.src === mainImage.src
      );

      if (matchingImg && matchingImg.wp_id) {
        mainImage = {
          ...mainImage, // Préserver _id et autres propriétés
          ...matchingImg,
        };
      }
    }

    // Sauvegarder les modifications
    await Product.update(product._id, {
      gallery_images: updatedGallery,
      image: mainImage,
    });

    // Recharger le produit avec les images mises à jour
    return await Product.findById(product._id);
  }

  async _updateLocalProduct(productId, wcData) {
    const updateData = {
      woo_id: wcData.id,
      last_sync: new Date(),
      // Ajouter l'URL du produit depuis WooCommerce
      website_url: wcData.permalink || null,
    };

    // Obtenir les données actuelles du produit
    const currentProduct = await Product.findById(productId);

    // Mettre à jour les images
    if (wcData.images?.length > 0) {
      // Image principale
      const mainWpId = wcData.images[0].id;

      // Chercher si cette image existe déjà dans la galerie locale
      let mainImageLocal = currentProduct.gallery_images?.find((img) => img.wp_id === mainWpId);

      updateData.image = {
        _id: mainImageLocal?._id || uuidv4(), // Préserver _id ou en créer un nouveau
        wp_id: mainWpId,
        url: wcData.images[0].src,
        // Conserver le chemin local s'il existe déjà
        local_path: mainImageLocal?.local_path || null,
        src: mainImageLocal?.src || wcData.images[0].src,
        status: 'active',
      };

      // Mettre à jour ou créer les images de galerie sans duplication
      if (wcData.images.length > 0) {
        const galleryImages = [];
        const addedWpIds = new Set();

        for (const wcImage of wcData.images) {
          // Si cette image a déjà été ajoutée, la sauter
          if (addedWpIds.has(wcImage.id)) continue;

          // Ajouter l'ID à l'ensemble des IDs déjà traités
          addedWpIds.add(wcImage.id);

          // Chercher l'image correspondante dans la galerie actuelle
          const existingImage = currentProduct.gallery_images?.find(
            (img) => img.wp_id === wcImage.id
          );

          galleryImages.push({
            _id: existingImage?._id || uuidv4(), // Préserver _id ou en créer un nouveau
            wp_id: wcImage.id,
            url: wcImage.src,
            src: existingImage?.src || wcImage.src,
            local_path: existingImage?.local_path || null,
            status: 'active',
            type: existingImage?.type || wcImage.src.split('.').pop(),
            metadata: existingImage?.metadata || {},
          });
        }

        updateData.gallery_images = galleryImages;
      }
    }

    await Product.update(productId, updateData);
  }

  async handleFullSync(client, results = { created: 0, updated: 0, deleted: 0, errors: [] }) {
    try {
      const [localProducts, wcResponse] = await Promise.all([
        Product.findAll(),
        client.get(this.endpoint, { per_page: 100 }),
      ]);

      // Suppression des produits qui n'existent plus en local
      await this._deleteNonExistentProducts(wcResponse.data, localProducts, client, results);

      // Synchronisation des produits locaux
      for (const product of localProducts) {
        await this.syncToWooCommerce(product, client, results);
      }

      return results;
    } catch (error) {
      results.errors.push({
        error: error.message,
      });
      return results;
    }
  }

  async _deleteNonExistentProducts(wcProducts, localProducts, client, results) {
    for (const wcProduct of wcProducts) {
      if (!localProducts.some((product) => product.woo_id === wcProduct.id)) {
        try {
          // Supprimer les images
          if (wcProduct.images?.length) {
            for (const image of wcProduct.images) {
              await client.deleteMedia(image.id);
            }
          }
          // Supprimer le produit
          await client.delete(`${this.endpoint}/${wcProduct.id}`, { force: true });
          results.deleted++;
        } catch (error) {
          results.errors.push({
            product_id: wcProduct.id,
            error: `Erreur suppression WC: ${error.message}`,
          });
        }
      }
    }
  }
}

module.exports = ProductSyncStrategy;
