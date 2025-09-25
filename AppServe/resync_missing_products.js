// Script de resynchronisation des produits manquants
// À exécuter dans votre application

const productIds = [
  "kWhP7PAkXy6thgd7", // D'Addario Jeu de vis de chevalet avec vis de fin fabriquése en moulage par injection D'Addario, jeu de 7, coloris ivoire avec point noir (woo_id: 25107621)
];

async function resyncMissingProducts() {
  const ProductWooCommerceService = require("./services/ProductWooCommerceService");
  const Product = require("./models/Product");

  for (const productId of productIds) {
    try {
      const product = await Product.findById(productId);
      if (product) {
        await ProductWooCommerceService.syncToWooCommerce([product]);
        console.log(`✅ ${productId} resynchronisé`);
      }
    } catch (error) {
      console.error(`❌ Erreur ${productId}:`, error.message);
    }
  }
}

resyncMissingProducts();