// fixBrandReferences.js
const Product = require('./models/Product');
const Brand = require('./models/Brand');

async function fixBrandReferences() {
  try {
    // 1. Construire un map de tous les noms de marques vers leurs IDs corrects
    const brands = await Brand.findAll();
    const brandNameToIdMap = new Map();

    brands.forEach((brand) => {
      brandNameToIdMap.set(brand.name.toUpperCase(), brand._id);
    });

    // 2. Trouver tous les produits
    const products = await Product.findAll();
    let updateCount = 0;

    // 3. Pour chaque produit, vérifier et corriger le brand_id
    for (const product of products) {
      if (product.brand_ref?.name) {
        const brandName = product.brand_ref.name.toUpperCase();
        const correctBrandId = brandNameToIdMap.get(brandName);

        if (correctBrandId && product.brand_id !== correctBrandId) {
          await Product.update(product._id, {
            brand_id: correctBrandId.toString(),
            brand_ref: {
              id: correctBrandId.toString(),
              name: product.brand_ref.name,
            },
          });
          console.log(
            `Produit ${product._id} (${product.name}) corrigé: ${product.brand_id} → ${correctBrandId}`
          );
          updateCount++;
        }
      }
    }

    // 4. Recalculer les compteurs
    await Brand.recalculateAllProductCounts();

    console.log(`${updateCount} produits corrigés et compteurs recalculés`);
  } catch (err) {
    console.error(err);
  }
}

fixBrandReferences();
