// services/productService.js
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const { getEntityEventService } = require('../services/events/entityEvents');

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

function categoriesChanged(oldCategories = [], newCategories = []) {
  const oldSorted = [...(oldCategories || [])].sort();
  const newSorted = [...(newCategories || [])].sort();
  return JSON.stringify(oldSorted) !== JSON.stringify(newSorted);
}

function notifyCategoryTreeChangedIfNeeded(changed = false) {
  if (changed) {
    const categoryEvents = getEntityEventService('categories');
    categoryEvents.categoryTreeChanged();
  }
}

module.exports = {
  validateCategories,
  updateBrandAndSupplierCount,
  categoriesChanged,
  notifyCategoryTreeChangedIfNeeded,
};
