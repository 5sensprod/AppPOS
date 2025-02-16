// services/CategoryWooCommerceService.js
const BaseWooCommerceService = require('./base/BaseWooCommerceService');
const Category = require('../models/Category');

class CategoryWooCommerceService extends BaseWooCommerceService {
  constructor() {
    super('products/categories');
  }

  _mapWooCommerceToLocal(wcCategory) {
    return {
      name: wcCategory.name,
      description: wcCategory.description,
      woo_id: wcCategory.id,
      parent_id: wcCategory.parent,
      slug: wcCategory.slug,
    };
  }

  _mapLocalToWooCommerce(category) {
    return {
      name: category.name,
      description: category.description || '',
      ...(category.image?.wp_id && {
        image: {
          id: parseInt(category.image.wp_id),
          src: category.image.url,
        },
      }),
    };
  }

  async syncToWooCommerce(input = null) {
    const results = { created: 0, updated: 0, deleted: 0, errors: [], pending: [] };
    return input ? this._handleSpecificSync(input, results) : this._handleFullSync(results);
  }

  async _handleSpecificSync(input, results) {
    try {
      if (Array.isArray(input)) {
        for (const category of input) {
          await this._syncCategoryToWC(category, results);
        }
        return results;
      }

      // Si input est un objet catégorie complet
      if (typeof input === 'object' && input._id) {
        await this._syncCategoryToWC(input, results);
        return results;
      }

      // Si input est un ID
      const category = await Category.findById(input);
      if (!category) throw new Error('Catégorie non trouvée');

      await this._syncCategoryToWC(category, results);
      return results;
    } catch (error) {
      results.errors.push({
        category_id: typeof input === 'object' ? input._id : input,
        error: error.message,
      });
      return results;
    }
  }

  async _handleFullSync(results) {
    const [localCategories, wcResponse] = await Promise.all([
      Category.findAll(),
      this.wcApi.get(this.endpoint, { per_page: 100 }),
    ]);

    await this._deleteNonExistentCategories(wcResponse.data, localCategories, results);

    const nonParentCategories = localCategories.filter((c) => !c.parent_id);
    const parentCategories = localCategories.filter((c) => c.parent_id);

    for (const category of nonParentCategories) {
      await this._syncCategoryToWC(category, results).catch((error) => {
        results.errors.push({ category_id: category._id, error: error.message });
      });
    }

    for (const category of parentCategories) {
      const parent = localCategories.find((c) => c._id === category.parent_id);
      if (!parent?.woo_id) {
        results.pending.push(category._id);
        continue;
      }
      await this._syncCategoryToWC(category, results).catch((error) => {
        results.errors.push({ category_id: category._id, error: error.message });
      });
    }

    return results;
  }

  async _deleteNonExistentCategories(wcCategories, localCategories, results) {
    for (const wcCategory of wcCategories) {
      if (!localCategories.some((cat) => cat.woo_id === wcCategory.id)) {
        try {
          if (wcCategory.image?.id) await this.deleteMedia(wcCategory.image.id);
          await this.wcApi.delete(`${this.endpoint}/${wcCategory.id}`, { force: true });
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

  async _syncCategoryToWC(category, results) {
    try {
      // Récupérer le woo_id du parent si parent_id existe
      let parentWooId = 0;
      if (category.parent_id) {
        const parentCategory = await Category.findById(category.parent_id);
        if (parentCategory?.woo_id) {
          parentWooId = parentCategory.woo_id;
        } else {
          throw new Error(`Parent category ${category.parent_id} not synced with WooCommerce`);
        }
      }

      const wcData = {
        name: category.name,
        description: category.description || '',
        parent: parentWooId,
      };

      if (category.image?.wp_id) {
        wcData.image = {
          id: parseInt(category.image.wp_id),
          src: category.image.url,
          alt: category.name,
        };
      }

      if (category.woo_id) {
        const response = await this.wcApi.put(`${this.endpoint}/${category.woo_id}`, wcData);
        await Category.update(category._id, { last_sync: new Date() });
        results.updated++;
      } else {
        const response = await this.wcApi.post(this.endpoint, wcData);
        await Category.update(category._id, {
          woo_id: response.data.id,
          last_sync: new Date(),
        });
        results.created++;
      }
    } catch (error) {
      console.error('WC Error:', error.response?.data || error.message);
      results.errors.push({
        category_id: category._id,
        error: error.message,
      });
    }
  }

  async deleteCategory(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) throw new Error('Category not found');

    // Vérifier les enfants pour les catégories parentes
    if (category.level === 0) {
      const allCategories = await Category.findAll();
      const children = allCategories.filter((cat) => cat.parent_id === categoryId);
      if (children.length > 0) {
        throw new Error(
          `Impossible de supprimer la catégorie dans WooCommerce : ${children.length} sous-catégorie(s) existante(s)`
        );
      }
    }

    // Vérifier les produits liés
    const Product = require('../models/Product');
    const allProducts = await Product.findAll();
    const linkedProducts = allProducts.filter(
      (product) =>
        (product.categories?.length > 0 && product.categories.includes(categoryId)) ||
        (product.category_id && product.category_id === categoryId)
    );

    if (linkedProducts.length > 0) {
      throw new Error(
        `Impossible de supprimer la catégorie dans WooCommerce : ${linkedProducts.length} produit(s) lié(s)`
      );
    }

    if (category.woo_id) {
      try {
        if (category.image?.wp_id) {
          await this.deleteMedia(category.image.wp_id);
        }
        await this.wcApi.delete(`${this.endpoint}/${category.woo_id}`, { force: true });
      } catch (error) {
        if (error.response?.status !== 404) throw error;
      }
    }

    await Category.delete(categoryId);
    return { success: true };
  }
}

module.exports = new CategoryWooCommerceService();
