//AppServe\models\Product.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');
const Category = require('./Category');
const { buildCategoryPath } = require('../utils/categoryHelpers');

class Product extends BaseModel {
  constructor() {
    super(db.products, 'products');
  }

  async findByIdWithCategoryInfo(id) {
    try {
      const product = await this.findById(id);
      if (!product) return null;

      const categoryIds = product.categories || [];

      if (categoryIds.length === 0) {
        return {
          ...product,
          category_info: {
            refs: [],
            primary: null,
          },
        };
      }

      // 🔍 Requête groupée pour les catégories du produit
      const allCategories = await Category.find({ _id: { $in: categoryIds } });

      // 🔁 Pour les chemins, on a besoin de toutes les catégories existantes
      const allExistingCategories = await Category.findAll();

      const categoryInfos = allCategories.map((category) => {
        const pathInfo = buildCategoryPath(allExistingCategories, category._id);

        return {
          id: category._id,
          name: category.name,
          woo_id: category.woo_id || null,
          ...pathInfo,
        };
      });

      return {
        ...product,
        category_info: {
          refs: categoryInfos,
          primary: categoryInfos[0] || null,
        },
      };
    } catch (error) {
      console.error('Erreur récupération produit avec catégories:', error);
      throw error;
    }
  }

  async updateWithCategoryInfo(id, data) {
    try {
      const { categories = [], ...otherData } = data;

      await this.update(id, {
        ...otherData,
        categories,
      });

      return await this.findByIdWithCategoryInfo(id);
    } catch (error) {
      console.error('Erreur mise à jour produit avec catégories:', error);
      throw error;
    }
  }
}

module.exports = new Product();
