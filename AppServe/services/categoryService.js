const Category = require('../models/Category');
const Product = require('../models/Product');
const { getEntityEventService } = require('../services/events/entityEvents');
const { calculateLevel } = require('../utils/categoryHelpers');

// ------- EXISTANT -------
async function hasChildren(categoryId) {
  const allCategories = await Category.findAll();
  return allCategories.some((cat) => cat.parent_id === categoryId);
}

async function getLinkedProducts(categoryId) {
  const allProducts = await Product.findAll();
  return allProducts.filter(
    (product) => product.categories?.includes(categoryId) || product.category_id === categoryId
  );
}

async function removeCategoryFromProducts(categoryId) {
  const linkedProducts = await getLinkedProducts(categoryId);
  if (linkedProducts.length === 0) return;

  for (const product of linkedProducts) {
    const updatedCategories = product.categories?.filter((id) => id !== categoryId) || [];
    const updatedCategoryId =
      product.category_id === categoryId
        ? updatedCategories.length > 0
          ? updatedCategories[0]
          : null
        : product.category_id;

    await Product.update(product._id, {
      categories: updatedCategories,
      category_id: updatedCategoryId,
    });
  }
}

function buildCategoryTree(allCategories, allProducts) {
  const rootCategories = [];
  const categoriesMap = new Map();

  allCategories.forEach((category) => {
    const categoryProducts = allProducts.filter((product) =>
      product.categories?.includes(category._id)
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
      path: [category.name],
      path_ids: [category._id],
      path_string: category.name,
    });
  });

  allCategories.forEach((category) => {
    const node = categoriesMap.get(category._id);
    if (!category.parent_id) {
      rootCategories.push(node);
    } else {
      const parent = categoriesMap.get(category.parent_id);
      if (parent) {
        parent.children.push(node);
        node.path = [...parent.path, node.name];
        node.path_ids = [...parent.path_ids, node._id];
        node.path_string = node.path.join(' > ');
      } else {
        rootCategories.push(node);
      }
    }
  });

  const sortChildren = (categories) => {
    categories.forEach((cat) => {
      cat.children.sort((a, b) => a.name.localeCompare(b.name));
      sortChildren(cat.children);
    });
  };

  rootCategories.sort((a, b) => a.name.localeCompare(b.name));
  sortChildren(rootCategories);

  return rootCategories;
}

// ------- MÉTIER : create/update/delete --------
async function createCategory(data) {
  if (data.parent_id) {
    data.level = await calculateLevel(data.parent_id);
  } else {
    data.level = 0;
  }

  const newCategory = await Category.create(data);
  const categoryEvents = getEntityEventService('categories');
  categoryEvents.created(newCategory);
  return newCategory;
}

async function updateCategory(id, data) {
  const category = await Category.findById(id);
  if (!category) throw new Error('Catégorie introuvable');

  if (data.parent_id && data.parent_id !== category.parent_id) {
    data.level = await calculateLevel(data.parent_id);
  }

  if (category.woo_id) data.pending_sync = true;

  await Category.update(id, data);
  const updated = await Category.findById(id);

  getEntityEventService('categories').updated(id, updated);
  return updated;
}

async function deleteCategory(category) {
  const { _id, woo_id } = category;
  const categoryEvents = getEntityEventService('categories');

  const hasChildrenCat = await hasChildren(_id);
  if (hasChildrenCat) {
    throw new Error(`Impossible de supprimer la catégorie : des sous-catégories existent`);
  }

  const linkedProducts = await getLinkedProducts(_id);
  if (linkedProducts.length > 0) {
    throw new Error(`Impossible de supprimer : ${linkedProducts.length} produit(s) lié(s)`);
  }

  await removeCategoryFromProducts(_id);
  await Category.delete(_id);

  categoryEvents.deleted(_id);
  return {
    message: 'Catégorie supprimée avec succès',
    woo_status: woo_id ? 'synchronized' : 'not_applicable',
  };
}

// ------- EXPORT -------
module.exports = {
  calculateLevel,
  hasChildren,
  getLinkedProducts,
  removeCategoryFromProducts,
  buildCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
};
