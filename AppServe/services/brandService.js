// services/brandService.js - VERSION REFACTORISÉE
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const { getEntityEventService } = require('../services/events/entityEvents');

// ------- VALIDATION EXISTANTE -------
async function validateSuppliers(supplierIds = []) {
  for (const supplierId of supplierIds) {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      throw new Error(`Le fournisseur avec l'ID ${supplierId} n'existe pas`);
    }
  }
}

// ------- LIAISONS EXISTANTES -------
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

// ------- MÉTIER --------
async function createBrand(data) {
  const { suppliers = [], supplier_id } = data;
  const brandEvents = getEntityEventService('brands');

  if (supplier_id?.trim()) await validateSuppliers([supplier_id]);
  if (suppliers.length > 0) await validateSuppliers(suppliers);

  const brand = await Brand.create(data);
  await syncBrandWithSuppliers(brand._id.toString(), suppliers);

  await Brand.updateProductCount(brand._id);

  getEntityEventService('suppliers').supplierTreeChanged();

  brandEvents.created(brand);
  return brand;
}

async function updateBrand(id, updateData) {
  const brand = await Brand.findById(id);
  if (!brand) throw new Error('Marque non trouvée');

  const { suppliers = [], supplier_id } = updateData;
  const oldSuppliers = Array.isArray(brand.suppliers) ? brand.suppliers : [];
  let newSuppliers = oldSuppliers;

  if (supplier_id?.trim()) await validateSuppliers([supplier_id]);

  if (Array.isArray(suppliers)) {
    await validateSuppliers(suppliers);
    newSuppliers = suppliers;
    updateData.suppliers = newSuppliers;
  } else {
    delete updateData.suppliers;
  }

  const updated = await Brand.update(id, updateData);

  await removeBrandFromSuppliers(
    id,
    oldSuppliers.filter((s) => !newSuppliers.includes(s))
  );
  await syncBrandWithSuppliers(
    id,
    newSuppliers.filter((s) => !oldSuppliers.includes(s))
  );

  getEntityEventService('brands').updated(id, updated);
  getEntityEventService('suppliers').supplierTreeChanged();

  return Brand.findById(id);
}

// VERSION SIMPLIFIÉE SANS VALIDATION (fait par le middleware)
async function deleteBrand(brand) {
  const { _id, suppliers = [] } = brand;
  const brandEvents = getEntityEventService('brands');

  // ✅ Plus besoin de vérifier les produits - fait par le middleware

  // ➡️ Supprimer les relations avec les fournisseurs
  await removeBrandFromSuppliers(_id, suppliers);

  // ➡️ Supprimer la marque
  await Brand.delete(_id);

  // ➡️ Événement
  brandEvents.deleted(_id);

  // ➡️ Mise à jour des compteurs fournisseurs
  for (const supplierId of suppliers) {
    await Supplier.updateProductCount(supplierId);
  }

  getEntityEventService('suppliers').supplierTreeChanged();

  return { message: 'Marque supprimée avec succès' };
}

module.exports = {
  validateSuppliers,
  syncBrandWithSuppliers,
  removeBrandFromSuppliers,
  createBrand,
  updateBrand,
  deleteBrand,
};
