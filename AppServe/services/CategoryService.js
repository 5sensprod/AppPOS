// services/CategoryService.js
const Category = require('../models/Category');
const Product = require('../models/Product');
const categoryWooService = require('./CategoryWooCommerceService');
const { calculateLevel } = require('../utils/categoryHelpers');

class CategoryService {
  /**
   * Prépare les données pour la mise à jour d'une catégorie
   */
  async prepareUpdateData(bodyData, existingCategory) {
    const updatedData = { ...bodyData };

    // Recalculer le niveau si le parent_id a changé
    if (updatedData.parent_id && updatedData.parent_id !== existingCategory.parent_id) {
      updatedData.level = await calculateLevel(updatedData.parent_id);
    }

    return updatedData;
  }

  /**
   * Notifie les changements de catégorie via WebSocket
   */
  notifyCategoryChanges(categoryId, data, type = 'update') {
    const websocketManager = require('../websocket/websocketManager');

    // Notification standard d'entité
    if (type === 'create') {
      websocketManager.notifyEntityCreated('categories', data);
    } else if (type === 'update') {
      websocketManager.notifyEntityUpdated('categories', categoryId, data);

      // Notification spéciale pour l'arborescence si nécessaire
      if (data.name || data.parent_id) {
        websocketManager.notifyCategoryTreeChange();
      }
    } else if (type === 'delete') {
      websocketManager.notifyEntityDeleted('categories', categoryId);
      websocketManager.notifyCategoryTreeChange();
    }
  }

  /**
   * Valide si une catégorie peut être supprimée
   */
  async validateDeletion(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) {
      return { canDelete: false, message: 'Catégorie non trouvée' };
    }

    // Vérifier les sous-catégories si c'est une catégorie racine
    if (category.level === 0) {
      const allCategories = await Category.findAll();
      const children = allCategories.filter((cat) => cat.parent_id === categoryId);

      if (children.length > 0) {
        return {
          canDelete: false,
          message: `Impossible de supprimer la catégorie : ${children.length} sous-catégorie(s) existante(s)`,
          category,
        };
      }
    }

    // Vérifier les produits liés
    const allProducts = await Product.findAll();
    const linkedProducts = allProducts.filter(
      (product) =>
        (product.categories?.length > 0 && product.categories.includes(category._id)) ||
        (product.category_id && product.category_id === category._id)
    );

    if (linkedProducts.length > 0) {
      return {
        canDelete: false,
        message: `Impossible de supprimer la catégorie : ${linkedProducts.length} produit(s) lié(s)`,
        category,
      };
    }

    return { canDelete: true, category };
  }

  /**
   * Supprime une catégorie de WooCommerce
   */
  async deleteFromWooCommerce(category) {
    try {
      console.log(
        `[WS-DEBUG] Suppression de la catégorie ${category._id} de WooCommerce (woo_id: ${category.woo_id})`
      );
      await categoryWooService.deleteCategory(category._id);
      console.log(`[WS-DEBUG] Catégorie supprimée de WooCommerce avec succès`);
      return true;
    } catch (wcError) {
      console.error(`[WS-DEBUG] Erreur lors de la suppression WooCommerce:`, wcError);
      // On continue malgré l'erreur
      return false;
    }
  }

  /**
   * Obtient les catégories sous forme hiérarchique, avec recherche optionnelle
   */
  async getHierarchicalData(search = '') {
    // Récupération des données
    const allCategories = await Category.findAll();
    const allProducts = await Product.findAll();

    // Construction de la structure hiérarchique
    const rootCategories = [];
    const categoriesMap = this._buildCategoriesMap(allCategories, allProducts);

    // Organisation de la hiérarchie
    this._organizeHierarchy(allCategories, categoriesMap, rootCategories);

    // Filtrage par recherche si nécessaire
    let result = rootCategories;
    if (search) {
      result = this._filterBySearch(rootCategories, search.toLowerCase());
    }

    // Tri des catégories
    this._sortCategoriesRecursively(result);

    return result;
  }

  /**
   * Construit une map des catégories avec leurs produits
   * @private
   */
  _buildCategoriesMap(categories, products) {
    const categoriesMap = new Map();

    categories.forEach((category) => {
      // Filtrer les produits pour cette catégorie
      const categoryProducts = products.filter(
        (product) =>
          (product.categories && product.categories.includes(category._id)) ||
          product.category_id === category._id
      );

      // Liste simplifiée des produits
      const productsList = categoryProducts.map((product) => ({
        _id: product._id,
        name: product.name,
        sku: product.sku || null,
      }));

      // Ajouter la catégorie à la map avec ses métadonnées
      categoriesMap.set(category._id, {
        ...category,
        children: [],
        productCount: categoryProducts.length,
        products: productsList,
      });
    });

    return categoriesMap;
  }

  /**
   * Organise les catégories de façon hiérarchique
   * @private
   */
  _organizeHierarchy(categories, categoriesMap, rootCategories) {
    categories.forEach((category) => {
      const categoryWithChildren = categoriesMap.get(category._id);

      if (!category.parent_id) {
        // Catégorie racine
        rootCategories.push(categoryWithChildren);
      } else {
        // Sous-catégorie
        const parentCategory = categoriesMap.get(category.parent_id);
        if (parentCategory) {
          parentCategory.children.push(categoryWithChildren);
        } else {
          console.warn(
            `Parent introuvable pour la catégorie ${category._id} (parent_id: ${category.parent_id})`
          );
          rootCategories.push(categoryWithChildren);
        }
      }
    });
  }

  /**
   * Filtre les catégories par terme de recherche
   * @private
   */
  _filterBySearch(categories, searchTerm) {
    const matchesSearch = (category) => {
      // Vérifier la catégorie actuelle
      const nameMatch = category.name.toLowerCase().includes(searchTerm);
      const descMatch =
        category.description && category.description.toLowerCase().includes(searchTerm);

      if (nameMatch || descMatch) return true;

      // Vérifier récursivement les enfants
      if (category.children && category.children.length > 0) {
        return category.children.some((child) => matchesSearch(child));
      }

      return false;
    };

    return categories.filter((category) => matchesSearch(category));
  }

  /**
   * Trie les catégories par nom de façon récursive
   * @private
   */
  _sortCategoriesRecursively(categories) {
    categories.sort((a, b) => a.name.localeCompare(b.name));

    categories.forEach((category) => {
      if (category.children && category.children.length > 0) {
        this._sortCategoriesRecursively(category.children);
      }
    });
  }
}

module.exports = new CategoryService();
