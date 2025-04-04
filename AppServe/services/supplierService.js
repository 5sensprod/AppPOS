//AppServe\services\supplierService.js
const Supplier = require('../models/Supplier');
const Brand = require('../models/Brand');
const { getEntityEventService } = require('../services/events/entityEvents');

// ------- EXISTANT -------
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

// ------- NOUVEAU : logique métier -------

async function createSupplier(data) {
  const { brands = [] } = data;
  const supplierEvents = getEntityEventService('suppliers');

  if (brands.length > 0) await validateBrands(brands);

  const newSupplier = await Supplier.create(data);
  await syncSupplierWithBrands(newSupplier._id.toString(), brands);

  supplierEvents.created(newSupplier);
  return newSupplier;
}

async function updateSupplier(id, updateData) {
  const supplier = await Supplier.findById(id);
  if (!supplier) throw new Error('Fournisseur introuvable');

  const oldBrands = Array.isArray(supplier.brands) ? supplier.brands : [];
  let newBrands = oldBrands;

  if (Array.isArray(updateData.brands)) {
    if (updateData.brands.length > 0) {
      await validateBrands(updateData.brands);
      newBrands = [...new Set([...oldBrands, ...updateData.brands])];
    } else {
      newBrands = [];
    }
    updateData.brands = newBrands;
  } else {
    delete updateData.brands;
  }

  const updated = await Supplier.update(id, updateData);

  const removedBrands = oldBrands.filter((id) => !newBrands.includes(id));
  const addedBrands = newBrands.filter((id) => !oldBrands.includes(id));

  await removeSupplierFromBrands(id, removedBrands);
  await syncSupplierWithBrands(id, addedBrands);

  getEntityEventService('suppliers').updated(id, updated);

  return Supplier.findById(id);
}

async function deleteSupplier(supplier) {
  const { _id, brands = [] } = supplier;
  const supplierEvents = getEntityEventService('suppliers');

  await removeSupplierFromBrands(_id, brands);
  await Supplier.delete(_id);

  supplierEvents.deleted(_id);

  for (const brandId of brands) {
    await Brand.updateProductCount(brandId);
  }

  return { message: 'Fournisseur supprimé avec succès' };
}

// ------- EXPORT -------
module.exports = {
  validateBrands,
  syncSupplierWithBrands,
  removeSupplierFromBrands,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
