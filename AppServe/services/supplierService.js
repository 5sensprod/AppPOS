//AppServe\services\supplierService.js
const Supplier = require('../models/Supplier');
const Brand = require('../models/Brand');
const db = require('../config/database');
const Product = require('../models/Product');
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

  getEntityEventService('suppliers').supplierTreeChanged();

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
  getEntityEventService('suppliers').supplierTreeChanged();

  return Supplier.findById(id);
}

async function deleteSupplier(supplier) {
  const { _id, brands = [] } = supplier;
  const supplierEvents = getEntityEventService('suppliers');

  // 🔒 Vérifie s'il y a encore des produits liés à ce fournisseur
  const linkedProducts = await db.products.find({ supplier_id: _id });
  if (linkedProducts.length > 0) {
    throw new Error(
      `Impossible de supprimer ce fournisseur : ${linkedProducts.length} produit(s) encore lié(s)`
    );
  }

  // ➡️ On supprime les relations avec les marques
  await removeSupplierFromBrands(_id, brands);

  // ➡️ Suppression du fournisseur
  await Supplier.delete(_id);

  // ➡️ Notification des événements
  supplierEvents.deleted(_id);

  // ➡️ Mise à jour des compteurs de marques
  for (const brandId of brands) {
    await Brand.updateProductCount(brandId);
  }

  getEntityEventService('suppliers').supplierTreeChanged();

  return { message: 'Fournisseur supprimé avec succès' };
}

async function buildSupplierTree() {
  const allSuppliers = await Supplier.findAll();
  const allBrands = await Brand.findAll();
  const allProducts = await Product.findAll();

  const suppliersMap = new Map();

  // Initialiser les fournisseurs
  allSuppliers.forEach((supplier) => {
    suppliersMap.set(supplier._id, {
      ...supplier,
      brands: [],
      brandCount: 0,
    });
  });

  // Associer les marques aux fournisseurs
  allBrands.forEach((brand) => {
    const supplierIds = brand.suppliers || [];

    // Produits liés à cette marque
    const brandProducts = allProducts.filter((product) => product.brand_id === brand._id);

    const brandNode = {
      _id: brand._id,
      name: brand.name,
      productCount: brandProducts.length,
      products: brandProducts.map((p) => ({
        _id: p._id,
        name: p.name,
        sku: p.sku || null,
      })),
    };

    supplierIds.forEach((supplierId) => {
      const supplierNode = suppliersMap.get(supplierId);
      if (supplierNode) {
        supplierNode.brands.push(brandNode);
        supplierNode.brandCount += 1;
      }
    });
  });

  return Array.from(suppliersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = {
  ...// tes autres exports
  buildSupplierTree,
};

// ------- EXPORT -------
module.exports = {
  validateBrands,
  syncSupplierWithBrands,
  removeSupplierFromBrands,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  buildSupplierTree,
};
