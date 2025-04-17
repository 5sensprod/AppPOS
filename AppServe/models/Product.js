//AppServe\models\Product.js - Modification pour formater les noms de catégories
const BaseModel = require('./base/BaseModel');
const db = require('../config/database');
const Category = require('./Category');
const { buildCategoryPath } = require('../utils/categoryHelpers');

// Fonction de formatage (identique à celle du categoryController)
function formatCategoryName(name) {
  if (!name || typeof name !== 'string') return name;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

class Product extends BaseModel {
  constructor() {
    super(db.products, 'products');
  }

  async findByIdWithCategoryInfo(id) {
    try {
      const product = await this.findById(id);
      if (!product) return null;

      // Récupérer les IDs de catégories du produit
      let categoryIds = product.categories || [];
      // Ajouter la catégorie principale si nécessaire
      if (product.category_id && !categoryIds.includes(product.category_id)) {
        categoryIds.unshift(product.category_id); // Ajouter au début pour priorité
      }

      if (categoryIds.length === 0) {
        return {
          ...product,
          category_info: {
            refs: [],
            primary: null,
          },
        };
      }

      // Récupérer toutes les catégories existantes
      const allExistingCategories = await Category.findAll();

      // Préparer les références de catégories avec leurs chemins complets
      const categoryInfos = [];

      // Pour chaque catégorie du produit, construire ses informations complètes
      for (const categoryId of categoryIds) {
        const category = allExistingCategories.find((c) => c._id === categoryId);
        if (!category) continue;

        // Construire le chemin pour cette catégorie
        const pathInfo = buildCategoryPath(allExistingCategories, categoryId);
        if (!pathInfo.path || pathInfo.path.length === 0) continue;

        // Formater les noms dans le chemin
        const formattedPath = pathInfo.path.map((name) => formatCategoryName(name));
        const formattedPathString = formattedPath.join(' > ');

        // Ajouter cette catégorie à la liste des refs
        categoryInfos.push({
          id: category._id,
          name: formatCategoryName(category.name),
          woo_id: category.woo_id || null,
          path: formattedPath,
          path_ids: pathInfo.path_ids,
          path_string: formattedPathString,
        });
      }

      // Trouver la catégorie principale
      let primary = null;
      if (product.category_id) {
        // Chercher la catégorie principale dans les infos déjà construites
        primary = categoryInfos.find((ci) => ci.id === product.category_id);
      }

      // Si aucune catégorie principale n'est explicitement définie, utiliser la première
      if (!primary && categoryInfos.length > 0) {
        primary = categoryInfos[0];
      }

      return {
        ...product,
        category_info: {
          refs: categoryInfos,
          primary: primary,
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
