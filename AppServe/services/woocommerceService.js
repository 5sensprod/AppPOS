// services/woocommerceService.js
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const Category = require('../models/Category');

const wcApi = new WooCommerceRestApi({
  url: 'https://axemusique.shop',
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: 'wc/v3',
});

exports.syncCategories = async () => {
  const localCategories = await Category.find({});
  const syncResults = [];

  for (const category of localCategories) {
    try {
      const wcData = {
        name: category.name,
        parent: category.parentId || 0,
        image: category.image
          ? {
              src: `${process.env.API_URL}/public/categories/${category.image}`,
            }
          : null,
      };

      let wcResponse;
      if (category.wcId) {
        wcResponse = await wcApi.put(`products/categories/${category.wcId}`, wcData);
      } else {
        wcResponse = await wcApi.post('products/categories', wcData);
        await Category.findByIdAndUpdate(category._id, { wcId: wcResponse.data.id });
      }

      syncResults.push({
        local_id: category._id,
        wc_id: wcResponse.data.id,
        status: 'success',
      });
    } catch (error) {
      syncResults.push({
        local_id: category._id,
        status: 'error',
        error: error.message,
      });
    }
  }

  return syncResults;
};

exports.testConnection = async () => {
  try {
    const response = await wcApi.get('products');
    return { status: 'success', data: response.data };
  } catch (error) {
    throw new Error(`WooCommerce connection failed: ${error.message}`);
  }
};
