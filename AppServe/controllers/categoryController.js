// controllers/categoryController.js
const BaseController = require('./base/BaseController');
const Category = require('../models/Category');
const categoryWooCommerceService = require('../services/CategoryWooCommerceService');
const ResponseHandler = require('../handlers/ResponseHandler');
const { calculateLevel } = require('../utils/categoryHelpers');
const { getEntityEventService } = require('../services/events/entityEvents');

// Ajoutez cette fonction au début du fichier categoryController.js, après les imports
async function updateProductCategoryRefs(categoryId) {
  try {
    const Product = require('../models/Product');
    const Category = require('../models/Category');
    const eventService = getEntityEventService('categories');

    // Obtenir les détails de la catégorie
    const category = await Category.findById(categoryId);
    if (!category) {
      console.error(
        `[WS-DEBUG] Catégorie ${categoryId} non trouvée pour la mise à jour des références`
      );
      return;
    }

    // Trouver tous les produits liés à cette catégorie
    const allProducts = await Product.findAll();
    const linkedProducts = allProducts.filter(
      (product) =>
        (product.categories?.length > 0 && product.categories.includes(categoryId)) ||
        (product.category_id && product.category_id === categoryId)
    );

    if (linkedProducts.length === 0) {
      console.log(`[WS-DEBUG] Aucun produit lié à la catégorie ${categoryId} à mettre à jour`);
      return;
    }

    // Obtenir toutes les catégories pour les références
    const allCategories = await Category.findAll();

    // Mettre à jour les références pour chaque produit
    for (const product of linkedProducts) {
      if (!product.categories || product.categories.length === 0) continue;

      const categoryRefs = product.categories
        .map((catId) => {
          const cat = allCategories.find((c) => c._id === catId);
          if (cat) {
            return {
              id: cat._id,
              name: cat.name,
              woo_id: cat.woo_id || null,
            };
          }
          return null;
        })
        .filter((ref) => ref !== null);

      // Créer category_ref (première catégorie)
      const primaryCategoryRef =
        categoryRefs.length > 0
          ? {
              id: categoryRefs[0].id,
              name: categoryRefs[0].name,
            }
          : null;

      await Product.update(product._id, {
        categories_refs: categoryRefs,
        category_ref: primaryCategoryRef,
      });

      console.log(
        `[WS-DEBUG] Mise à jour des références de catégories pour le produit ${product._id}`
      );
    }

    console.log(
      `[WS-DEBUG] Mise à jour terminée pour ${linkedProducts.length} produits liés à la catégorie ${categoryId}`
    );
  } catch (error) {
    console.error('[WS-DEBUG] Erreur lors de la mise à jour des references de catégories:', error);
  }
}

// Fonction pour mettre à jour les produits après la suppression d'une catégorie
async function updateProductsAfterCategoryDeletion(categoryId) {
  try {
    const Product = require('../models/Product');
    const eventService = getEntityEventService('categories');
    const allProducts = await Product.findAll();

    // Trouver tous les produits qui utilisent cette catégorie
    const linkedProducts = allProducts.filter(
      (product) =>
        (product.categories?.length > 0 && product.categories.includes(categoryId)) ||
        (product.category_id && product.category_id === categoryId)
    );

    if (linkedProducts.length === 0) return;

    // Mise à jour de chaque produit
    for (const product of linkedProducts) {
      const updatedCategories = product.categories?.filter((id) => id !== categoryId) || [];
      const updatedCategoryId =
        product.category_id === categoryId
          ? updatedCategories.length > 0
            ? updatedCategories[0]
            : null
          : product.category_id;

      // Mise à jour de toutes les références de catégories
      const Category = require('../models/Category');
      const allCategories = await Category.findAll();

      const categoryRefs = updatedCategories
        .map((catId) => {
          const cat = allCategories.find((c) => c._id === catId);
          if (cat) {
            return {
              id: cat._id,
              name: cat.name,
              woo_id: cat.woo_id || null,
            };
          }
          return null;
        })
        .filter((ref) => ref !== null);

      // Créer category_ref (première catégorie)
      const primaryCategoryRef =
        categoryRefs.length > 0
          ? {
              id: categoryRefs[0].id,
              name: categoryRefs[0].name,
            }
          : null;

      await Product.update(product._id, {
        categories: updatedCategories,
        category_id: updatedCategoryId,
        categories_refs: categoryRefs,
        category_ref: primaryCategoryRef,
      });

      console.log(
        `[WS-DEBUG] Produit ${product._id} mis à jour après suppression de la catégorie ${categoryId}`
      );
    }
  } catch (error) {
    console.error(
      '[WS-DEBUG] Erreur lors de la mise à jour des produits après suppression de catégorie:',
      error
    );
  }
}

