// services/BrandWooCommerceService.js
const BaseWooCommerceService = require('./base/BaseWooCommerceService');
const Brand = require('../models/Brand');

class BrandWooCommerceService extends BaseWooCommerceService {
  constructor() {
    super('');
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
    if (!brand || !brand.name) {
      throw new Error('Invalid brand data');
    }

    return {
      name: brand.name,
      description: brand.description || '',
      slug: brand.slug || this._generateSlug(brand.name),
      meta_data: brand.meta_data || [],
    };
  }

  _generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async syncToWooCommerce(input) {
    const results = { created: 0, updated: 0, errors: [] };
    try {
      const brandData = input[0];

      const response = await this.wcApi.post('products/brands', {
        name: brandData.name,
        taxonomy: 'product_brand',
      });

      if (response.data) {
        results.created++;
      }
    } catch (error) {
      console.log(error.response?.data || error);
      results.errors.push(error.message);
    }
    return results;
  }

  async _handleSpecificSync(input, results) {
    const brands = Array.isArray(input) ? input : [await Brand.findById(input)];
    for (const brand of brands) {
      if (!brand) continue;
      await this._syncBrandToWC(brand, results).catch((error) => {
        results.errors.push({ brand_id: brand._id, error: error.message });
      });
    }
    return results;
  }

  async _handleFullSync(results) {
    const [localBrands, wcResponse] = await Promise.all([
      Brand.findAll(),
      this.wcApi.get(this.endpoint, { per_page: 100 }),
    ]);

    await this._deleteNonExistentBrands(wcResponse.data, localBrands, results);

    for (const brand of localBrands) {
      await this._syncBrandToWC(brand, results).catch((error) => {
        results.errors.push({ brand_id: brand._id, error: error.message });
      });
    }

    return results;
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
      // Attendre que les données de la marque soient chargées
      const brandData = await this.model.findById(brand._id);
      if (!brandData) {
        throw new Error('Brand not found');
      }

      const wcData = {
        name: brandData.name,
        description: brandData.description || '',
        slug: brandData.slug || brandData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        meta_data: brandData.meta_data || [],
      };

      if (brandData.woo_id) {
        await this.wcApi.put(`${this.endpoint}/${brandData.woo_id}`, wcData);
        results.updated++;
      } else {
        const response = await this.wcApi.post(this.endpoint, wcData);
        await this.model.update(brandData._id, { woo_id: response.data.id, last_sync: new Date() });
        results.created++;
      }
    } catch (error) {
      results.errors.push({ brand_id: brand._id, error: error.message });
    }
  }

  async deleteBrand(brandId) {
    const brand = await Brand.findById(brandId);
    if (!brand) throw new Error('Brand not found');

    if (brand.woo_id) {
      try {
        if (brand.image?.wp_id) await this.deleteMedia(brand.image.wp_id);
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
