// services/sync/CategorySync.js
const SyncStrategy = require('../base/SyncStrategy');
const Category = require('../../models/Category');

class CategorySyncStrategy extends SyncStrategy {
  constructor() {
    super('products/categories');
  }

  async _mapLocalToWooCommerce(category) {
    // Récupérer le woo_id du parent si parent_id existe
    let parentWooId = 0;
    if (category.parent_id) {
      const parentCategory = await Category.findById(category.parent_id);
      if (parentCategory?.woo_id) {
        parentWooId = parentCategory.woo_id;
      } else {
        throw new Error(
          `La catégorie parente ${category.parent_id} n'est pas synchronisée avec WooCommerce`
        );
      }
    }

    const wcData = {
      name: category.name,
      description: category.description || '',
      parent: parentWooId,
    };

    // Sauvegarde de l'ancien ID d'image WordPress pour suppression si nécessaire
    let oldImageWpId = null;
    const WooCommerceClient = require('../base/WooCommerceClient');

    // Vérifier si la catégorie a déjà une image dans WooCommerce
    if (category.woo_id) {
      try {
        // Tentative de récupération des données actuelles de la catégorie sur WooCommerce
        const client = new WooCommerceClient();
        const response = await client.get(`products/categories/${category.woo_id}`);
        if (response.data && response.data.image && response.data.image.id) {
          oldImageWpId = response.data.image.id;
          console.log(
            `[WS-DEBUG] Image WooCommerce existante trouvée pour catégorie ${category._id}: wp_id=${oldImageWpId}`
          );
        }
      } catch (error) {
        console.error(
          `[WS-DEBUG] Erreur récupération données WooCommerce pour catégorie ${category._id}:`,
          error.message
        );
        // Continuer malgré l'erreur
      }
    }

    // Ajout de l'image si présente
    if (category.image?.wp_id) {
      wcData.image = {
        id: parseInt(category.image.wp_id),
        src: category.image.url,
        alt: category.name,
      };

      // Si l'ID de l'image a changé, supprimer l'ancienne image
      if (oldImageWpId && parseInt(category.image.wp_id) !== oldImageWpId) {
        console.log(
          `[WS-DEBUG] Changement d'image détecté: ancien=${oldImageWpId}, nouveau=${category.image.wp_id}`
        );

        try {
          const client = new WooCommerceClient();
          await client.deleteMedia(oldImageWpId);
          console.log(`[WS-DEBUG] Ancienne image WP media supprimée: ${oldImageWpId}`);
        } catch (delError) {
          console.error(
            `[WS-DEBUG] Erreur lors de la suppression de l'ancienne image:`,
            delError.message
          );
        }
      }
    } else if (category.image && !category.image.wp_id && category.image.local_path) {
      // Si l'image existe localement mais n'a pas d'ID WordPress, on tente de la téléverser
      try {
        console.log(
          `[WS-DEBUG] Image existante sans wp_id, tentative de téléversement pour catégorie ${category._id}`
        );
        const WordPressImageSync = require('../../services/image/WordPressImageSync');
        const wpSync = new WordPressImageSync();
        const wpData = await wpSync.uploadToWordPress(category.image.local_path);

        // Mise à jour de l'image avec les données WordPress
        await Category.update(category._id, {
          image: {
            ...category.image,
            wp_id: wpData.id,
            url: wpData.url,
          },
        });

        wcData.image = {
          id: parseInt(wpData.id),
          src: wpData.url,
          alt: category.name,
        };

        console.log(
          `[WS-DEBUG] Image téléversée avec succès pour catégorie ${category._id}, wp_id: ${wpData.id}`
        );

        // Si une ancienne image existe, on la supprimera après le succès de la mise à jour
        if (oldImageWpId && parseInt(wpData.id) !== oldImageWpId) {
          try {
            const client = new WooCommerceClient();
            await client.deleteMedia(oldImageWpId);
            console.log(`[WS-DEBUG] Ancienne image WP media supprimée: ${oldImageWpId}`);
          } catch (delError) {
            console.error(
              `[WS-DEBUG] Erreur lors de la suppression de l'ancienne image:`,
              delError.message
            );
          }
        }
      } catch (error) {
        console.error(
          `[WS-DEBUG] Erreur lors du téléversement de l'image pour catégorie ${category._id}:`,
          error.message
        );
      }
    } else if (oldImageWpId && !category.image) {
      // Si la catégorie n'a plus d'image mais en avait une avant, on la supprime
      console.log(
        `[WS-DEBUG] Suppression de l'image pour catégorie ${category._id} car plus d'image associée`
      );
      wcData.image = null;

      try {
        const client = new WooCommerceClient();
        await client.deleteMedia(oldImageWpId);
        console.log(`[WS-DEBUG] Ancienne image WP media supprimée: ${oldImageWpId}`);
      } catch (delError) {
        console.error(
          `[WS-DEBUG] Erreur lors de la suppression de l'ancienne image:`,
          delError.message
        );
      }
    }

    return wcData;
  }

