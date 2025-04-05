// AppServe/fixProductSupplierAndBrandRefs.js

const Product = require('./models/Product');
const Brand = require('./models/Brand');
const Supplier = require('./models/Supplier');

async function fixMissingRefs() {
  try {
    const products = await Product.findAll();
    let updated = 0;

    for (const product of products) {
      let needsUpdate = false;
      const updateData = {};

      if (!product.supplier_id && product.supplier_ref?.id) {
        updateData.supplier_id = product.supplier_ref.id;
        needsUpdate = true;
      }

      if (!product.brand_id && product.brand_ref?.id) {
        updateData.brand_id = product.brand_ref.id;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Product.update(product._id, updateData);
        console.log(`✅ Produit ${product._id} mis à jour`);
        updated++;
      }
    }

    console.log(`🔁 Correction terminée : ${updated} produit(s) mis à jour.`);

    // 🧮 Recalcul des compteurs
    await Brand.recalculateAllProductCounts();
    await Supplier.recalculateAllProductCounts();

    console.log('🧮 Compteurs recalculés avec succès !');
  } catch (error) {
    console.error('❌ Erreur pendant la correction :', error.message);
  }
}

if (require.main === module) {
  fixMissingRefs();
}
