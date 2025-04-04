// services/relationService.js
const db = require('../config/database');
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const { getEntityEventService } = require('./events/entityEvents');

async function checkProductDependencies(entityType, entityId) {
  return new Promise((resolve, reject) => {
    db.products.count({ [`${entityType}_id`]: entityId }, (err, result) => {
      if (err) reject(err);
      else resolve({ hasProducts: result > 0, count: result });
    });
  });
}

async function addBrandToSupplier(brandId, supplierId) {
  const brand = await Brand.findById(brandId);
  const supplier = await Supplier.findById(supplierId);

  if (!brand || !supplier) {
    throw new Error('Marque ou fournisseur non trouvé');
  }

  // Initialiser les tableaux
  const brandSuppliers = Array.isArray(brand.suppliers) ? brand.suppliers : [];
  const supplierBrands = Array.isArray(supplier.brands) ? supplier.brands : [];

  // Vérifier doublons
  if (brandSuppliers.includes(supplierId)) {
    return { brand, supplier }; // Relation déjà existante
  }

  // Mise à jour de la marque
  const updatedBrandSuppliers = [...brandSuppliers, supplierId];
  const updatedBrandSuppliersRefs = [
    ...(brand.suppliersRefs || []).filter((ref) => ref.id !== supplierId),
    { id: supplierId, name: supplier.name },
  ];

  // Mise à jour du fournisseur
  const updatedSupplierBrands = [...supplierBrands, brandId];
  const updatedSupplierBrandsRefs = [
    ...(supplier.brandsRefs || []).filter((ref) => ref.id !== brandId),
    {
      id: brandId,
      name: brand.name,
      woo_id: brand.woo_id || null,
      pending_sync: brand.pending_sync || false,
      products_count: brand.products_count || 0,
    },
  ];

  // Appliquer les mises à jour
  await Brand.update(brandId, {
    suppliers: updatedBrandSuppliers,
    suppliersRefs: updatedBrandSuppliersRefs,
  });

  await Supplier.update(supplierId, {
    brands: updatedSupplierBrands,
    brandsRefs: updatedSupplierBrandsRefs,
  });

  // Déclencher les événements
  getEntityEventService('brands').updated(brandId, await Brand.findById(brandId));
  getEntityEventService('suppliers').updated(supplierId, await Supplier.findById(supplierId));

  return {
    brand: await Brand.findById(brandId),
    supplier: await Supplier.findById(supplierId),
  };
}

async function removeBrandFromSupplier(brandId, supplierId) {
  const brand = await Brand.findById(brandId);
  const supplier = await Supplier.findById(supplierId);

  if (!brand || !supplier) {
    throw new Error('Marque ou fournisseur non trouvé');
  }

  // Mise à jour de la marque
  const updatedBrandSuppliers = (brand.suppliers || []).filter((id) => id !== supplierId);
  const updatedBrandSuppliersRefs = (brand.suppliersRefs || []).filter(
    (ref) => ref.id !== supplierId
  );

  // Mise à jour du fournisseur
  const updatedSupplierBrands = (supplier.brands || []).filter((id) => id !== brandId);
  const updatedSupplierBrandsRefs = (supplier.brandsRefs || []).filter((ref) => ref.id !== brandId);

  // Appliquer les mises à jour
  await Brand.update(brandId, {
    suppliers: updatedBrandSuppliers,
    suppliersRefs: updatedBrandSuppliersRefs,
  });

  await Supplier.update(supplierId, {
    brands: updatedSupplierBrands,
    brandsRefs: updatedSupplierBrandsRefs,
  });

  // Déclencher les événements
  getEntityEventService('brands').updated(brandId, await Brand.findById(brandId));
  getEntityEventService('suppliers').updated(supplierId, await Supplier.findById(supplierId));

  return {
    brand: await Brand.findById(brandId),
    supplier: await Supplier.findById(supplierId),
  };
}

// Mettre à jour deleteBrand et deleteSupplier existants pour utiliser checkProductDependencies
async function safeBrandDelete(brand) {
  const { hasProducts, count } = await checkProductDependencies('brand', brand._id);
  if (hasProducts) {
    throw new Error(`Impossible de supprimer la marque: ${count} produit(s) associé(s)`);
  }

  // Continuer avec la logique existante du deleteBrand
  const { _id, suppliers = [] } = brand;

  // Supprimer cette marque de tous les fournisseurs liés
  for (const supplierId of suppliers) {
    const supplier = await Supplier.findById(supplierId);
    if (supplier) {
      await removeBrandFromSupplier(_id, supplierId);
    }
  }

  await Brand.delete(_id);
  getEntityEventService('brands').deleted(_id);

  return { message: 'Marque supprimée avec succès' };
}

async function safeSupplierDelete(supplier) {
  const { hasProducts, count } = await checkProductDependencies('supplier', supplier._id);
  if (hasProducts) {
    throw new Error(`Impossible de supprimer le fournisseur: ${count} produit(s) associé(s)`);
  }

  // Continuer avec la logique de suppression
  const { _id, brands = [] } = supplier;

  // Supprimer ce fournisseur de toutes les marques liées
  for (const brandId of brands) {
    const brand = await Brand.findById(brandId);
    if (brand) {
      await removeBrandFromSupplier(brandId, _id);
    }
  }

  await Supplier.delete(_id);
  getEntityEventService('suppliers').deleted(_id);

  return { message: 'Fournisseur supprimé avec succès' };
}

module.exports = {
  checkProductDependencies,
  addBrandToSupplier,
  removeBrandFromSupplier,
  safeBrandDelete,
  safeSupplierDelete,
};
