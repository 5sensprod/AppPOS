// ===== controllers/product/productSearchController.js =====
const BaseController = require('../base/BaseController');
const Product = require('../../models/Product');
const productWooCommerceService = require('../../services/ProductWooCommerceService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const exportController = require('../../utils/exportController');

class ProductSearchController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      image: { type: 'gallery' },
      deleteFromWoo: (id) => productWooCommerceService.deleteProduct(id),
    });
  }

  async searchByBarcode(req, res) {
    try {
      const { code } = req.params;

      if (!code) {
        return ResponseHandler.badRequest(res, 'Code-barres requis');
      }

      const products = await this.model.find({
        meta_data: {
          $elemMatch: {
            key: 'barcode',
            value: code,
          },
        },
      });

      if (products.length === 0) {
        return ResponseHandler.notFound(res, `Aucun produit trouvé avec le code-barres: ${code}`);
      }

      const productWithCategory = await this.model.findByIdWithCategoryInfo(products[0]._id);
      return ResponseHandler.success(res, productWithCategory);
    } catch (error) {
      console.error('Erreur recherche code-barres:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async searchBySku(req, res) {
    try {
      const { sku } = req.params;
      const { partial = 'false' } = req.query;

      if (!sku) {
        return ResponseHandler.badRequest(res, 'SKU requis');
      }

      let searchQuery;

      if (partial === 'true') {
        const regex = new RegExp(sku.trim(), 'i');
        searchQuery = {
          sku: regex,
        };
      } else {
        searchQuery = {
          sku: sku.trim(),
        };
      }

      const products = await this.model.find(searchQuery);

      if (products.length === 0) {
        return ResponseHandler.notFound(res, `Aucun produit trouvé avec le SKU: ${sku}`);
      }

      const productWithCategory = await this.model.findByIdWithCategoryInfo(products[0]._id);
      return ResponseHandler.success(res, productWithCategory);
    } catch (error) {
      console.error('Erreur recherche SKU:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async searchByCode(req, res) {
    try {
      const { code } = req.params;
      const { type = 'auto', limit = 5 } = req.query;

      if (!code) {
        return ResponseHandler.badRequest(res, 'Code requis');
      }

      let products = [];
      let searchType = type;

      const regex = new RegExp(code.trim(), 'i');

      if (type === 'auto') {
        // 1. Essayer d'abord par SKU
        products = await this.model.find({ sku: regex });
        if (products.length > 0) {
          searchType = 'sku';
        } else {
          // 2. Puis par designation
          products = await this.model.find({ designation: regex });
          if (products.length > 0) {
            searchType = 'designation';
          } else {
            // 3. Enfin par code-barres
            products = await this.model.find({
              meta_data: {
                $elemMatch: {
                  key: 'barcode',
                  value: regex,
                },
              },
            });
            searchType = 'barcode';
          }
        }
      } else if (type === 'sku') {
        products = await this.model.find({ sku: regex });
      } else if (type === 'designation') {
        products = await this.model.find({ designation: regex });
      } else if (type === 'barcode') {
        products = await this.model.find({
          meta_data: {
            $elemMatch: {
              key: 'barcode',
              value: regex,
            },
          },
        });
      }

      if (products.length === 0) {
        return ResponseHandler.notFound(res, `Aucun produit trouvé avec le code: ${code}`);
      }

      const limitedProducts = products.slice(0, parseInt(limit));

      if (limitedProducts.length > 1) {
        const productsWithCategory = await Promise.all(
          limitedProducts.map((product) => this.model.findByIdWithCategoryInfo(product._id))
        );

        return ResponseHandler.success(res, {
          multiple: true,
          total_found: products.length,
          results: productsWithCategory.map((product) => ({
            ...product,
            search_info: {
              searched_code: code,
              found_by: searchType,
              total_found: products.length,
            },
          })),
        });
      }

      const productWithCategory = await this.model.findByIdWithCategoryInfo(limitedProducts[0]._id);

      return ResponseHandler.success(res, {
        ...productWithCategory,
        search_info: {
          searched_code: code,
          found_by: searchType,
          total_found: products.length,
        },
      });
    } catch (error) {
      console.error('Erreur recherche code:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async searchByDesignation(req, res) {
    try {
      const { designation } = req.params;
      const { partial = 'true' } = req.query;

      if (!designation) {
        return ResponseHandler.badRequest(res, 'Designation requise');
      }

      let searchQuery;
      if (partial === 'true') {
        const regex = new RegExp(designation.trim(), 'i');
        searchQuery = { designation: regex };
      } else {
        searchQuery = { designation: designation.trim() };
      }

      const products = await this.model.find(searchQuery);

      if (products.length === 0) {
        return ResponseHandler.notFound(
          res,
          `Aucun produit trouvé avec la designation: ${designation}`
        );
      }

      const productWithCategory = await this.model.findByIdWithCategoryInfo(products[0]._id);
      return ResponseHandler.success(res, productWithCategory);
    } catch (error) {
      console.error('Erreur recherche designation:', error);
      return ResponseHandler.error(res, error);
    }
  }
}

const productSearchController = new ProductSearchController();

module.exports = exportController(productSearchController, [
  'searchByBarcode',
  'searchBySku',
  'searchByCode',
  'searchByDesignation',
]);
