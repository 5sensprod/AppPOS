// services/supplierService.js
const Brand = require('../models/Brand');

async function validateBrands(brandIds = []) {
  for (const brandId of brandIds) {
    const brand = await Brand.findById(brandId);
    if (!brand) {
      throw new Error(`La marque avec l'ID ${brandId} n'existe pas`);
    }
  }
}

async function syncSupplierWithBrands(supplierId, brands = []) {
  for (const brandId of brands) {
    const brand = await Brand.findById(brandId);
    if (brand) {
      const existingSuppliers = Array.isArray(brand.suppliers) ? brand.suppliers : [];
      if (!existingSuppliers.includes(supplierId)) {
        await Brand.update(brandId, {
          suppliers: [...existingSuppliers, supplierId],
        });
      }
    }
  }
}

async function removeSupplierFromBrands(supplierId, brandIds = []) {
  for (const brandId of brandIds) {
    const brand = await Brand.findById(brandId);
    if (brand && Array.isArray(brand.suppliers)) {
      const updatedSuppliers = brand.suppliers.filter((id) => id.toString() !== supplierId);
      await Brand.update(brandId, {
        suppliers: updatedSuppliers,
      });
    }
  }
}

module.exports = {
  validateBrands,
  syncSupplierWithBrands,
  removeSupplierFromBrands,
};
