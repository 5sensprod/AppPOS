// services/BrandWooCommerceService.js
const BaseWooCommerceService = require('./base/BaseWooCommerceService');
const Brand = require('../models/Brand');

class BrandWooCommerceService extends BaseWooCommerceService {
  constructor() {
    super('products/brands');
  }
  _mapWooCommerceToLocal(wcBrand) {
    return {
      name: wcBrand.name,
      description: wcBrand.description,
      woo_id: wcBrand.id,
      slug: wcBrand.slug,
      supplier_id: wcBrand.supplier_id,
      meta_data: wcBrand.meta_data || [],
    };
  }

  _mapLocalToWooCommerce(brand) {
    return {
      name: brand.name,
      description: brand.description || '',
      slug: brand.slug || this._generateSlug(brand.name),
    };
  }

  _generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async syncToWooCommerce(input = null) {
    const results = { created: 0, updated: 0, deleted: 0, errors: [] };

    if (!input) {
      return this._handleFullSync(results);
    }

    const brand = Array.isArray(input) ? input[0] : input;
    if (!brand) return results;

    try {
      const wcData = this._mapLocalToWooCommerce(brand);

      if (brand.woo_id) {
        // Mise à jour
        await this.wcApi.put(`${this.endpoint}/${brand.woo_id}`, wcData);
        await Brand.update(brand._id, { last_sync: new Date() });
        results.updated++;
      } else {
        // Création
        const response = await this.wcApi.post(this.endpoint, wcData);
        await Brand.update(brand._id, {
          woo_id: response.data.id,
          last_sync: new Date(),
        });
        results.created++;
      }
    } catch (error) {
      console.error('WC Error:', error.response?.data || error.message);
      results.errors.push({
        brand_id: brand._id,
        error: error.response?.data?.message || error.message,
      });
    }

    return results;
  }

  async _handleSpecificSync(input, results) {
    try {
      const brand = typeof input === 'object' ? input : await Brand.findById(input);
      if (!brand) throw new Error('Brand not found');

      await this._syncBrandToWC(brand, results);
      return results;
    } catch (error) {
      results.errors.push({
        brand_id: typeof input === 'object' ? input._id : input,
        error: error.message,
      });
      return results;
    }
  }

  async _handleFullSync(results) {
    try {
      const [localBrands, wcResponse] = await Promise.all([
        Brand.findAll(),
        this.wcApi.get(this.endpoint, { per_page: 100 }),
      ]);

      await this._deleteNonExistentBrands(wcResponse.data, localBrands, results);

      for (const brand of localBrands) {
        await this.syncToWooCommerce(brand);
      }

      return results;
    } catch (error) {
      results.errors.push({
        error: error.message,
      });
      return results;
    }
  }

  async _deleteNonExistentBrands(wcBrands, localBrands, results) {
    for (const wcBrand of wcBrands) {
      if (!localBrands.some((brand) => brand.woo_id === wcBrand.id)) {
        try {
          if (wcBrand.image?.id) await this.deleteMedia(wcBrand.image.id);
          await this.wcApi.delete(`${this.endpoint}/${wcBrand.id}`, { force: true });
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

  async _syncBrandToWC(brand, results) {
    try {
      const wcData = {
        name: brand.name,
        description: brand.description || '',
        slug: brand.slug || this._generateSlug(brand.name),
      };

      if (brand.image?.wp_id) {
        wcData.image = {
          id: parseInt(brand.image.wp_id),
          src: brand.image.url,
          alt: brand.name,
        };
      }

      let response;
      if (brand.woo_id) {
        response = await this.wcApi.put(`${this.endpoint}/${brand.woo_id}`, wcData);
        await Brand.update(brand._id, {
          last_sync: new Date(),
        });
        results.updated++;
      } else {
        response = await this.wcApi.post(this.endpoint, wcData);
        await Brand.update(brand._id, {
          woo_id: response.data.id,
          last_sync: new Date(),
        });
        results.created++;
      }

      return response.data;
    } catch (error) {
      results.errors.push({
        brand_id: brand._id,
        error: error.message,
      });
      throw error;
    }
  }

  async deleteBrand(brandId) {
    const brand = await Brand.findById(brandId);
    if (!brand) throw new Error('Brand not found');

    if (brand.woo_id) {
      try {
        if (brand.image?.wp_id) {
          await this.deleteMedia(brand.image.wp_id);
        }
        await this.wcApi.delete(`${this.endpoint}/${brand.woo_id}`, { force: true });
      } catch (error) {
        if (error.response?.status !== 404) throw error;
      }
    }

    await Brand.delete(brandId);
    return { success: true };
  }
}

module.exports = new BrandWooCommerceService();
