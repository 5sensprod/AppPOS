// src/features/products/hooks/useCategoryOptions.js
import { useMemo } from 'react';

/**
 * Hook pour obtenir les options de catégories formatées pour les sélecteurs
 * @param {Array} hierarchicalCategories - Les catégories hiérarchiques
 * @param {Array} products - Liste des produits (fallback si les catégories hiérarchiques ne sont pas disponibles)
 * @returns {Array} - Options de catégories formatées pour les menus déroulants
 */
export const useCategoryOptions = (hierarchicalCategories = [], products = []) => {
  return useMemo(() => {
    if (!hierarchicalCategories || hierarchicalCategories.length === 0) {
      // Si les catégories hiérarchiques ne sont pas encore chargées,
      // utiliser les catégories des produits comme fallback
      const categoriesFromProducts = new Map();

      products.forEach((product) => {
        if (product.category_info && Array.isArray(product.category_info.refs)) {
          product.category_info.refs.forEach((cat) => {
            if (cat.id && cat.name) {
              categoriesFromProducts.set(cat.id, {
                value: cat.id,
                label: cat.path_string || cat.name,
              });
            }
          });
        }
      });

      return Array.from(categoriesFromProducts.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      );
    }

    // Fonction récursive pour transformer les catégories hiérarchiques en liste plate
    const transform = (cats, path = '') => {
      return cats.flatMap((cat) => [
        {
          value: cat._id,
          label: path ? `${path} > ${cat.name}` : cat.name,
        },
        ...(cat.children && cat.children.length > 0
          ? transform(cat.children, path ? `${path} > ${cat.name}` : cat.name)
          : []),
      ]);
    };

    return transform(hierarchicalCategories).sort((a, b) => a.label.localeCompare(b.label));
  }, [hierarchicalCategories, products]);
};
