// src/hooks/useCategoryTree.js - VERSION STORES DIRECTS SIMPLE
import { useState, useCallback, useMemo } from 'react';
import { useProductDataStore } from '../features/products/stores/productStore';
import { useHierarchicalCategories } from '../features/categories/stores/categoryHierarchyStore';

/**
 * Hook personnalisé pour gérer l'arbre de catégories avec stock - VERSION SIMPLE
 * 🚀 Utilise directement les stores optimisés
 */
export const useCategoryTree = () => {
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // 🚀 STORES DIRECTS
  const { products, loading: loadingProducts, fetchProducts } = useProductDataStore();
  const {
    hierarchicalCategories,
    loading: loadingCategories,
    fetchHierarchicalCategories,
  } = useHierarchicalCategories();

  /**
   * 🚀 CONSTRUCTION OPTIMISÉE : Arbre depuis les stores directs
   */
  const categoryTree = useMemo(() => {
    if (!hierarchicalCategories || !products) return [];

    console.log('🔄 Construction arbre depuis stores directs...');

    // Produits simples en stock
    const productsInStock = products.filter((product) => {
      return (product.type === 'simple' || !product.type) && (product.stock || 0) > 0;
    });

    // Fonction pour enrichir une catégorie avec les comptages
    const enrichCategory = (category) => {
      // Produits directs dans cette catégorie
      const directProducts = productsInStock.filter((product) => {
        const productCategories = product.categories || [product.categoryId].filter(Boolean);
        return productCategories.includes(category._id);
      });

      // Enrichir les enfants récursivement
      const enrichedChildren = category.children ? category.children.map(enrichCategory) : [];

      // Total produits (directs + sous-catégories)
      const totalFromChildren = enrichedChildren.reduce(
        (sum, child) => sum + child.totalProductsInStock,
        0
      );
      const totalProductsInStock = directProducts.length + totalFromChildren;

      return {
        ...category,
        children: enrichedChildren,
        productsInStock: directProducts,
        productsInStockCount: directProducts.length,
        totalProductsInStock,
      };
    };

    // Enrichir toutes les catégories racines et filtrer celles avec stock
    const enrichedTree = hierarchicalCategories
      .map(enrichCategory)
      .filter((cat) => cat.totalProductsInStock > 0);

    console.log(`✅ ${enrichedTree.length} catégories avec stock (depuis stores directs)`);
    return enrichedTree;
  }, [hierarchicalCategories, products]);

  /**
   * 🚀 CHARGEMENT OPTIMISÉ : Utilise les stores directs
   */
  const fetchCategoriesWithStock = useCallback(async () => {
    try {
      console.log('🔄 Chargement données depuis stores directs...');

      // Charger en parallèle depuis les stores directs
      const promises = [];

      if (!hierarchicalCategories || hierarchicalCategories.length === 0) {
        promises.push(fetchHierarchicalCategories());
      }

      if (!products || products.length === 0) {
        promises.push(fetchProducts());
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        console.log('✅ Données chargées depuis stores directs');
      } else {
        console.log('✅ Données déjà disponibles dans les stores');
      }
    } catch (err) {
      console.error('❌ Erreur chargement stores directs:', err);
    }
  }, [hierarchicalCategories, products, fetchHierarchicalCategories, fetchProducts]);

  /**
   * Bascule l'expansion d'une catégorie
   */
  const toggleCategoryExpansion = useCallback((categoryId) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  /**
   * Collecte récursivement tous les IDs de catégories
   */
  const collectAllCategoryIds = useCallback((categories) => {
    let ids = [];
    categories.forEach((cat) => {
      ids.push(cat._id);
      if (cat.children && cat.children.length > 0) {
        ids.push(...collectAllCategoryIds(cat.children));
      }
    });
    return ids;
  }, []);

  /**
   * Sélectionne toutes les catégories
   */
  const selectAllCategories = useCallback(() => {
    return collectAllCategoryIds(categoryTree);
  }, [categoryTree, collectAllCategoryIds]);

  /**
   * Développe toutes les catégories
   */
  const expandAllCategories = useCallback(() => {
    const allIds = collectAllCategoryIds(categoryTree);
    setExpandedCategories(new Set(allIds));
  }, [categoryTree, collectAllCategoryIds]);

  /**
   * Réduit toutes les catégories
   */
  const collapseAllCategories = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  /**
   * Calcule le nombre total de produits sélectionnés
   */
  const getSelectedProductsCount = useCallback(
    (selectedCategories) => {
      if (!selectedCategories || selectedCategories.length === 0) return 0;

      const calculateTotal = (categories) => {
        return categories.reduce((total, cat) => {
          let catTotal = 0;
          if (selectedCategories.includes(cat._id)) {
            catTotal += cat.totalProductsInStock || 0;
          }
          if (cat.children) {
            catTotal += calculateTotal(cat.children);
          }
          return total + catTotal;
        }, 0);
      };

      return calculateTotal(categoryTree);
    },
    [categoryTree]
  );

  /**
   * Gère la sélection/désélection d'une catégorie avec ses descendants
   */
  const handleCategorySelection = useCallback(
    (category, isChecking, currentSelection) => {
      const categoryAndDescendants = [category._id];
      const hasChildren = category.children && category.children.length > 0;

      if (hasChildren) {
        categoryAndDescendants.push(...collectAllCategoryIds(category.children));
      }

      if (isChecking) {
        const newSelections = categoryAndDescendants.filter((id) => !currentSelection.includes(id));
        return [...currentSelection, ...newSelections];
      } else {
        return currentSelection.filter((id) => !categoryAndDescendants.includes(id));
      }
    },
    [collectAllCategoryIds]
  );

  /**
   * 📊 STATISTIQUES DES CATÉGORIES (pour compatibility)
   */
  const getCategoryStats = useCallback(() => {
    return categoryTree.reduce((stats, category) => {
      stats[category._id] = {
        productCount: category.productsInStockCount,
        totalProductCount: category.totalProductsInStock,
      };
      return stats;
    }, {});
  }, [categoryTree]);

  return {
    // État - API compatible
    categoryTree,
    loadingCategories: loadingCategories || loadingProducts,
    expandedCategories,

    // Actions - API compatible
    fetchCategoriesWithStock,
    toggleCategoryExpansion,
    expandAllCategories,
    collapseAllCategories,
    selectAllCategories,
    deselectAllCategories: () => [],
    handleCategorySelection,
    collectAllCategoryIds,
    getSelectedProductsCount,
    getCategoryStats,

    // Données brutes pour useAdvancedPDFExport
    rawData: {
      hierarchicalCategories,
      products,
      productsInStock: products ? products.filter((p) => (p.stock || 0) > 0) : [],
    },
  };
};

export default useCategoryTree;