  _mapWooCommerceToLocal(wcCategory) {
    return {
      name: wcCategory.name,
      description: wcCategory.description,
      woo_id: wcCategory.id,
      parent_id: wcCategory.parent || null,
      slug: wcCategory.slug,
    };
  }

  async syncToWooCommerce(category, client, results = { created: 0, updated: 0, errors: [] }) {
    try {
      const wcData = await this._mapLocalToWooCommerce(category);

      let response;
      if (category.woo_id) {
        try {
          // Tentative standard de mise à jour
          response = await client.put(`${this.endpoint}/${category.woo_id}`, wcData);
        } catch (error) {
          // Si l'erreur est term_exists et qu'on a une image
          if (error.response?.data?.code === 'term_exists' && wcData.image) {
            console.log(
              `Erreur term_exists - Mise à jour de l'image uniquement pour la catégorie ${category._id}`
            );

            // Ne mettre à jour que l'image
            response = await client.put(`${this.endpoint}/${category.woo_id}`, {
              image: wcData.image,
            });
          } else {
            throw error;
          }
        }

        await this._updateLocalCategory(category._id, response.data);
        results.updated++;
      } else {
        response = await client.post(this.endpoint, wcData);
        await this._updateLocalCategory(category._id, response.data);
        results.created++;
      }

      return { success: true, category: await Category.findById(category._id), results };
    } catch (error) {
      console.error(`Erreur synchronisation catégorie ${category._id}:`, error.message);
      results.errors.push({
        category_id: category._id,
        error: error.message,
      });
      return { success: false, error, results };
    }
  }

  async _updateLocalCategory(categoryId, wcData) {
    const updateData = {
      woo_id: wcData.id,
      last_sync: new Date(),
    };

    // Mise à jour de l'image si présente
    if (wcData.image) {
      updateData.image = {
        wp_id: wcData.image.id,
        url: wcData.image.src,
      };
    }

    await Category.update(categoryId, updateData);
  }

  async handleFullSync(client, results = { created: 0, updated: 0, deleted: 0, errors: [] }) {
    try {
      const [localCategories, wcResponse] = await Promise.all([
        Category.findAll(),
        client.get(this.endpoint, { per_page: 100 }),
      ]);

      await this._deleteNonExistentCategories(wcResponse.data, localCategories, client, results);

      // Trier les catégories par niveau pour synchroniser les parents d'abord
      const sortedCategories = this._sortCategoriesByLevel(localCategories);

      for (const category of sortedCategories) {
        await this.syncToWooCommerce(category, client, results);
      }

      return results;
    } catch (error) {
      results.errors.push({
        error: error.message,
      });
      return results;
    }
  }

  _sortCategoriesByLevel(categories) {
    // Trier les catégories par niveau (parents en premier)
    return categories.sort((a, b) => {
      const levelA = a.level || (a.parent_id ? 1 : 0);
      const levelB = b.level || (b.parent_id ? 1 : 0);
      return levelA - levelB;
    });
  }

  async _deleteNonExistentCategories(wcCategories, localCategories, client, results) {
    for (const wcCategory of wcCategories) {
      if (!localCategories.some((cat) => cat.woo_id === wcCategory.id)) {
        try {
          if (wcCategory.image?.id) {
            await client.deleteMedia(wcCategory.image.id);
          }
          await client.delete(`${this.endpoint}/${wcCategory.id}`, { force: true });
          results.deleted++;
        } catch (error) {
          results.errors.push({
            category_id: wcCategory.id,
            error: `Erreur suppression WC: ${error.message}`,
          });
        }
      }
    }
  }

  async validateDeletion(categoryId) {
    // Vérifier les sous-catégories
    const category = await Category.findById(categoryId);
    if (!category) throw new Error('Catégorie non trouvée');

    if (category.level === 0) {
      const allCategories = await Category.findAll();
      const children = allCategories.filter((cat) => cat.parent_id === categoryId);
      if (children.length > 0) {
        throw new Error(
          `Impossible de supprimer la catégorie : ${children.length} sous-catégorie(s) existante(s)`
        );
      }
    }

    // Vérifier les produits liés
    const Product = require('../../models/Product');
    const allProducts = await Product.findAll();
    const linkedProducts = allProducts.filter(
      (product) =>
        (product.categories?.length > 0 && product.categories.includes(categoryId)) ||
        (product.category_id && product.category_id === categoryId)
    );

    if (linkedProducts.length > 0) {
      throw new Error(
        `Impossible de supprimer la catégorie : ${linkedProducts.length} produit(s) lié(s)`
      );
    }

    return true;
  }
}

module.exports = CategorySyncStrategy;
