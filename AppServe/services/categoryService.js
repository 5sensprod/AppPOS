// services/categoryService.js
const Category = require('../models/Category');
const Product = require('../models/Product');
const { calculateLevel } = require('../utils/categoryHelpers');

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

module.exports = {
  calculateLevel,
  hasChildren,
  getLinkedProducts,
  removeCategoryFromProducts,
  buildCategoryTree,
};
