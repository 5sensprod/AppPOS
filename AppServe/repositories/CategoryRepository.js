// repositories/CategoryRepository.js
const Category = require('../models/Category');
const Product = require('../models/Product');

/**
 * Repository pour les opérations de base de données liées aux catégories
 */
class CategoryRepository {
  /**
   * Récupère toutes les catégories
   */
  async findAll() {
    return await Category.findAll();
  }

  /**
   * Récupère une catégorie par son ID
   */
  async findById(id) {
    return await Category.findById(id);
  }

  /**
   * Trouve les sous-catégories d'une catégorie parent
   */
  async findChildCategories(parentId) {
    const allCategories = await this.findAll();
    return allCategories.filter((category) => category.parent_id === parentId);
  }

  /**
   * Crée une nouvelle catégorie
   */
  async create(categoryData) {
    return await Category.create(categoryData);
  }

  /**
   * Met à jour une catégorie existante
   */
  async update(id, updateData) {
    return await Category.update(id, updateData);
  }

  /**
   * Supprime une catégorie
   */
  async delete(id) {
    return await Category.delete(id);
  }

  /**
   * Trouve les produits liés à une catégorie
   */
  async findLinkedProducts(categoryId) {
    const allProducts = await Product.findAll();
    return allProducts.filter(
      (product) =>
        (product.categories?.length > 0 && product.categories.includes(categoryId)) ||
        (product.category_id && product.category_id === categoryId)
    );
  }

  /**
   * Vérifie si la catégorie peut être supprimée
   * (pas de sous-catégories ni de produits liés)
   */
  async canDelete(categoryId) {
    const category = await this.findById(categoryId);
    if (!category) {
      return { canDelete: false, message: 'Catégorie non trouvée' };
    }

    // Vérifier les sous-catégories
    if (category.level === 0) {
      const children = await this.findChildCategories(categoryId);
      if (children.length > 0) {
        return {
          canDelete: false,
          message: `Impossible de supprimer la catégorie : ${children.length} sous-catégorie(s) existante(s)`,
        };
      }
    }

    // Vérifier les produits liés
    const linkedProducts = await this.findLinkedProducts(categoryId);
    if (linkedProducts.length > 0) {
      return {
        canDelete: false,
        message: `Impossible de supprimer la catégorie : ${linkedProducts.length} produit(s) lié(s)`,
      };
    }

    return { canDelete: true, category };
  }

  /**
   * Construit la hiérarchie complète des catégories
   */
  async buildHierarchy(search = '') {
    const allCategories = await this.findAll();
    const allProducts = await Product.findAll();

    // Map pour stocker les catégories et leurs enfants
    const categoriesMap = new Map();
    const rootCategories = [];

    // Préparer les catégories avec productCount et children
    allCategories.forEach((category) => {
      // Trouver les produits de cette catégorie
      const categoryProducts = allProducts.filter(
        (product) =>
          (product.categories && product.categories.includes(category._id)) ||
          product.category_id === category._id
      );

      const productsList = categoryProducts.map((product) => ({
        _id: product._id,
        name: product.name,
        sku: product.sku || null,
      }));

      // Ajouter à la map
      categoriesMap.set(category._id, {
        ...category,
        children: [],
        productCount: categoryProducts.length,
        products: productsList,
      });
    });

    // Organiser la hiérarchie
    allCategories.forEach((category) => {
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

    // Filtrer par recherche si demandé
    if (search) {
      const lowerSearch = search.toLowerCase();
      const filteredCategories = this._filterCategoriesBySearch(rootCategories, lowerSearch);
      this._sortCategoriesRecursively(filteredCategories);
      return filteredCategories;
    }

    // Trier les catégories
    this._sortCategoriesRecursively(rootCategories);
    return rootCategories;
  }

  /**
   * Méthode privée pour filtrer les catégories par terme de recherche
   */
  _filterCategoriesBySearch(categories, searchTerm) {
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

  /**
   * Méthode privée pour trier les catégories par nom
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

module.exports = new CategoryRepository();
