// controllers/syncController.js
const woocommerceService = require('../services/woocommerceService');

exports.syncCategories = async (req, res) => {
  try {
    const result = await woocommerceService.syncCategories();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.syncProducts = async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

exports.syncBrands = async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

exports.syncSuppliers = async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

exports.syncAll = async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

exports.testConnection = async (req, res) => {
  try {
    const response = await woocommerceService.testConnection();
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
