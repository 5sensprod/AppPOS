// services/brandService.js
const Supplier = require('../models/Supplier');

async function validateSuppliers(supplierIds = []) {
  for (const supplierId of supplierIds) {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      throw new Error(`Le fournisseur avec l'ID ${supplierId} n'existe pas`);
    }
  }
}

async function syncBrandWithSuppliers(brandId, suppliers = []) {
  for (const supplierId of suppliers) {
    const supplier = await Supplier.findById(supplierId);
    if (supplier) {
      const existingBrands = Array.isArray(supplier.brands) ? supplier.brands : [];
      if (!existingBrands.includes(brandId)) {
        await Supplier.update(supplierId, {
          brands: [...existingBrands, brandId],
        });
      }
    }
  }
}

async function removeBrandFromSuppliers(brandId, supplierIds = []) {
  for (const supplierId of supplierIds) {
    const supplier = await Supplier.findById(supplierId);
    if (supplier && Array.isArray(supplier.brands)) {
      const updatedBrands = supplier.brands.filter((id) => id.toString() !== brandId);
      await Supplier.update(supplierId, {
        brands: updatedBrands,
      });
    }
  }
}

module.exports = {
  validateSuppliers,
  syncBrandWithSuppliers,
  removeBrandFromSuppliers,
};
