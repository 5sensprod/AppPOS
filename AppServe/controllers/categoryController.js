// AppServe\controllers\categoryController.js
const BaseController = require('./base/BaseController');
const Category = require('../models/Category');
const categoryWooCommerceService = require('../services/CategoryWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');
const {
  buildCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../services/categoryService');
const { getEntityEventService } = require('../services/events/entityEvents');

// Fonction simple de transformation du nom (première lettre majuscule, reste en minuscules)
function formatCategoryName(name) {
  if (!name || typeof name !== 'string') return name;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

// Formater chaque segment du chemin de catégorie
function formatCategoryPath(pathString) {
  if (!pathString) return pathString;

  // Séparer les segments, formater chacun, puis rejoindre
  return pathString
    .split(' > ')
    .map((segment) => formatCategoryName(segment))
    .join(' > ');
}

function formatTreePaths(categories) {
  return categories.map((category) => {
    const formattedCategory = { ...category };

    // Formater path_string si présent
    if (formattedCategory.path_string) {
      formattedCategory.path_string = formatCategoryPath(formattedCategory.path_string);
    }

    // Formater aussi dans les category_info si présent (pour les produits)
    if (formattedCategory.category_info?.refs) {
      formattedCategory.category_info.refs = formattedCategory.category_info.refs.map((ref) => ({
        ...ref,
        path_string: formatCategoryPath(ref.path_string),
        path: ref.path ? ref.path.map((p) => formatCategoryName(p)) : ref.path,
      }));

      if (formattedCategory.category_info.primary) {
        formattedCategory.category_info.primary = {
          ...formattedCategory.category_info.primary,
          path_string: formatCategoryPath(formattedCategory.category_info.primary.path_string),
          path: formattedCategory.category_info.primary.path
            ? formattedCategory.category_info.primary.path.map((p) => formatCategoryName(p))
            : formattedCategory.category_info.primary.path,
        };
      }
    }

    // Traiter récursivement les enfants
    if (Array.isArray(formattedCategory.children) && formattedCategory.children.length > 0) {
      formattedCategory.children = formatTreePaths(formattedCategory.children);
    }

    return formattedCategory;
  });
}

// Transformer récursivement les noms dans une arborescence
function formatCategoryNamesInTree(categories) {
  if (!Array.isArray(categories)) return categories;

  return categories.map((category) => {
    // Copier l'objet pour ne pas modifier l'original
    const formattedCategory = { ...category };

    // Formater le nom sans toucher aux autres propriétés
    if (formattedCategory.name) {
      formattedCategory.name = formatCategoryName(formattedCategory.name);
    }

    // Traiter récursivement les enfants
    if (Array.isArray(formattedCategory.children) && formattedCategory.children.length > 0) {
      formattedCategory.children = formatCategoryNamesInTree(formattedCategory.children);
    }

    return formattedCategory;
  });
}

class CategoryController extends BaseController {
  constructor() {
    super(Category, categoryWooCommerceService, {
      image: { type: 'single' },
      deleteFromWoo: (id) => categoryWooCommerceService.deleteCategory(id),
    });
    this.eventService = getEntityEventService(this.entityName);
  }

  async getAll(req, res) {
    try {
      const categories = await this.model.findAll();

      // Transformer les noms (mais pas les autres propriétés)
      const formattedCategories = categories.map((category) => ({
        ...category,
        name: formatCategoryName(category.name),
      }));

      return ResponseHandler.success(res, formattedCategories);
    } catch (error) {
      console.error('[CategoryController] Erreur getAll:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async getById(req, res) {
    try {
      const category = await this.getByIdOr404(req.params.id, res);
      if (!category) return;

      // Formater le nom uniquement
      const formattedCategory = {
        ...category,
        name: formatCategoryName(category.name),
      };

      return ResponseHandler.success(res, formattedCategory);
    } catch (error) {
      console.error('[CategoryController] Erreur getById:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async create(req, res) {
    try {
      const category = await createCategory(req.body);
      const syncResult = await this.syncIfNeeded([category], res);
      if (syncResult) return syncResult;

      // Formatter le nom dans la réponse
      const formattedCategory = {
        ...category,
        name: formatCategoryName(category.name),
      };

      return ResponseHandler.created(res, formattedCategory);
    } catch (error) {
      console.error('[CategoryController] Erreur create:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const existing = await this.getByIdOr404(req.params.id, res);
      if (!existing) return;

      const updated = await updateCategory(req.params.id, req.body);
      const syncResult = await this.syncIfNeeded([updated], res);
      if (syncResult) return syncResult;

      // Formatter le nom dans la réponse
      const formattedUpdated = {
        ...updated,
        name: formatCategoryName(updated.name),
      };

      return ResponseHandler.success(res, formattedUpdated);
    } catch (error) {
      console.error('[CategoryController] Erreur update:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const category = await this.getByIdOr404(req.params.id, res);
      if (!category) return;

      await this.handleImageDeletion(category);
      await this.handleWooCommerceDelete(category);

      const result = await deleteCategory(category);
      return ResponseHandler.success(res, result);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

// 🔁 Route personnalisée : arborescence hiérarchique
async function getHierarchicalCategories(req, res) {
  try {
    const allCategories = await Category.findAll();
    const Product = require('../models/Product');
    const allProducts = await Product.findAll();

    // 1. Construire l'arbre
    let tree = buildCategoryTree(allCategories, allProducts);

    // 2. Formater les noms dans l'arbre
    tree = formatCategoryNamesInTree(tree);

    // 3. Formater les path_string dans l'arbre
    tree = formatTreePaths(tree);

    return ResponseHandler.success(res, tree);
  } catch (error) {
    console.error('Erreur dans getHierarchicalCategories:', error);
    return ResponseHandler.error(res, error);
  }
}

const categoryController = new CategoryController();

const exportController = require('../utils/exportController');

module.exports = {
  ...exportController(categoryController, [
    'getAll',
    'getById',
    'create',
    'update',
    'delete',
    'uploadImage',
    'updateImageMetadata',
    'deleteImage',
  ]),
  getHierarchicalCategories,
};