class CategoryController extends BaseController {
  constructor() {
    super(Category, categoryWooCommerceService, {
      entity: 'categories',
      type: 'single',
    });
    // S'assurer que le service d'événements est initialisé
    this.eventService = getEntityEventService(this.entityName);
  }

  async create(req, res) {
    try {
      // Vérifier les conditions préalables (ex. niveau si parent_id est présent)
      if (req.body.parent_id) {
        try {
          req.body.level = await calculateLevel(req.body.parent_id);
        } catch (levelError) {
          console.error('[WS-DEBUG] Erreur lors du calcul du niveau:', levelError);
          return ResponseHandler.error(res, 'Erreur lors du calcul du niveau');
        }
      } else {
        // Pour les catégories racines, le niveau est 0
        req.body.level = 0;
      }

      // Création de la catégorie
      const newCategory = await this.model.create(req.body);

      // Émettre l'événement de création via le service d'événements
      console.log(`[EVENT] Émission d'événement de création de catégorie: ${newCategory._id}`);
      this.eventService.created(newCategory);
      // Le service eventService.created s'occupe déjà d'émettre categoryTreeChanged si nécessaire

      if (this.shouldSync() && this.wooCommerceService) {
        try {
          const syncResult = await this.wooCommerceService.syncToWooCommerce([newCategory]);
          if (syncResult.errors.length > 0) {
            return ResponseHandler.partialSuccess(res, newCategory, {
              message: syncResult.errors.join(', '),
            });
          }
        } catch (syncError) {
          return ResponseHandler.partialSuccess(res, newCategory, syncError);
        }
      }

      return ResponseHandler.created(res, newCategory);
    } catch (error) {
      console.error('[WS-DEBUG] Erreur dans create() de categoryController:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    try {
      // Vérifier si la catégorie existe
      const category = await this.model.findById(req.params.id);
      if (!category) {
        console.error('[WS-DEBUG] Catégorie introuvable pour mise à jour:', req.params.id);
        return ResponseHandler.notFound(res, 'Catégorie non trouvée');
      }

      // Vérifier et recalculer le niveau de la catégorie si le parent_id a changé
      if (req.body.parent_id && req.body.parent_id !== category.parent_id) {
        try {
          req.body.level = await calculateLevel(req.body.parent_id);
        } catch (levelError) {
          console.error('[WS-DEBUG] Erreur lors du calcul du niveau:', levelError);
          return ResponseHandler.error(res, 'Erreur lors du calcul du niveau');
        }
      }

      // Mise à jour directe au lieu d'appeler super.update qui renvoie une réponse
      const id = req.params.id;
      const updateData = req.body;

      if (category.woo_id) {
        updateData.pending_sync = true;
      }

      await this.model.update(id, updateData);
      const updatedItem = await this.model.findById(id);

      // Émettre l'événement de mise à jour via le service d'événements
      this.eventService.updated(id, updatedItem);
      // La méthode updated gère également l'émission de categoryTreeChanged si nécessaire

      // Vérifier si le nom ou la hiérarchie a changé
      if (updateData.name || updateData.parent_id) {
        console.log('[WS-DEBUG] Mise à jour de la catégorie, émission de categories.tree.changed');
        // Mettre à jour les références dans les produits
        await updateProductCategoryRefs(id);
      }

      // Gestion de la synchronisation WooCommerce si nécessaire
      if (this.shouldSync() && this.wooCommerceService) {
        try {
          await this.wooCommerceService.syncToWooCommerce([updatedItem]);
          await this.model.update(id, { pending_sync: false });
        } catch (syncError) {
          return ResponseHandler.partialSuccess(res, updatedItem, syncError);
        }
      }

      return ResponseHandler.success(res, updatedItem);
    } catch (error) {
      console.error('[WS-DEBUG] Erreur dans update() de categoryController:', error);
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    try {
      const item = await this.model.findById(req.params.id);
      if (!item) return ResponseHandler.notFound(res);

      // Vérification des sous-catégories
      if (item.level === 0) {
        const allCategories = await this.model.findAll();
        const children = allCategories.filter((cat) => cat.parent_id === req.params.id);
        if (children.length > 0) {
          return ResponseHandler.error(res, {
            status: 400,
            message: `Impossible de supprimer la catégorie : ${children.length} sous-catégorie(s) existante(s)`,
          });
        }
      }

      // Vérification des produits liés
      const Product = require('../models/Product');
      const allProducts = await Product.findAll();
      const linkedProducts = allProducts.filter(
        (product) =>
          (product.categories?.length > 0 && product.categories.includes(item._id)) ||
          (product.category_id && product.category_id === item._id)
      );

      if (linkedProducts.length > 0) {
        return ResponseHandler.error(res, {
          status: 400,
          message: `Impossible de supprimer la catégorie : ${linkedProducts.length} produit(s) lié(s)`,
        });
      }

      // Si l'entité est synchronisée avec WooCommerce, la supprimer d'abord de WC
      if (item.woo_id) {
        try {
          console.log(
            `[WS-DEBUG] Suppression de la catégorie ${item._id} de WooCommerce (woo_id: ${item.woo_id})`
          );
          const categoryWooService = require('../services/CategoryWooCommerceService');
          await categoryWooService.deleteCategory(item._id);
          console.log(`[WS-DEBUG] Catégorie supprimée de WooCommerce avec succès`);
        } catch (wcError) {
          console.error(`[WS-DEBUG] Erreur lors de la suppression WooCommerce:`, wcError);
          // On continue malgré l'erreur pour supprimer en local
        }
      }

      await this.handleImageDeletion(item);
      await updateProductsAfterCategoryDeletion(req.params.id);
      await this.model.delete(req.params.id);

      // Notification via le service d'événements
      this.eventService.deleted(req.params.id);

      return ResponseHandler.success(res, {
        message: 'Catégorie supprimée avec succès',
        woo_status: item.woo_id ? 'synchronized' : 'not_applicable',
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

// Nouvelle fonction pour les catégories hiérarchiques
async function getHierarchicalCategories(req, res) {
  try {
    // Récupération de toutes les catégories
    const allCategories = await Category.findAll();

    // Récupération de tous les produits pour compter
    const Product = require('../models/Product');
    const allProducts = await Product.findAll();

    // Organiser les catégories par niveau
    const rootCategories = [];
    const categoriesMap = new Map();

    // Première passe : créer la map des catégories avec compteur de produits
    allCategories.forEach((category) => {
      // Filtrer les produits pour cette catégorie
      const categoryProducts = allProducts.filter(
        (product) =>
          (product.categories && product.categories.includes(category._id)) ||
          product.category_id === category._id
      );

      // Collecter les IDs et noms des produits pour référence rapide
      const productsList = categoryProducts.map((product) => ({
        _id: product._id,
        name: product.name,
        sku: product.sku || null,
      }));

      // Pour chaque catégorie, ajouter un tableau children vide, le compteur et les produits
      categoriesMap.set(category._id, {
        ...category,
        children: [],
        productCount: categoryProducts.length,
        products: productsList,
      });
    });

    // Deuxième passe : organiser la hiérarchie
    allCategories.forEach((category) => {
      const categoryWithChildren = categoriesMap.get(category._id);

      if (!category.parent_id) {
        // C'est une catégorie racine (niveau 0)
        rootCategories.push(categoryWithChildren);
      } else {
        // C'est une sous-catégorie, l'ajouter aux enfants du parent
        const parentCategory = categoriesMap.get(category.parent_id);
        if (parentCategory) {
          parentCategory.children.push(categoryWithChildren);
        } else {
          // Si le parent n'existe pas, traiter comme une catégorie racine
          console.warn(
            `Parent introuvable pour la catégorie ${category._id} (parent_id: ${category.parent_id})`
          );
          rootCategories.push(categoryWithChildren);
        }
      }
    });

    // Trier les catégories par nom
    rootCategories.sort((a, b) => a.name.localeCompare(b.name));

    // Trier récursivement les enfants
    const sortChildren = (categories) => {
      categories.forEach((category) => {
        if (category.children && category.children.length > 0) {
          category.children.sort((a, b) => a.name.localeCompare(b.name));
          sortChildren(category.children);
        }
      });
    };

    sortChildren(rootCategories);

    return ResponseHandler.success(res, rootCategories);
  } catch (error) {
    console.error('Erreur dans getHierarchicalCategories:', error);
    return ResponseHandler.error(res, error);
  }
}

const categoryController = new CategoryController();
module.exports = {
  getAll: categoryController.getAll.bind(categoryController),
  getById: categoryController.getById.bind(categoryController),
  create: categoryController.create.bind(categoryController),
  update: categoryController.update.bind(categoryController),
  delete: categoryController.delete.bind(categoryController),
  uploadImage: categoryController.uploadImage,
  updateImageMetadata: categoryController.updateImageMetadata,
  deleteImage: categoryController.deleteImage,
  getHierarchicalCategories: getHierarchicalCategories,
};
