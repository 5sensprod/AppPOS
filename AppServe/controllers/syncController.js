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

    res.json({
      success: true,
      timestamp: new Date(),
      results,
      summary: {
        from_wc: results.from_wc
          ? `${results.from_wc.created} créées, ${results.from_wc.updated} mises à jour`
          : null,
        to_wc: results.to_wc
          ? `${results.to_wc.created} créées, ${results.to_wc.updated} mises à jour, ${results.to_wc.deleted} supprimées`
          : null,
      },
    });
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

exports.syncSingleCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Catégorie non trouvée' });
    }

    const results = await woocommerceService.syncToWooCommerce(category._id);
    res.json({
      success: true,
      timestamp: new Date(),
      category: category._id,
      results,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.syncAll = async (req, res) => {
  res.status(501).json({ message: 'Synchronisation complète pas encore implémentée' });
};
