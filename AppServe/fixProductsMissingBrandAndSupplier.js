// AppServe/fixProductsMissingBrandAndSupplier.js

const Product = require('./models/Product');
const Brand = require('./models/Brand');
const Supplier = require('./models/Supplier');

async function fixProducts() {
  try {
    const products = await Product.findAll();
    let updated = 0;

    for (const product of products) {
      const updateData = {};
      let needsUpdate = false;

      if (!product.brand_id && product.brand_ref?.id) {
        updateData.brand_id = product.brand_ref.id;
        needsUpdate = true;
      }

      if (!product.supplier_id && product.supplier_ref?.id) {
        updateData.supplier_id = product.supplier_ref.id;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Product.update(product._id, updateData);
        console.log(`✅ Produit ${product._id} mis à jour`);
        updated++;
      }
    }

    console.log(`\n🔧 Correction terminée : ${updated} produit(s) mis à jour.`);

    console.log('🔄 Recalcul des compteurs pour les marques et fournisseurs...');
    await Brand.recalculateAllProductCounts();
    await Supplier.recalculateAllProductCounts();
    console.log('🧮 Compteurs recalculés avec succès !');
  } catch (err) {
    console.error('❌ Erreur lors de la mise à jour des produits :', err.message);
  }
}

if (require.main === module) {
  fixProducts();
}
