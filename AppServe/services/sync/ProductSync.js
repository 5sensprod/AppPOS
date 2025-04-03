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

    wcData.categories = await this._prepareCategoryData(product);

    if (product.brand_id) {
      wcData.brands = await this._prepareBrandData(product.brand_id);
    }

    wcData.images = this._prepareImageData(product);
    return wcData;
  }

  async _prepareCategoryData(product) {
    const categoryIds =
      product.categories?.length > 0
        ? product.categories
        : product.category_id
          ? [product.category_id]
          : [];

    const categories = await Category.findAll();
    const productCategories = categories.filter((c) => categoryIds.includes(c._id));
    const unsynced = productCategories.filter((c) => !c.woo_id);

    if (unsynced.length > 0) {
      await categoryService.syncToWooCommerce(unsynced);
    }

    const updated = await Category.findAll();
    return (
      updated
        .filter((c) => categoryIds.includes(c._id) && c.woo_id)
        .map((c) => ({ id: parseInt(c.woo_id) })) || [{ id: 1 }]
    );
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

    if (product.image?.wp_id) {
      images.push({
        id: parseInt(product.image.wp_id),
        src: product.image.url,
        position: 0,
        alt: product.name,
      });
    }

    if (product.gallery_images?.length) {
      const gallery = product.gallery_images
        .filter((img) => img.wp_id && (!product.image || img.wp_id !== product.image.wp_id))
        .map((img, i) => ({
          id: parseInt(img.wp_id),
          src: img.url,
          position: i + 1,
          alt: `${product.name} - ${i + 1}`,
        }));

      images.push(...gallery);
    }

    return images;
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
    const updated = [...(product.gallery_images || [])];

    for (let i = 0; i < updated.length; i++) {
      const img = updated[i];
      if (!img.wp_id && img.local_path) {
        const wp = await wpSync.uploadToWordPress(img.local_path);
        updated[i] = { ...img, wp_id: wp.id, url: wp.url, status: 'active' };
      }
    }

    let main = product.image;
    if (main && !main.wp_id && main.local_path) {
      const wp = await wpSync.uploadToWordPress(main.local_path);
      main = { ...main, wp_id: wp.id, url: wp.url, status: 'active' };
    }

    await Product.update(product._id, { gallery_images: updated, image: main });
    return await Product.findById(product._id);
  }

  async _updateLocal(productId, wcData) {
    const product = await Product.findById(productId);
    const mainImage = wcData.images?.[0];
    const image = mainImage
      ? {
          _id: product.image?._id || uuidv4(),
          wp_id: mainImage.id,
          url: mainImage.src,
          status: 'active',
        }
      : null;

    const gallery = (wcData.images || []).map((img, i) => ({
      _id: product.gallery_images?.[i]?._id || uuidv4(),
      wp_id: img.id,
      url: img.src,
      src: img.src,
      status: 'active',
    }));

    await Product.update(productId, {
      woo_id: wcData.id,
      website_url: wcData.permalink || null,
      last_sync: new Date(),
      image,
      gallery_images: gallery,
    });
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
