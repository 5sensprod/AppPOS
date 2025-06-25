// src/hooks/useCategoryTree.js - VERSION OPTIMISÉE AVEC ZUSTAND
import { useState, useCallback, useMemo } from 'react';
import useReportsStore from '../stores/useReportsStore';

/**
 * Hook personnalisé pour gérer l'arbre de catégories avec stock - VERSION ZUSTAND
 * 🚀 Utilise les données du store au lieu d'appels API séparés
 */
export const useCategoryTree = () => {
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // 🚀 ZUSTAND : Utiliser les données du store
  const { categories, products, loading, fetchCategories, fetchProducts, fetchAllReportsData } =
    useReportsStore();

  /**
   * 🚀 OPTIMISATION : Construction de l'arbre à partir des données du store
   */
  const categoryTree = useMemo(() => {
    if (!categories || !products) return [];

    console.log("🔄 Construction de l'arbre depuis le store...");

    // Créer un map des produits avec stock
    const productsMap = {};
    products.forEach((product) => {
      if (product.type === 'simple' && (product.stock || 0) > 0) {
        productsMap[product._id] = { ...product, hasStock: true };
      }
    });

    // Construction de l'arbre hiérarchique
    const rootCategories = [];
    const categoryMap = {};

    // Créer la map des catégories
    categories.forEach((cat) => {
      categoryMap[cat._id] = {
        ...cat,
        children: [],
        productsInStock: [],
        productsInStockCount: 0,
        totalProductsInStock: 0,
      };
    });

    // Construire la hiérarchie
    categories.forEach((cat) => {
      if (cat.parent_id && categoryMap[cat.parent_id]) {
        categoryMap[cat.parent_id].children.push(categoryMap[cat._id]);
      } else {
        rootCategories.push(categoryMap[cat._id]);
      }
    });

    // Ajouter les produits aux catégories et calculer les totaux
    const calculateProductsInStock = (category) => {
      // Produits directs de cette catégorie
      const directProducts = products.filter(
        (product) => product.categories?.includes(category._id) && productsMap[product._id]
      );

      category.productsInStock = directProducts;
      category.productsInStockCount = directProducts.length;
      category.totalProductsInStock = directProducts.length;

      // Ajouter récursivement les produits des enfants
      if (category.children) {
        category.children.forEach((child) => {
          calculateProductsInStock(child);
          category.totalProductsInStock += child.totalProductsInStock;
        });
      }

      return category.totalProductsInStock;
    };

    // Calculer pour toutes les catégories racines
    rootCategories.forEach(calculateProductsInStock);

    // Filtrer pour ne garder que celles avec du stock
    const filteredTree = rootCategories.filter((cat) => cat.totalProductsInStock > 0);

    console.log(`✅ ${filteredTree.length} catégories racines avec stock construites`);
    return filteredTree;
  }, [categories, products]);

  /**
   * 🚀 OPTIMISATION : Chargement depuis le store
   */
  const fetchCategoriesWithStock = useCallback(async () => {
    try {
      // Si on a déjà les données, pas besoin de recharger
      if (categories && products) {
        console.log('✅ Données déjà disponibles dans le store');
        return;
      }

      console.log("🔄 Chargement des données pour l'arbre...");

      // Charger toutes les données en parallèle via le store
      await fetchAllReportsData();
    } catch (err) {
      console.error('❌ Erreur chargement données:', err);

      // Fallback : charger séparément
      try {
        await Promise.all([fetchCategories(), fetchProducts()]);
      } catch (fallbackErr) {
        console.error('❌ Erreur fallback:', fallbackErr);
      }
    }
  }, [categories, products, fetchAllReportsData, fetchCategories, fetchProducts]);

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

  return {
    // État - API identique
    categoryTree,
    loadingCategories: loading.categories || loading.products,
    expandedCategories,

    // Actions - API identique
    fetchCategoriesWithStock,
    toggleCategoryExpansion,
    expandAllCategories,
    collapseAllCategories,
    selectAllCategories,
    deselectAllCategories: () => [],
    handleCategorySelection,
    collectAllCategoryIds,
    getSelectedProductsCount,
  };
};

export default useCategoryTree;
