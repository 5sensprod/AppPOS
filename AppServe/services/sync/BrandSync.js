// services/sync/BrandSync.js
const SyncStrategy = require('../base/SyncStrategy');
const Brand = require('../../models/Brand');

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

    // Ajout de l'image si présente
    if (brand.image?.wp_id) {
      wcData.image = {
        id: parseInt(brand.image.wp_id),
        src: brand.image.url,
        alt: brand.name,
      };
    }

    return wcData;
  }

  async _mapLocalToWooCommerce(brand) {
    const wcData = {
      name: brand.name,
      description: brand.description || '',
      slug: brand.slug || this._generateSlug(brand.name),
    };

    // Correction du mapping des images
    if (brand.image?.wp_id) {
      wcData.image = {
        id: parseInt(brand.image.wp_id),
        src: brand.image.url,
        alt: brand.name,
      };
    }

    // Ajout des métadonnées si nécessaire
    if (brand.meta_data && brand.meta_data.length > 0) {
      wcData.meta_data = brand.meta_data;
    }

    return wcData;
  }

  _generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async syncToWooCommerce(brand, client, results = { created: 0, updated: 0, errors: [] }) {
    try {
      const wcData = await this._mapLocalToWooCommerce(brand);

      if (brand.woo_id) {
        // Mise à jour
        const response = await client.put(`${this.endpoint}/${brand.woo_id}`, wcData);
        await Brand.update(brand._id, {
          last_sync: new Date(),
          // Mettre à jour les données de l'image si nécessaire
          ...(response.data.image && {
            image: {
              ...brand.image,
              woo_id: response.data.image.id,
            },
          }),
        });
        results.updated++;
      } else {
        // Création
        const response = await client.post(this.endpoint, wcData);
        await Brand.update(brand._id, {
          woo_id: response.data.id,
          last_sync: new Date(),
          // Mettre à jour les données de l'image si nécessaire
          ...(response.data.image && {
            image: {
              ...brand.image,
              woo_id: response.data.image.id,
            },
          }),
        });
        results.created++;
      }

      return { success: true, brand, results };
    } catch (error) {
      console.error('Sync error:', error);
      results.errors.push({
        brand_id: brand._id,
        error: error.message,
      });
      return { success: false, error, results };
    }
  }

  async handleFullSync(client, results = { created: 0, updated: 0, deleted: 0, errors: [] }) {
    try {
      const [localBrands, wcResponse] = await Promise.all([
        Brand.findAll(),
        client.get(this.endpoint, { per_page: 100 }),
      ]);

      // Suppression des marques qui n'existent plus en local
      await this._deleteNonExistentBrands(wcResponse.data, localBrands, client, results);

      // Synchronisation des marques locales
      for (const brand of localBrands) {
        await this.syncToWooCommerce(brand, client, results);
      }

      return results;
    } catch (error) {
      results.errors.push({
        error: error.message,
      });
      return results;
    }
  }

  async _deleteNonExistentBrands(wcBrands, localBrands, client, results) {
    for (const wcBrand of wcBrands) {
      if (!localBrands.some((brand) => brand.woo_id === wcBrand.id)) {
        try {
          if (wcBrand.image?.id) {
            await client.deleteMedia(wcBrand.image.id);
          }
          await client.delete(`${this.endpoint}/${wcBrand.id}`, { force: true });
          results.deleted++;
        } catch (error) {
          results.errors.push({
            brand_id: wcBrand.id,
            error: `Erreur suppression WC: ${error.message}`,
          });
        }
      }
    }
  }
}

module.exports = BrandSyncStrategy;
