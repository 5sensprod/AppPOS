const SyncStrategy = require('../base/SyncStrategy');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const Brand = require('../../models/Brand');
const categoryService = require('../CategoryWooCommerceService');
const brandService = require('../BrandWooCommerceService');
const WordPressImageSync = require('../image/WordPressImageSync');
const { v4: uuidv4 } = require('uuid');

class ProductSyncStrategy extends SyncStrategy {
  constructor() {
    super('products');
  }

  async _mapLocalToWooCommerce(product) {
    console.log(
      `[SYNC] 🔍 Début mapping produit ${product._id} (${product.name}) pour WooCommerce`
    );

    // 🔥 Normaliser manage_stock en booléen AVANT de créer wcData
    const manageStock = product.manage_stock === true || product.manage_stock === 'yes';

    const wcData = {
      name: product.name,
      sku: product.sku || '',
      description: product.description || '',
      short_description: product.short_description || '',
      regular_price: (product.regular_price || product.price).toString(),
      price: product.price.toString(),
      sale_price: (product.sale_price || '').toString(),
      status: product.status === 'published' ? 'publish' : 'draft',

      // 🔥 CORRECTION : manage_stock sans stock_quantity par défaut
      manage_stock: manageStock,

      meta_data: [...(product.meta_data || []), { key: 'brand_id', value: product.brand_id }],
      slug:
        product.slug ||
        this._generateSlug(product.name || product.designation || product.sku || ''),
    };

    // ✅ N'envoyer stock_quantity QUE si manage_stock est true (mode automatique)
    if (manageStock) {
      wcData.stock_quantity = product.stock || 0;
      console.log(`[SYNC] 📦 Gestion du stock: ACTIVÉE (automatique)`);
      console.log(`[SYNC] 📊 Quantité en stock: ${wcData.stock_quantity}`);
    } else {
      // En mode manuel, envoyer le stock_status si présent
      console.log(`[SYNC] 📦 Gestion du stock: DÉSACTIVÉE (manuel)`);
      if (product.stock_status) {
        wcData.stock_status = this._normalizeStockStatus(product.stock_status);
        console.log(`[SYNC] 🏷️  Statut du stock (manuel): ${wcData.stock_status}`);
      }
    }

    console.log(`[SYNC] 🔂 Récupération des catégories pour le produit ${product._id}`);
    wcData.categories = await this._prepareCategoryData(product);
    console.log(`[SYNC] 📋 Catégories finales pour WooCommerce:`, wcData.categories);

    if (product.brand_id) {
      console.log(`[SYNC] 🏷️ Récupération des données de marque pour ${product.brand_id}`);
      wcData.brands = await this._prepareBrandData(product.brand_id);
      console.log(`[SYNC] 🏷️ Marque pour WooCommerce:`, wcData.brands);
    }

    wcData.images = this._prepareImageData(product);
    console.log(`[SYNC] 📸 Images préparées: ${wcData.images.length}`);

    console.log(`[SYNC] ✅ Mapping terminé pour ${product._id}`);
    return wcData;
  }

  _generateSlug(text) {
    if (!text) return '';

    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }

