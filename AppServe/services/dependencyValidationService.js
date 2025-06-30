// services/dependencyValidationService.js
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const Category = require('../models/Category');

class DependencyValidationService {
  async checkProductDependencies(entityType, entityId, options = {}) {
    const { includeDetails = false, maxDetails = 50 } = options;

    let linkedProducts = [];

    switch (entityType) {
      case 'brand':
        linkedProducts = await Product.find({ brand_id: entityId });
        break;
      case 'supplier':
        linkedProducts = await Product.find({ supplier_id: entityId });
        break;
      case 'category':
        const allProducts = await Product.findAll();
        linkedProducts = allProducts.filter(
          (product) =>
            product.category_id === entityId ||
            (product.categories && product.categories.includes(entityId))
        );
        break;
      default:
        throw new Error(`Type d'entité non supporté: ${entityType}`);
    }

    const hasProducts = linkedProducts.length > 0;
    const count = linkedProducts.length;

    let productDetails = null;
    if (includeDetails && hasProducts) {
      productDetails = linkedProducts.slice(0, maxDetails).map((product) => ({
        _id: product._id,
        name: product.name,
        sku: product.sku || null,
        ...(entityType !== 'supplier' &&
          product.supplier_id && { supplier_id: product.supplier_id }),
        ...(entityType !== 'brand' && product.brand_id && { brand_id: product.brand_id }),
        ...(entityType !== 'category' &&
          product.category_id && { category_id: product.category_id }),
      }));
    }

    return {
      hasProducts,
      count,
      productDetails,
      hasMore: includeDetails && linkedProducts.length > maxDetails,
    };
  }

  async validateDeletionSafety(entityType, entityId, options = {}) {
    const { includeDetails = true } = options;

    const result = await this.checkProductDependencies(entityType, entityId, {
      includeDetails,
      maxDetails: 50,
    });

    if (result.hasProducts) {
      const messages = {
        brand: 'La marque contient un/des produits associés',
        supplier: `Impossible de supprimer ce fournisseur : ${result.count} produit(s) encore lié(s)`,
        category: `Impossible de supprimer : ${result.count} produit(s) lié(s)`,
      };

      const message =
        messages[entityType] ||
        `Impossible de supprimer cette ${entityType} : ${result.count} produit(s) encore lié(s)`;

      const error = new Error(message);
      error.code = 'DEPENDENCY_VIOLATION';
      error.entityType = entityType;
      error.entityId = entityId;
      error.dependencyCount = result.count;

      if (includeDetails) {
        error.linkedProducts = result.productDetails;
        error.hasMore = result.hasMore;
      }

      throw error;
    }

    return true;
  }

  async validateCategoryHierarchy(categoryId) {
    const allCategories = await Category.findAll();
    const children = allCategories.filter((cat) => cat.parent_id === categoryId);

    if (children.length > 0) {
      const error = new Error(
        `Impossible de supprimer la catégorie : ${children.length} sous-catégorie(s) existante(s)`
      );
      error.code = 'HIERARCHY_VIOLATION';
      error.children = children.map((child) => ({
        _id: child._id,
        name: child.name,
      }));
      throw error;
    }

    return true;
  }

  async validateSupplierBrandDependencies(supplierId) {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) return true;

    const brands = supplier.brands || [];
    if (brands.length === 0) return true;

    const brandsWithProducts = [];

    for (const brandId of brands) {
      const brand = await Brand.findById(brandId);
      if (brand && brand.products_count > 0) {
        const brandProducts = await Product.find({ brand_id: brandId });
        if (brandProducts.length > 0) {
          brandsWithProducts.push({
            _id: brand._id,
            name: brand.name,
            productCount: brandProducts.length,
            products: brandProducts.slice(0, 10).map((p) => ({
              _id: p._id,
              name: p.name,
              sku: p.sku || null,
            })),
          });
        }
      }
    }

    if (brandsWithProducts.length > 0) {
      const error = new Error('Le fournisseur contient des marques avec des produits associés');
      error.code = 'BRAND_DEPENDENCY_VIOLATION';
      error.brandsWithProducts = brandsWithProducts;
      throw error;
    }

    return true;
  }

  async validateCompleteEntityDeletion(entityType, entity, options = {}) {
    const { includeDetails = true } = options;

    switch (entityType) {
      case 'category':
        await this.validateCategoryHierarchy(entity._id);
        await this.validateDeletionSafety('category', entity._id, { includeDetails });
        break;

      case 'supplier':
        await this.validateDeletionSafety('supplier', entity._id, { includeDetails });
        await this.validateSupplierBrandDependencies(entity._id);
        break;

      case 'brand':
        await this.validateDeletionSafety('brand', entity._id, { includeDetails });
        break;

      default:
        throw new Error(`Type d'entité non supporté: ${entityType}`);
    }

    return true;
  }
}

module.exports = new DependencyValidationService();
