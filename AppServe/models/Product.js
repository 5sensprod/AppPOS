// models/Product.js
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');

class Product extends BaseModel {
  constructor() {
    super(db.products, 'products');
  }

  async findByIdWithCategoryInfo(id) {
    try {
      const product = await this.findById(id);
      if (!product) return null;

      if (!product.categories || product.categories.length === 0) {
        return {
          ...product,
          category_info: {
            refs: [],
            primary: null,
          },
        };
      }

      const Category = require('./Category');

      const categoryInfoPromises = product.categories.map(async (categoryId) => {
        try {
          const category = await Category.findById(categoryId);
          if (!category) return null;

          const pathInfo = await Category.getCategoryPath(categoryId);

          return {
            id: categoryId,
            name: category.name,
            woo_id: category.woo_id || null,
            ...pathInfo,
          };
        } catch (error) {
          console.error(`Erreur chemin catégorie ${categoryId}:`, error);
          return null;
        }
      });

      const categoryInfos = (await Promise.all(categoryInfoPromises)).filter(
        (info) => info !== null
      );

      return {
        ...product,
        category_info: {
          refs: categoryInfos,
          primary: categoryInfos.length > 0 ? categoryInfos[0] : null,
        },
      };
    } catch (error) {
      console.error('Erreur récupération produit avec catégories:', error);
      throw error;
    }
  }

  async updateWithCategoryInfo(id, data) {
    try {
      // Extraire les catégories du payload
      const { categories, ...otherData } = data;
      const categoryIds = categories || [];

      // Mettre à jour le produit avec les données de base
      await this.update(id, {
        ...otherData,
        categories: categoryIds,
      });

      // Si pas de catégories, retourner le produit
      if (categoryIds.length === 0) {
        const updatedProduct = await this.findById(id);
        return updatedProduct;
      }

      // Sinon, enrichir avec les informations de catégorie
      const productWithCategoryInfo = await this.findByIdWithCategoryInfo(id);
      return productWithCategoryInfo;
    } catch (error) {
      console.error('Erreur mise à jour produit avec catégories:', error);
      throw error;
    }
  }
}

module.exports = new Product();
