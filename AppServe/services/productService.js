//AppServe\services\productService.js
const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const { getEntityEventService } = require('../services/events/entityEvents');
const brandService = require('./BrandWooCommerceService');

// ----- VALIDATION -----
async function validateCategories(categoryIds = [], { enforceWooSync = false } = {}) {
  if (!Array.isArray(categoryIds)) categoryIds = [categoryIds];
  if (categoryIds.length === 0) return true;

  const allCategories = await Category.findAll();
  const validCategories = allCategories.filter((cat) => categoryIds.includes(cat._id));

  if (validCategories.length !== categoryIds.length) {
    throw new Error("Certaines catégories spécifiées n'existent pas");
  }

  if (enforceWooSync) {
    const nonSynced = validCategories.filter((cat) => !cat.woo_id).map((cat) => cat._id);
    if (nonSynced.length > 0) {
      throw new Error(`Catégories non synchronisées avec WooCommerce: ${nonSynced.join(', ')}`);
    }
  }

  return validCategories;
}

async function validateBrand(brandId, { enforceWooSync = false } = {}) {
  if (!brandId) return;

  const brand = await Brand.findById(brandId);
  if (!brand) throw new Error("La marque spécifiée n'existe pas");

  if (enforceWooSync && !brand.woo_id) {
    throw new Error(`Marque non synchronisée avec WooCommerce: ${brand.name}`);
  }

  return brand;
}

// ----- COMPARATEURS / LOGIQUE DE CHANGEMENT -----
function categoriesChanged(oldCategories = [], newCategories = []) {
  const oldSorted = [...(oldCategories || [])].sort();
  const newSorted = [...(newCategories || [])].sort();
  return JSON.stringify(oldSorted) !== JSON.stringify(newSorted);
}

// ----- EVENTS / EFFETS -----
function notifyCategoryTreeChangedIfNeeded(changed = false) {
  if (changed) {
    const categoryEvents = getEntityEventService('categories');
    categoryEvents.categoryTreeChanged();
  }
}

// ----- COMPTEURS -----
async function updateBrandAndSupplierCount(oldBrandId, newBrandId, oldSupplierId, newSupplierId) {
  if (oldBrandId && oldBrandId !== newBrandId) {
    await Brand.updateProductCount(oldBrandId);
  }
  if (newBrandId && newBrandId !== oldBrandId) {
    await Brand.updateProductCount(newBrandId);
  }

  if (oldSupplierId && oldSupplierId !== newSupplierId) {
    await Supplier.updateProductCount(oldSupplierId);
  }
  if (newSupplierId && newSupplierId !== oldSupplierId) {
    await Supplier.updateProductCount(newSupplierId);
  }
}

// ----- MÉTHODES MÉTIER PRINCIPALES -----

async function createProduct(data) {
  const { categories = [], brand_id, supplier_id } = data;
  const productEvents = getEntityEventService('products');

  if (categories.length > 0) {
    await validateCategories(categories);
  }

  const newProduct = await Product.create({ ...data, categories });

  if (brand_id) {
    const brand = await validateBrand(brand_id);
    if (!brand.woo_id) {
      await brandService.syncToWooCommerce([brand]);
    }
    await Brand.updateProductCount(brand_id);
  }

  if (supplier_id) await Supplier.updateProductCount(supplier_id);

  notifyCategoryTreeChangedIfNeeded(categories.length > 0);
  productEvents.created(newProduct);

  return Product.findByIdWithCategoryInfo(newProduct._id);
}

async function updateProduct(id, updateData) {
  const existing = await Product.findById(id);
  if (!existing) throw new Error('Produit non trouvé');

  const oldBrand = existing.brand_id;
  const oldSupplier = existing.supplier_id;
  const oldCategories = existing.categories || [];

  let categories = oldCategories;
  let categoryChanged = false;

  if ('categories' in updateData) {
    categories = updateData.categories || [];
    if (categories.length > 0) await validateCategories(categories);
    categoryChanged = categoriesChanged(oldCategories, categories);
  }

  const payload = { ...updateData, categories };
  if (existing.woo_id) payload.pending_sync = true;

  const updated = await Product.updateWithCategoryInfo(id, payload);

  if (payload.brand_id) {
    const brand = await validateBrand(payload.brand_id);
    if (!brand.woo_id) {
      await brandService.syncToWooCommerce([brand]);
    }
  }

  await updateBrandAndSupplierCount(oldBrand, payload.brand_id, oldSupplier, payload.supplier_id);
  notifyCategoryTreeChangedIfNeeded(categoryChanged);

  getEntityEventService('products').updated(id, updated);
  return updated;
}

async function deleteProduct(product) {
  const { _id, brand_id, supplier_id } = product;
  const productEvents = getEntityEventService('products');

  if (brand_id) await Brand.updateProductCount(brand_id);
  if (supplier_id) await Supplier.updateProductCount(supplier_id);

  await Product.delete(_id);
  productEvents.deleted(_id);

  return { message: 'Produit supprimé avec succès' };
}

// ----- EXPORT -----
module.exports = {
  validateCategories,
  validateBrand,
  updateBrandAndSupplierCount,
  categoriesChanged,
  notifyCategoryTreeChangedIfNeeded,
  createProduct,
  updateProduct,
  deleteProduct,
};