  async _prepareCategoryData(product) {
    console.log(`[SYNC] 🔍 Préparation des catégories pour le produit ${product._id}`);

    const categoryIds =
      product.categories?.length > 0
        ? product.categories
        : product.category_id
          ? [product.category_id]
          : [];

    console.log(`[SYNC] 📂 IDs de catégories trouvés:`, categoryIds);

    if (categoryIds.length === 0) {
      console.log(`[SYNC] ⚠️ Aucune catégorie à synchroniser`);
      return [];
    }

    const categories = await Category.findAll();
    console.log(`[SYNC] 📊 Nombre total de catégories dans la base: ${categories.length}`);

    const productCategories = categories.filter((c) => categoryIds.includes(c._id));
    console.log(
      `[SYNC] 📋 Catégories du produit:`,
      productCategories.map((c) => `${c.name} (${c._id}, woo_id: ${c.woo_id || 'null'})`)
    );

    const unsynced = productCategories.filter((c) => !c.woo_id);

    // 🔁 Étape 1 : synchro hiérarchique si woo_id manquant
    if (unsynced.length > 0) {
      console.log(
        `[SYNC] 🔄 Synchronisation hiérarchique nécessaire pour ${unsynced.length} catégorie(s):`,
        unsynced.map((c) => c.name)
      );

      // Synchroniser les catégories parentes d'abord
      const allCats = await Category.findAll();
      console.log(`[SYNC] 📊 Vérification hiérarchie des catégories`);

      // Synchroniser d'abord les catégories racines
      for (const cat of allCats) {
        if (
          !cat.parent_id &&
          !cat.woo_id &&
          (categoryIds.includes(cat._id) || unsynced.some((u) => u.parent_id === cat._id))
        ) {
          console.log(`[SYNC] 🔄 Synchronisation de la catégorie racine ${cat.name} (${cat._id})`);
          try {
            await categoryService.syncToWooCommerce(cat);
          } catch (error) {
            console.error(`[SYNC] ❌ Erreur synchronisation racine ${cat.name}: ${error.message}`);
          }
        }
      }

      // Puis synchroniser les sous-catégories niveau par niveau
      let parentsSynced = true;
      let level = 1;
      while (parentsSynced && level < 10) {
        // limite à 10 niveaux pour éviter boucle infinie
        parentsSynced = false;

        for (const cat of allCats) {
          if (
            cat.level === level &&
            !cat.woo_id &&
            (categoryIds.includes(cat._id) || unsynced.some((u) => u.parent_id === cat._id))
          ) {
            // Vérifier que le parent est synchronisé
            const parent = allCats.find((p) => p._id === cat.parent_id);
            if (parent && parent.woo_id) {
              console.log(
                `[SYNC] 🔄 Synchronisation de la sous-catégorie ${cat.name} (${cat._id}, niveau ${level})`
              );
              try {
                await categoryService.syncToWooCommerce(cat);
                parentsSynced = true;
              } catch (error) {
                console.error(
                  `[SYNC] ❌ Erreur synchronisation sous-catégorie ${cat.name}: ${error.message}`
                );
              }
            } else {
              console.log(
                `[SYNC] ⚠️ Parent de ${cat.name} (${parent?.name || 'inconnu'}) non synchronisé`
              );
            }
          }
        }

        level++;
      }

      // Tenter une synchronisation directe pour les catégories du produit non encore synchronisées
      for (const cat of unsynced) {
        if (!cat.woo_id) {
          console.log(`[SYNC] 🔄 Tentative directe pour ${cat.name} (${cat._id})`);
          try {
            await categoryService.syncToWooCommerce(cat);
          } catch (error) {
            console.error(`[SYNC] ❌ Échec synchronisation directe ${cat.name}: ${error.message}`);
          }
        }
      }
    }

    // 🧪 Étape 2 : vérification post-synchro
    console.log(`[SYNC] 🔍 Vérification des catégories après synchronisation`);
    const updatedCategories = await Category.findAll();

    const mapped = updatedCategories
      .filter((c) => categoryIds.includes(c._id) && c.woo_id)
      .map((c) => {
        console.log(`[SYNC] ✅ Catégorie ${c.name} synchronisée avec woo_id ${c.woo_id}`);
        return { id: parseInt(c.woo_id) };
      });

    const stillMissing = updatedCategories.filter((c) => categoryIds.includes(c._id) && !c.woo_id);

    if (stillMissing.length > 0) {
      console.error(
        `[SYNC] ❌ Catégories toujours non synchronisées:`,
        stillMissing.map((c) => `${c.name} (${c._id}, parent: ${c.parent_id || 'aucun'})`)
      );

      // Synchroniser une dernière fois les catégories manquantes, même si ça risque d'échouer
      console.log(`[SYNC] 🔄 Tentative finale pour ${stillMissing.length} catégorie(s)`);
      for (const cat of stillMissing) {
        // Synchroniser manuellement le parent d'abord si nécessaire
        if (cat.parent_id) {
          const parent = updatedCategories.find((p) => p._id === cat.parent_id);
          if (parent && !parent.woo_id) {
            console.log(`[SYNC] 🔄 Tentative finale pour le parent ${parent.name} (${parent._id})`);
            try {
              await categoryService.syncToWooCommerce(parent);
            } catch (error) {
              console.error(`[SYNC] ❌ Échec synchro parent ${parent.name}: ${error.message}`);
            }
          }
        }

        console.log(`[SYNC] 🔄 Tentative finale pour ${cat.name} (${cat._id})`);
        try {
          await categoryService.syncToWooCommerce(cat);
        } catch (error) {
          console.error(`[SYNC] ❌ Échec synchro finale ${cat.name}: ${error.message}`);
        }
      }

      // Vérifier une dernière fois
      const finalCategories = await Category.findAll();
      const finalMapped = finalCategories
        .filter((c) => categoryIds.includes(c._id) && c.woo_id)
        .map((c) => ({ id: parseInt(c.woo_id) }));

      if (finalMapped.length > 0) {
        console.log(`[SYNC] ✅ Après tentative finale, catégories synchronisées:`, finalMapped);
        return finalMapped;
      }

      // Si on arrive ici, c'est qu'on n'a toujours pas réussi à synchroniser les catégories
      console.error(
        `[SYNC] ❌ Impossible de synchroniser les catégories, fallback sur catégorie par défaut`
      );
    } else if (mapped.length > 0) {
      console.log(`[SYNC] ✅ Toutes les catégories sont synchronisées:`, mapped);
    } else {
      console.log(
        `[SYNC] ⚠️ Aucune catégorie à associer au produit, fallback sur catégorie par défaut`
      );
    }

    // ✅ WooCommerce exige au moins une catégorie : fallback si nécessaire
    return mapped.length > 0 ? mapped : [{ id: 1 }]; // ID 1 = catégorie par défaut Woo
  }

