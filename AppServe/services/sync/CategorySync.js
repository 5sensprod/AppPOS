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

    // Ajout de l'image si présente
    if (category.image?.wp_id) {
      wcData.image = {
        id: parseInt(category.image.wp_id),
        src: category.image.url,
        alt: category.name,
      };
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
        response = await client.put(`${this.endpoint}/${category.woo_id}`, wcData);
        await this._updateLocalCategory(category._id, response.data);
        results.updated++;
      } else {
        response = await client.post(this.endpoint, wcData);
        await this._updateLocalCategory(category._id, response.data);
        results.created++;
      }

      return { success: true, category: await Category.findById(category._id), results };
    } catch (error) {
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
