const SyncStrategy = require('../base/SyncStrategy');
const Category = require('../../models/Category');
const WooCommerceClient = require('../base/WooCommerceClient');
const WordPressImageSync = require('../image/WordPressImageSync');

class CategorySyncStrategy extends SyncStrategy {
  constructor() {
    super('products/categories');
  }

  async _mapLocalToWooCommerce(category) {
    let parentWooId = 0;

    // Gérer la hiérarchie
    if (category.parent_id) {
      const parent = await Category.findById(category.parent_id);
      if (parent?.woo_id) {
        parentWooId = parent.woo_id;
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

    // Image WordPress
    let oldImageWpId = null;

    if (category.woo_id) {
      try {
        const client = new WooCommerceClient();
        const response = await client.get(`${this.endpoint}/${category.woo_id}`);
        oldImageWpId = response.data?.image?.id || null;
      } catch (e) {
        console.warn(`[WC] Erreur récupération image catégorie ${category._id}:`, e.message);
      }
    }

    if (category.image && !category.image.wp_id && category.image.local_path) {
      try {
        const wpSync = new WordPressImageSync();
        const wpData = await wpSync.uploadToWordPress(category.image.local_path);

        await Category.update(category._id, {
          image: { ...category.image, wp_id: wpData.id, url: wpData.url },
        });

        wcData.image = {
          id: wpData.id,
          src: wpData.url,
          alt: category.name,
        };

        if (oldImageWpId && wpData.id !== oldImageWpId) {
          const client = new WooCommerceClient();
          await client.deleteMedia(oldImageWpId);
        }
      } catch (error) {
        console.error(`[WC] Upload image échoué pour catégorie ${category._id}:`, error.message);
      }
    } else if (category.image?.wp_id) {
      wcData.image = {
        id: parseInt(category.image.wp_id),
        src: category.image.url,
        alt: category.name,
      };
    }

    return wcData;
  }

  async syncToWooCommerce(category, client, results = { created: 0, updated: 0, errors: [] }) {
    try {
      const wcData = await this._mapLocalToWooCommerce(category);
      let response;

      if (category.woo_id) {
        response = await client.put(`${this.endpoint}/${category.woo_id}`, wcData);
        results.updated++;
      } else {
        response = await client.post(this.endpoint, wcData);
        await Category.update(category._id, { woo_id: response.data.id });
        results.created++;
      }

      await this._updateLocalCategory(category._id, response.data);
      return { success: true, category, results };
    } catch (error) {
      results.errors.push({ category_id: category._id, error: error.message });
      return { success: false, error, results };
    }
  }

  async _updateLocalCategory(categoryId, wcData) {
    const current = await Category.findById(categoryId);
    const update = {
      woo_id: wcData.id,
      last_sync: new Date(),
      pending_sync: false,
    };

    if (wcData.image) {
      update.image = {
        ...current.image,
        wp_id: wcData.image.id,
        url: wcData.image.src,
      };
    }

    await Category.update(categoryId, update);
  }

  async handleFullSync(client, results = { created: 0, updated: 0, deleted: 0, errors: [] }) {
    const [local, remote] = await Promise.all([
      Category.findAll(),
      client.get(this.endpoint, { per_page: 100 }),
    ]);

    await this._deleteNonExistent(local, remote.data, client, results);

    const sorted = this._sortCategoriesByLevel(local);

    return this.syncEntityList(
      sorted,
      Category,
      client,
      null, // Aucun eventService en fullSync
      results,
      'category'
    );
  }

  _sortCategoriesByLevel(categories) {
    return categories.sort((a, b) => {
      const levelA = a.level || (a.parent_id ? 1 : 0);
      const levelB = b.level || (b.parent_id ? 1 : 0);
      return levelA - levelB;
    });
  }

  async _deleteNonExistent(localList, wcList, client, results) {
    for (const wcItem of wcList) {
      if (!localList.some((cat) => cat.woo_id === wcItem.id)) {
        try {
          if (wcItem.image?.id) await client.deleteMedia(wcItem.image.id);
          await client.delete(`${this.endpoint}/${wcItem.id}`, { force: true });
          results.deleted++;
        } catch (err) {
          results.errors.push({ category_id: wcItem.id, error: err.message });
        }
      }
    }
  }

  async validateDeletion(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) throw new Error('Catégorie non trouvée');

    const children = (await Category.findAll()).filter((c) => c.parent_id === categoryId);
    if (children.length > 0) {
      throw new Error(
        `Impossible de supprimer la catégorie : ${children.length} sous-catégorie(s) existante(s)`
      );
    }

    const Product = require('../../models/Product');
    const allProducts = await Product.findAll();
    const linked = allProducts.filter(
      (p) =>
        (p.categories && p.categories.includes(categoryId)) ||
        (p.category_id && p.category_id === categoryId)
    );

    if (linked.length > 0) {
      throw new Error(`Impossible de supprimer : ${linked.length} produit(s) lié(s)`);
    }

    return true;
  }
}

module.exports = CategorySyncStrategy;