  async _prepareBrandData(brandId) {
    const brand = await Brand.findById(brandId);
    if (!brand) return null;

    if (!brand.woo_id) {
      await brandService.syncToWooCommerce([brand]);
    }

    const updated = await Brand.findById(brandId);
    return updated?.woo_id ? [{ id: parseInt(updated.woo_id) }] : null;
  }

  _prepareImageData(product) {
    const images = [];
    const processedIds = new Set();

    // Ajouter l'image principale si elle existe et a un wp_id
    if (product.image?.wp_id) {
      images.push({
        id: parseInt(product.image.wp_id),
        src: product.image.url || product.image.src,
        position: 0,
        alt: product.name,
      });
      processedIds.add(product.image.wp_id);
      console.log(`[SYNC] 📸 Image principale ajoutée (wp_id: ${product.image.wp_id})`);
    }

    // Ajouter TOUTES les images de la galerie avec wp_id
    if (product.gallery_images?.length) {
      let addedCount = 0;

      const gallery = product.gallery_images
        .filter((img) => img.wp_id && !processedIds.has(img.wp_id))
        .map((img, i) => {
          processedIds.add(img.wp_id);
          addedCount++;
          return {
            id: parseInt(img.wp_id),
            src: img.url || img.src,
            position: i + 1,
            alt: `${product.name} - ${i + 1}`,
          };
        });

      images.push(...gallery);
      console.log(`[SYNC] 🖼️  ${addedCount} images de galerie ajoutées`);
    }

    console.log(`[SYNC] 📊 Total: ${images.length} images préparées pour WooCommerce`);
    return images;
  }

  _normalizeStockStatus(status) {
    const statusMap = {
      // Formats français
      en_stock: 'instock',
      'en stock': 'instock',
      disponible: 'instock',

      sur_commande: 'outofstock', // ✅ outofstock = Sur commande
      'sur commande': 'outofstock',

      reapprovisionnement: 'onbackorder', // ✅ onbackorder = En réappro
      en_reapprovisionnement: 'onbackorder',
      'en réapprovisionnement': 'onbackorder',
      réappro: 'onbackorder',

      // Formats WooCommerce
      instock: 'instock',
      outofstock: 'outofstock',
      onbackorder: 'onbackorder',

      // Alias
      available: 'instock',
      unavailable: 'onbackorder',
      backorder: 'onbackorder',
    };

    const normalized = statusMap[status?.toLowerCase()] || 'instock';

    if (normalized !== status) {
      console.log(`[SYNC] 🔄 stock_status normalisé: "${status}" → "${normalized}"`);
    }

    return normalized;
  }

