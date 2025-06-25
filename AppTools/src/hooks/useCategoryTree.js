// src/hooks/useCategoryTree.js
// 🔧 VERSION CORRIGÉE avec export par défaut

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

/**
 * Hook personnalisé pour gérer l'arbre de catégories avec stock
 * @returns {Object} État et fonctions de gestion de l'arbre
 */
export const useCategoryTree = () => {
  const [categoryTree, setCategoryTree] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  /**
   * Filtre récursivement les catégories pour ne garder que celles avec du stock
   */
  const filterCategoriesWithStock = useCallback((categories, productsMap) => {
    return categories
      .map((category) => {
        // Croiser les produits de la catégorie avec ceux qui ont du stock
        const productsInStock = (category.products || []).filter(
          (product) => productsMap[product._id] // Le produit existe et a du stock
        );

        // Filtrer récursivement les enfants
        const filteredChildren = category.children
          ? filterCategoriesWithStock(category.children, productsMap)
          : [];

        // Calculer le total de produits en stock (cette catégorie + enfants)
        const totalProductsInStock =
          productsInStock.length +
          filteredChildren.reduce((sum, child) => sum + (child.totalProductsInStock || 0), 0);

        // Garder la catégorie si elle a des produits en stock (directement ou via enfants)
        if (totalProductsInStock > 0) {
          return {
            ...category,
            children: filteredChildren,
            productsInStock: productsInStock, // Produits enrichis avec données de stock
            productsInStockCount: productsInStock.length,
            totalProductsInStock: totalProductsInStock,
            isExpanded: false,
          };
        }

        return null;
      })
      .filter(Boolean); // Supprimer les nulls
  }, []);

  /**
   * Récupère l'arbre hiérarchique des catégories avec les données de stock
   */
  const fetchCategoriesWithStock = useCallback(async () => {
    setLoadingCategories(true);
    try {
      console.log("🔄 Chargement de l'arbre hiérarchique et des données de stock...");

      // Récupérer à la fois l'arbre hiérarchique ET les produits avec stock
      const [hierarchicalResponse, productsResponse] = await Promise.all([
        apiService.get('/api/categories/hierarchical'),
        apiService.get('/api/products'),
      ]);

      const hierarchicalData = hierarchicalResponse.data.data || [];
      const allProducts = productsResponse.data.data || [];

      console.log(
        `📊 ${hierarchicalData.length} catégories racines et ${allProducts.length} produits reçus`
      );

      // Créer un map des produits avec leurs données de stock
      const productsMap = {};
      allProducts.forEach((product) => {
        if (product.type === 'simple' && (product.stock || 0) > 0) {
          productsMap[product._id] = {
            ...product,
            hasStock: true,
          };
        }
      });

      console.log(`📦 ${Object.keys(productsMap).length} produits en stock trouvés`);

      // Filtrer pour ne garder que les catégories avec des produits en stock
      const filteredTree = filterCategoriesWithStock(hierarchicalData, productsMap);
      setCategoryTree(filteredTree);

      console.log(`✅ ${filteredTree.length} catégories racines avec stock disponibles`);

      // Debug: afficher quelques catégories
      filteredTree.slice(0, 3).forEach((cat) => {
        console.log(
          `  📂 ${cat.name}: ${cat.totalProductsInStock} produits total (${cat.productsInStockCount} directs)`
        );
      });
    } catch (err) {
      console.error('❌ Erreur chargement catégories hiérarchiques:', err);
      setCategoryTree([]);
    } finally {
      setLoadingCategories(false);
    }
  }, [filterCategoriesWithStock]);

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
   * Désélectionne toutes les catégories
   */
  const deselectAllCategories = useCallback(() => {
    return [];
  }, []);

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
      // Collecter tous les IDs (catégorie + descendants)
      const categoryAndDescendants = [category._id];
      const hasChildren = category.children && category.children.length > 0;

      if (hasChildren) {
        categoryAndDescendants.push(...collectAllCategoryIds(category.children));
      }

      if (isChecking) {
        // Ajouter les catégories qui ne sont pas déjà sélectionnées
        const newSelections = categoryAndDescendants.filter((id) => !currentSelection.includes(id));
        return [...currentSelection, ...newSelections];
      } else {
        // Retirer toutes les catégories (parent + descendants)
        return currentSelection.filter((id) => !categoryAndDescendants.includes(id));
      }
    },
    [collectAllCategoryIds]
  );

  // Chargement initial si nécessaire
  useEffect(() => {
    if (categoryTree.length === 0) {
      // Ne pas charger automatiquement, laisser le composant parent décider
    }
  }, []);

  return {
    // État
    categoryTree,
    loadingCategories,
    expandedCategories,

    // Actions de chargement
    fetchCategoriesWithStock,

    // Actions d'expansion
    toggleCategoryExpansion,
    expandAllCategories,
    collapseAllCategories,

    // Actions de sélection
    selectAllCategories,
    deselectAllCategories,
    handleCategorySelection,

    // Utilitaires
    collectAllCategoryIds,
    getSelectedProductsCount,
  };
};

// 🔥 EXPORT PAR DÉFAUT AUSSI (pour compatibilité)
export default useCategoryTree;
