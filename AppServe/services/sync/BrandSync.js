const SyncStrategy = require('../base/SyncStrategy');
const Brand = require('../../models/Brand');
const WooCommerceClient = require('../base/WooCommerceClient');
const WordPressImageSync = require('../image/WordPressImageSync');

class BrandSyncStrategy extends SyncStrategy {
  constructor() {
    super('products/brands');
  }

  async _mapLocalToWooCommerce(brand) {
    const wcData = {
      name: brand.name,
      description: brand.description || '',
      slug: brand.slug || this._generateSlug(brand.name),
    };

    // Récupérer l'image actuelle depuis Woo si existante
    let oldImageWpId = null;
    if (brand.woo_id) {
      try {
        const client = new WooCommerceClient();
        const response = await client.get(`${this.endpoint}/${brand.woo_id}`);
        oldImageWpId = response.data?.image?.id || null;
      } catch (e) {
        console.warn(`[WC] Échec récupération image de marque ${brand._id}:`, e.message);
      }
    }

    // ✅ MODIFIÉ : Upload image locale si pas de wp_id - utiliser src en priorité
    if (brand.image && !brand.image.wp_id && (brand.image.src || brand.image.local_path)) {
      try {
        const wpSync = new WordPressImageSync();
        // Priorité à src qui est stable entre environnements
        const pathToUpload = brand.image.src || brand.image.local_path;
        const wpData = await wpSync.uploadToWordPress(pathToUpload);

        await Brand.update(brand._id, {
          image: { ...brand.image, wp_id: wpData.id, url: wpData.url },
        });

        wcData.image = {
          id: wpData.id,
          src: wpData.url,
          alt: brand.name,
        };

        if (oldImageWpId && wpData.id !== oldImageWpId) {
          const client = new WooCommerceClient();
          await client.deleteMedia(oldImageWpId);
        }
      } catch (error) {
        console.error(`[WC] Upload image échoué pour ${brand._id}:`, error.message);
      }
    } else if (brand.image?.wp_id) {
      wcData.image = {
        id: parseInt(brand.image.wp_id),
        src: brand.image.url,
        alt: brand.name,
      };
    }

    return wcData;
  }

  async syncToWooCommerce(brand, client, results = { created: 0, updated: 0, errors: [] }) {
    try {
      const wcData = await this._mapLocalToWooCommerce(brand);
      let response;

      if (brand.woo_id) {
        response = await client.put(`${this.endpoint}/${brand.woo_id}`, wcData);
        results.updated++;
      } else {
        response = await client.post(this.endpoint, wcData);
        await Brand.update(brand._id, { woo_id: response.data.id });
        results.created++;
      }

      await Brand.update(brand._id, {
        last_sync: new Date(),
        pending_sync: false,
        ...(response.data.image && {
          image: {
            ...brand.image,
            woo_id: response.data.image.id,
          },
        }),
      });

      return { success: true, brand, results };
    } catch (error) {
      return {
        success: false,
        error,
        results,
      };
    }
  }

  async handleFullSync(client, results = { created: 0, updated: 0, deleted: 0, errors: [] }) {
    const [localBrands, wcResponse] = await Promise.all([
      Brand.findAll(),
      client.get(this.endpoint, { per_page: 100 }),
    ]);

    await this._deleteNonExistent(localBrands, wcResponse.data, client, results);

    return this.syncEntityList(
      localBrands,
      Brand,
      client,
      null, // Pas d’eventService pour fullSync ?
      results,
      'brand'
    );
  }

  async _deleteNonExistent(localList, wcList, client, results) {
    for (const wcItem of wcList) {
      if (!localList.some((l) => l.woo_id === wcItem.id)) {
        try {
          if (wcItem.image?.id) await client.deleteMedia(wcItem.image.id);
          await client.delete(`${this.endpoint}/${wcItem.id}`, { force: true });
          results.deleted++;
        } catch (err) {
          results.errors.push({ brand_id: wcItem.id, error: err.message });
        }
      }
    }
  }

  _generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

module.exports = BrandSyncStrategy;