  async syncToWooCommerce(product, client, results = { created: 0, updated: 0, errors: [] }) {
    try {
      const updatedProduct = await this._syncPendingImages(product);
      const wcData = await this._mapLocalToWooCommerce(updatedProduct);

      let response;
      if (updatedProduct.woo_id) {
        response = await client.put(`${this.endpoint}/${updatedProduct.woo_id}`, wcData);
        await this._updateLocal(updatedProduct._id, response.data);
        results.updated++;
      } else {
        response = await client.post(this.endpoint, wcData);
        await Product.update(updatedProduct._id, { woo_id: response.data.id });
        await client.put(`${this.endpoint}/${response.data.id}`, { images: wcData.images });
        await this._updateLocal(updatedProduct._id, response.data);
        results.created++;
      }

      return { success: true, product: await Product.findById(updatedProduct._id), results };
    } catch (error) {
      results.errors.push({ product_id: product._id, error: error.message });
      return { success: false, error, results };
    }
  }

  async _syncPendingImages(product) {
    const wpSync = new WordPressImageSync();
    let hasChanges = false;

    // ========================================
    // UPLOAD DE L'IMAGE PRINCIPALE
    // ========================================
    let mainImage = product.image;

    if (mainImage && !mainImage.wp_id && (mainImage.src || mainImage.local_path)) {
      try {
        const pathToUpload = mainImage.src || mainImage.local_path;
        console.log(`[SYNC] 📤 Upload image principale vers WordPress: ${pathToUpload}`);

        const wpData = await wpSync.uploadToWordPress(pathToUpload);

        mainImage = {
          ...mainImage,
          wp_id: wpData.id,
          url: wpData.url,
          status: 'active',
        };
        hasChanges = true;
        console.log(`[SYNC] ✅ Image principale uploadée (wp_id: ${wpData.id})`);
      } catch (error) {
        console.error(`[SYNC] ❌ Erreur upload image principale:`, error.message);
      }
    }

    // ========================================
    // UPLOAD DE TOUTE LA GALERIE
    // ========================================
    const updatedGallery = [...(product.gallery_images || [])];
    const processedPaths = new Map();

    // Si l'image principale a un path, le marquer comme déjà traité
    if (mainImage?.src || mainImage?.local_path) {
      const mainPath = mainImage.src || mainImage.local_path;
      if (mainImage.wp_id) {
        processedPaths.set(mainPath, { wp_id: mainImage.wp_id, url: mainImage.url });
      }
    }

    console.log(`[SYNC] 🖼️  Traitement de ${updatedGallery.length} images de galerie`);

    for (let i = 0; i < updatedGallery.length; i++) {
      const img = updatedGallery[i];

      // Si l'image n'a pas de wp_id et a un chemin local
      if (!img.wp_id && (img.src || img.local_path)) {
        try {
          const pathToUpload = img.src || img.local_path;

          // Vérifier si cette image a déjà été uploadée dans cette session
          if (processedPaths.has(pathToUpload)) {
            const existingUpload = processedPaths.get(pathToUpload);
            updatedGallery[i] = {
              ...img,
              wp_id: existingUpload.wp_id,
              url: existingUpload.url,
              status: 'active',
            };
            console.log(
              `[SYNC] 🔄 Image ${i} réutilisée depuis cache (wp_id: ${existingUpload.wp_id})`
            );
          } else {
            // Upload vers WordPress
            console.log(`[SYNC] 📤 Upload image galerie ${i} vers WordPress: ${pathToUpload}`);
            const wpData = await wpSync.uploadToWordPress(pathToUpload);

            updatedGallery[i] = {
              ...img,
              wp_id: wpData.id,
              url: wpData.url,
              status: 'active',
            };

            processedPaths.set(pathToUpload, { wp_id: wpData.id, url: wpData.url });
            hasChanges = true;
            console.log(`[SYNC] ✅ Image ${i} uploadée (wp_id: ${wpData.id})`);
          }
        } catch (error) {
          console.error(`[SYNC] ❌ Erreur upload image galerie ${i}:`, error.message);
        }
      } else if (img.wp_id) {
        console.log(`[SYNC] ✓ Image ${i} déjà synchronisée (wp_id: ${img.wp_id})`);
      }
    }

    // ========================================
    // SAUVEGARDER UNIQUEMENT SI DES CHANGEMENTS ONT ÉTÉ FAITS
    // ========================================
    if (hasChanges) {
      await Product.update(product._id, {
        image: mainImage,
        gallery_images: updatedGallery,
      });
      console.log(`[SYNC] 💾 Images sauvegardées en base de données`);
    }

    // Recharger le produit avec les images mises à jour
    return await Product.findById(product._id);
  }

