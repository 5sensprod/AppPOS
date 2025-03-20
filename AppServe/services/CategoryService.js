// services/CategoryService.js
const eventBus = require('../events/eventBus');
const EVENTS = require('../events/eventTypes');
const categoryRepository = require('../repositories/CategoryRepository');
const BaseEntityService = require('./BaseEntityService');
const { calculateLevel } = require('../utils/categoryHelpers');
const Product = require('../models/Product');

class CategoryService extends BaseEntityService {
  constructor() {
    super(categoryRepository, 'CATEGORY');
  }

  async update(id, updateData) {
    const category = await this.repository.findById(id);
    if (!category) {
      throw { status: 404, message: 'Catégorie non trouvée' };
    }

    const preparedData = await this.prepareUpdateData(updateData, category);

    // Traitement spécifique pour WooCommerce
    if (category.woo_id) {
      preparedData.pending_sync = true;
    }

    const result = await this.repository.update(id, preparedData);

    // Sync avec WooCommerce si nécessaire
    if (category.woo_id) {
      try {
        const updatedCategory = await this.repository.findById(id);
        await this.syncToWooCommerce(updatedCategory);
        await this.repository.update(id, { pending_sync: false });
      } catch (error) {
        console.error('Erreur synchronisation WooCommerce:', error);
      }
    }

    // Événements
    eventBus.emit(this.events.UPDATED, { id, data: result });

    if (preparedData.name || preparedData.parent_id) {
      eventBus.emit(EVENTS.CATEGORY_TREE_CHANGED);
    }

    return result;
  }

  async delete(id) {
    const validationResult = await this.validateDeletion(id);

    if (!validationResult.canDelete) {
      throw { status: 400, message: validationResult.message };
    }

    // Suppression WooCommerce
    if (validationResult.category.woo_id) {
      await this.deleteFromWooCommerce(validationResult.category);
    }

    // Suppression en BDD
    await this.repository.delete(id);

    // Notifications
    eventBus.emit(this.events.DELETED, { id });
    eventBus.emit(EVENTS.CATEGORY_TREE_CHANGED);

    return {
      message: 'Catégorie supprimée avec succès',
      woo_status: validationResult.category.woo_id ? 'synchronized' : 'not_applicable',
    };
  }

  async prepareUpdateData(data, existingCategory) {
    const updatedData = { ...data };

    // Recalculer le niveau si le parent_id a changé
    if (updatedData.parent_id && updatedData.parent_id !== existingCategory.parent_id) {
      updatedData.level = await calculateLevel(updatedData.parent_id);
    }

    return updatedData;
  }

  async validateDeletion(categoryId) {
    const category = await this.repository.findById(categoryId);
    if (!category) {
      return { canDelete: false, message: 'Catégorie non trouvée' };
    }

    // Vérifier les sous-catégories
    if (category.level === 0) {
      const children = await this.repository.findChildCategories(categoryId);
      if (children.length > 0) {
        return {
          canDelete: false,
          message: `Impossible de supprimer la catégorie : ${children.length} sous-catégorie(s) existante(s)`,
          category,
        };
      }
    }

    // Vérifier les produits liés
    const linkedProducts = await this.repository.findLinkedProducts(categoryId);
    if (linkedProducts.length > 0) {
      return {
        canDelete: false,
        message: `Impossible de supprimer la catégorie : ${linkedProducts.length} produit(s) lié(s)`,
        category,
      };
    }

    return { canDelete: true, category };
  }

  async syncToWooCommerce(category) {
    // Implémentation de la synchronisation WooCommerce
    const categoryWooService = require('./CategoryWooCommerceService');
    return await categoryWooService.syncToWooCommerce([category]);
  }

  async deleteFromWooCommerce(category) {
    try {
      const categoryWooService = require('./CategoryWooCommerceService');
      await categoryWooService.deleteCategory(category._id);
      return true;
    } catch (error) {
      console.error('Erreur suppression WooCommerce:', error);
      return false;
    }
  }

  async getHierarchicalData(search = '') {
    const allCategories = await this.repository.findAll();
    const Product = require('../models/Product'); // Importer le modèle Product
    const allProducts = await Product.findAll();

    // Construction de la hiérarchie
    const categoriesMap = this._buildCategoriesMap(allCategories, allProducts);
    const rootCategories = [];

    this._organizeHierarchy(allCategories, categoriesMap, rootCategories);

    // Filtrage et tri
    let result = rootCategories;
    if (search) {
      result = this._filterBySearch(rootCategories, search.toLowerCase());
    }

    this._sortCategoriesRecursively(result);

    return result;
  }

  _buildCategoriesMap(categories, products) {
    const categoriesMap = new Map();

    categories.forEach((category) => {
      const categoryProducts = products.filter(
        (product) =>
          (product.categories && product.categories.includes(category._id)) ||
          product.category_id === category._id
      );

      const productsList = categoryProducts.map((product) => ({
        _id: product._id,
        name: product.name,
        sku: product.sku || null,
      }));

      categoriesMap.set(category._id, {
        ...category,
        children: [],
        productCount: categoryProducts.length,
        products: productsList,
      });
    });

    return categoriesMap;
  }

  _organizeHierarchy(categories, categoriesMap, rootCategories) {
    categories.forEach((category) => {
      const categoryWithChildren = categoriesMap.get(category._id);

      if (!category.parent_id) {
        rootCategories.push(categoryWithChildren);
      } else {
        const parentCategory = categoriesMap.get(category.parent_id);
        if (parentCategory) {
          parentCategory.children.push(categoryWithChildren);
        } else {
          rootCategories.push(categoryWithChildren);
        }
      }
    });
  }

  _filterBySearch(categories, searchTerm) {
    const matchesSearch = (category) => {
      const nameMatch = category.name.toLowerCase().includes(searchTerm);
      const descMatch =
        category.description && category.description.toLowerCase().includes(searchTerm);

      if (nameMatch || descMatch) return true;

      if (category.children && category.children.length > 0) {
        return category.children.some((child) => matchesSearch(child));
      }

      return false;
    };

    return categories.filter((category) => matchesSearch(category));
  }

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
