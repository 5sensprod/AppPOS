const express = require('express');
    const router = express.Router();
    const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;

    const WooCommerce = new WooCommerceRestApi({
      url: 'http://example.com', // Your store URL
      consumerKey: 'ck_your_consumer_key', // Your consumer key
      consumerSecret: 'cs_your_consumer_secret', // Your consumer secret
      version: 'wc/v3' // WooCommerce API version
    });

    // Synchronisation des produits
    router.post('/products', async (req, res) => {
      try {
        const products = await WooCommerce.get('products');
        res.json(products.data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Synchronisation des stocks
    router.put('/stocks/:id', async (req, res) => {
      try {
        const product = await WooCommerce.put(`products/${req.params.id}`, {
          stock_quantity: req.body.stock_quantity
        });
        res.json(product.data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Envoi des ventes
    router.post('/sales', async (req, res) => {
      try {
        const order = await WooCommerce.post('orders', {
          payment_method: 'bacs',
          line_items: req.body.line_items
        });
        res.json(order.data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Récupération des commandes
    router.get('/orders', async (req, res) => {
      try {
        const orders = await WooCommerce.get('orders');
        res.json(orders.data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    module.exports = router;