  async _updateLocal(productId, wcData) {
    const product = await Product.findById(productId);

    // Gestion de l'image principale (code existant)
    const mainImageFromWoo = wcData.images?.[0];
    let image = product.image;

    if (mainImageFromWoo) {
      image = {
        _id: product.image?._id || uuidv4(),
        wp_id: mainImageFromWoo.id,
        url: mainImageFromWoo.src,
        status: 'active',
        src: product.image?.src || mainImageFromWoo.src,
        local_path: product.image?.local_path || null,
        type: product.image?.type || null,
        metadata: product.image?.metadata || null,
      };
    }

    // Gestion de la galerie (code existant)
    let gallery = [...(product.gallery_images || [])];

    if (wcData.images && wcData.images.length > 0) {
      for (const wcImg of wcData.images) {
        const localImgIndex = gallery.findIndex(
          (img) => img.wp_id && img.wp_id.toString() === wcImg.id.toString()
        );

        if (localImgIndex !== -1) {
          gallery[localImgIndex] = {
            ...gallery[localImgIndex],
            wp_id: wcImg.id,
            url: wcImg.src,
            status: 'active',
          };
        } else if (wcImg.id.toString() !== mainImageFromWoo?.id.toString()) {
          gallery.push({
            _id: uuidv4(),
            wp_id: wcImg.id,
            url: wcImg.src,
            src: wcImg.src,
            status: 'active',
          });
        }
      }
    }

    // Normaliser manage_stock depuis WooCommerce
    const manageStock = wcData.manage_stock === true || wcData.manage_stock === 'yes';

    // ✅ NOUVEAU: Récupérer stock_status depuis WooCommerce
    const stockStatus = wcData.stock_status || 'instock';

    console.log(
      `[SYNC] 📦 manage_stock depuis WooCommerce: ${wcData.manage_stock} → normalisé: ${manageStock}`
    );
    console.log(`[SYNC] 🏷️  stock_status depuis WooCommerce: ${stockStatus}`);

    // 🔥 CORRECTION CRITIQUE : Préparer les données de mise à jour
    const updateData = {
      woo_id: wcData.id,
      website_url: wcData.permalink || null,
      last_sync: new Date(),
      image,
      gallery_images: gallery,
      pending_sync: false,
      manage_stock: manageStock,
      stock_status: stockStatus,
    };

    // ✅ NE mettre à jour le stock QUE si manage_stock est true (mode automatique)
    if (manageStock) {
      updateData.stock = wcData.stock_quantity || 0;
      console.log(`[SYNC] 📊 Stock automatique mis à jour: ${updateData.stock}`);
    } else {
      // En mode manuel, garder le stock local actuel
      console.log(`[SYNC] 📊 Stock manuel conservé: ${product.stock}`);
    }

    // Mise à jour du produit
    await Product.update(productId, updateData);

    console.log(`[SYNC] ✅ Produit ${productId} mis à jour localement`);
    console.log(`[SYNC] 📸 Image principale: ${image ? 'présente' : 'absente'}`);
    console.log(`[SYNC] 🖼️  Galerie: ${gallery.length} images synchronisées`);
    console.log(`[SYNC] 📦 Gestion stock: ${manageStock ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
    console.log(`[SYNC] 🏷️  Statut stock: ${stockStatus}`);
  }

  async handleFullSync(client, results = { created: 0, updated: 0, deleted: 0, errors: [] }) {
    const [local, wc] = await Promise.all([
      Product.findAll(),
      client.get(this.endpoint, { per_page: 100 }),
    ]);

    await this._deleteNonExistent(wc.data, local, client, results);

    for (const product of local) {
      await this.syncToWooCommerce(product, client, results);
    }

    return results;
  }

  async _deleteNonExistent(wcItems, localItems, client, results) {
    for (const item of wcItems) {
      if (!localItems.some((p) => p.woo_id === item.id)) {
        try {
          if (item.images?.length) {
            for (const img of item.images) await client.deleteMedia(img.id);
          }
          await client.delete(`${this.endpoint}/${item.id}`, { force: true });
          results.deleted++;
        } catch (e) {
          results.errors.push({ product_id: item.id, error: `Erreur suppression: ${e.message}` });
        }
      }
    }
  }
}

module.exports = ProductSyncStrategy;
