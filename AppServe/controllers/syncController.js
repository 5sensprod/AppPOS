// controllers/syncController.js
const woocommerceService = require('../services/woocommerceService');
const Category = require('../models/Category');

exports.syncCategories = async (req, res) => {
  try {
    const { direction = 'both' } = req.query;
    let results = { from_wc: null, to_wc: null };

    if (direction === 'from_wc' || direction === 'both') {
      results.from_wc = await woocommerceService.syncFromWooCommerce();
    }

    if (direction === 'to_wc' || direction === 'both') {
      results.to_wc = await woocommerceService.syncToWooCommerce();
    }

    res.json({ success: true, timestamp: new Date(), results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.syncProducts = async (req, res) => {
  res.status(501).json({ message: 'Synchronisation produits pas encore implémentée' });
};

exports.syncBrands = async (req, res) => {
  res.status(501).json({ message: 'Synchronisation marques pas encore implémentée' });
};

exports.syncSuppliers = async (req, res) => {
  res.status(501).json({ message: 'Synchronisation fournisseurs pas encore implémentée' });
};

exports.syncAll = async (req, res) => {
  res.status(501).json({ message: 'Synchronisation complète pas encore implémentée' });
};

exports.testConnection = async (req, res) => {
  try {
    const result = await woocommerceService.testConnection();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
