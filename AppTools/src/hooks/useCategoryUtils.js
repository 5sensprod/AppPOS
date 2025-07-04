// src/hooks/useCategoryUtils.js
import { useMemo, useCallback } from 'react';
import { useHierarchicalCategories } from '../features/categories/stores/categoryHierarchyStore';

/**
 * Hook centralisé pour toutes les opérations sur les catégories hiérarchiques
 * Évite la duplication de logique dans toute l'application
 */
export function useCategoryUtils() {
  const {
    hierarchicalCategories,
    loading: categoriesLoading,
    fetchHierarchicalCategories,
    initWebSocketListeners,
  } = useHierarchicalCategories();

  // ✅ 1. CONSTRUCTION DES MAPS DE CATÉGORIES (memoized)
  const categoryMaps = useMemo(() => {
    if (!hierarchicalCategories?.length) return null;

    const categoryPathMap = {};
    const categoryHierarchyMap = {};
    const categoryNameMap = {};
    const parentChildMap = {};

    const buildMaps = (categories, parentPath = '', parent = null, level = 0) => {
      categories.forEach((cat) => {
        const currentPath = parentPath ? `${parentPath}/${cat._id}` : cat._id;

        // Map des chemins
        categoryPathMap[cat._id] = currentPath;

        // Map des noms (pour recherche rapide)
        categoryNameMap[cat._id] = cat.name;

        // Map hiérarchique avec métadonnées
        categoryHierarchyMap[cat._id] = {
          path: currentPath,
          parentId: parent?._id || null,
          level,
          name: cat.name,
          fullPath: parentPath ? `${parent.name} > ${cat.name}` : cat.name,
          pathArray: parentPath
            ? [...(categoryHierarchyMap[parent._id]?.pathArray || [parent.name]), cat.name]
            : [cat.name],
          hasChildren: (cat.children?.length || 0) > 0,
          childrenCount: cat.children?.length || 0,
        };

        // Map parent-enfants
        if (parent) {
          if (!parentChildMap[parent._id]) {
            parentChildMap[parent._id] = [];
          }
          parentChildMap[parent._id].push(cat._id);
        }

        // Récursion sur les enfants
        if (cat.children?.length) {
          buildMaps(cat.children, currentPath, cat, level + 1);
        }
      });
    };

    buildMaps(hierarchicalCategories);

    return {
      pathMap: categoryPathMap,
      hierarchyMap: categoryHierarchyMap,
      nameMap: categoryNameMap,
      parentChildMap,
    };
  }, [hierarchicalCategories]);

  // ✅ 2. RECHERCHE DE CATÉGORIE PAR ID
  const findCategoryById = useCallback(
    (categoryId) => {
      if (!categoryMaps || !categoryId) return null;
      return categoryMaps.hierarchyMap[categoryId] || null;
    },
    [categoryMaps]
  );

  // ✅ 3. RECHERCHE DE NOM DE CATÉGORIE PAR ID
  const getCategoryName = useCallback(
    (categoryId) => {
      if (!categoryMaps || !categoryId) return null;
      return categoryMaps.nameMap[categoryId] || null;
    },
    [categoryMaps]
  );

  // ✅ 4. RECHERCHE DE CHEMIN COMPLET PAR ID
  const getCategoryPath = useCallback(
    (categoryId) => {
      if (!categoryMaps || !categoryId) return null;
      const categoryInfo = categoryMaps.hierarchyMap[categoryId];
      return categoryInfo?.fullPath || null;
    },
    [categoryMaps]
  );

  // ✅ 5. RECHERCHE RÉCURSIVE DANS L'ARBRE
  const searchInHierarchy = useCallback(
    (searchTerm, options = {}) => {
      if (!hierarchicalCategories?.length || !searchTerm) return [];

      const { includeChildren = false, maxResults = 50 } = options;
      const lowerTerm = searchTerm.toLowerCase();
      const results = [];

      const searchRecursive = (categories, level = 0) => {
        if (results.length >= maxResults) return;

        categories.forEach((cat) => {
          if (results.length >= maxResults) return;

          const nameMatch = cat.name?.toLowerCase().includes(lowerTerm);
          const descMatch = cat.description?.toLowerCase().includes(lowerTerm);

          if (nameMatch || descMatch) {
            results.push({
              ...cat,
              _level: level,
              _originalName: cat.name,
              _fullPath: getCategoryPath(cat._id),
              _searchRelevance: nameMatch ? 2 : 1, // Priorité nom > description
            });
          }

          if (includeChildren && cat.children?.length) {
            searchRecursive(cat.children, level + 1);
          }
        });
      };

      searchRecursive(hierarchicalCategories);

      // Trier par pertinence puis par nom
      return results.sort((a, b) => {
        if (a._searchRelevance !== b._searchRelevance) {
          return b._searchRelevance - a._searchRelevance;
        }
        return a.name.localeCompare(b.name);
      });
    },
    [hierarchicalCategories, getCategoryPath]
  );

  // ✅ 6. APLATISSEMENT DE L'ARBRE AVEC CONTRÔLE D'EXPANSION
  const flattenHierarchy = useCallback(
    (expandedCategories = {}, options = {}) => {
      if (!hierarchicalCategories?.length) return [];

      const {
        includeHidden = false,
        maxLevel = Infinity,
        renderName = null, // Fonction custom pour le rendu du nom
      } = options;

      const flatten = (categories, level = 0, parentExpanded = true, parentIndex = '') => {
        if (level > maxLevel) return [];

        let result = [];

        categories.forEach((category, index) => {
          const isExpanded = expandedCategories[category._id] || false;
          const hasChildren = category.children?.length > 0;
          const isVisible = level === 0 || parentExpanded || includeHidden;

          const hierarchyIndex = parentIndex
            ? `${parentIndex}.${String(index).padStart(3, '0')}`
            : `${String(index).padStart(3, '0')}`;

          if (isVisible) {
            const categoryData = {
              ...category,
              _originalName: category.name,
              _level: level,
              _childrenCount: hasChildren ? category.children.length : 0,
              _sortIndex: index,
              _hierarchyIndex: hierarchyIndex,
              _parentId: null, // Sera défini par le parent
              _isExpanded: isExpanded,
              _hasChildren: hasChildren,
              _fullPath: getCategoryPath(category._id),
            };

            // Appliquer le rendu custom du nom si fourni
            if (renderName && typeof renderName === 'function') {
              categoryData.name = renderName(category, level, isExpanded, hasChildren);
            }

            result.push(categoryData);

            // Ajouter les enfants si expandé
            if (hasChildren && isExpanded) {
              const children = flatten(category.children, level + 1, true, hierarchyIndex);
              // Définir le parent pour les enfants
              children.forEach((child) => {
                child._parentId = category._id;
              });
              result = result.concat(children);
            }
          }
        });

        return result;
      };

      return flatten(hierarchicalCategories);
    },
    [hierarchicalCategories, getCategoryPath]
  );

  // ✅ 7. GÉNÉRATION D'OPTIONS POUR SELECT
  const getCategoryOptions = useCallback(
    (options = {}) => {
      const {
        excludeId = null,
        includeEmpty = true,
        sortAlphabetically = false,
        prefix = '— ',
        format = 'flat', // 'flat' | 'hierarchical'
      } = options;

      if (!hierarchicalCategories?.length) return [];

      if (format === 'hierarchical') {
        // Format hiérarchique avec indentation
        const transform = (cats, currentPrefix = '') => {
          return cats.flatMap((cat) => {
            if (excludeId && cat._id === excludeId) return [];

            const option = {
              value: cat._id,
              label: currentPrefix + cat.name,
              level: (currentPrefix.match(new RegExp(prefix, 'g')) || []).length,
              hasChildren: cat.children?.length > 0,
            };

            const children = cat.children ? transform(cat.children, currentPrefix + prefix) : [];
            return [option, ...children];
          });
        };

        let options = transform(hierarchicalCategories);

        if (sortAlphabetically) {
          options.sort((a, b) => a.label.localeCompare(b.label));
        }

        if (includeEmpty) {
          options.unshift({ value: '', label: 'Aucune catégorie', level: -1 });
        }

        return options;
      } else {
        // Format plat
        const flatOptions = [];

        const addOptions = (cats) => {
          cats.forEach((cat) => {
            if (excludeId && cat._id === excludeId) return;

            flatOptions.push({
              value: cat._id,
              label: cat.name,
              fullPath: getCategoryPath(cat._id),
            });

            if (cat.children?.length) {
              addOptions(cat.children);
            }
          });
        };

        addOptions(hierarchicalCategories);

        if (sortAlphabetically) {
          flatOptions.sort((a, b) => a.label.localeCompare(b.label));
        }

        if (includeEmpty) {
          flatOptions.unshift({ value: '', label: 'Aucune catégorie' });
        }

        return flatOptions;
      }
    },
    [hierarchicalCategories, getCategoryPath]
  );

  // ✅ 8. ENRICHISSEMENT DE PRODUITS AVEC INFOS CATÉGORIES
  const enrichProductWithCategories = useCallback(
    (product) => {
      if (!categoryMaps || !product) return product;

      const path_info = {};

      // Fonction pour ajouter tous les chemins de catégories parents
      const addAllCategoryPaths = (catId) => {
        if (!catId || !categoryMaps.pathMap[catId]) return;

        path_info[catId] = categoryMaps.pathMap[catId];

        // Ajouter tous les parents
        Object.keys(categoryMaps.pathMap).forEach((potentialParentId) => {
          if (
            categoryMaps.pathMap[catId].startsWith(categoryMaps.pathMap[potentialParentId]) &&
            catId !== potentialParentId
          ) {
            path_info[potentialParentId] = categoryMaps.pathMap[potentialParentId];
          }
        });
      };

      // Traiter la catégorie principale
      if (product.category_id) {
        addAllCategoryPaths(product.category_id);
      }

      // Traiter les catégories additionnelles
      if (Array.isArray(product.categories)) {
        product.categories.forEach(addAllCategoryPaths);
      }

      // Traiter les refs existantes
      if (product.category_info?.refs) {
        product.category_info.refs.forEach((ref) => {
          addAllCategoryPaths(ref.id);
        });
      }

      return {
        ...product,
        category_id_path: product.category_id ? categoryMaps.pathMap[product.category_id] : null,
        category_info: {
          ...(product.category_info || {}),
          path_info,
        },
      };
    },
    [categoryMaps]
  );

  // ✅ 9. GÉNÉRATION DE CATEGORY_INFO COMPLÈTE
  const buildCategoryInfo = useCallback(
    (categoryIds = []) => {
      if (!categoryMaps || !categoryIds.length) {
        return { refs: [], primary: null };
      }

      const refs = [];
      const processedPaths = new Set();

      categoryIds.forEach((catId) => {
        const categoryInfo = categoryMaps.hierarchyMap[catId];
        if (!categoryInfo) return;

        // Ajouter toutes les catégories du chemin (parents + enfant)
        const pathIds = categoryInfo.path.split('/');

        for (let i = 0; i < pathIds.length; i++) {
          const pathKey = pathIds.slice(0, i + 1).join('->');

          if (!processedPaths.has(pathKey)) {
            processedPaths.add(pathKey);

            const currentCatId = pathIds[i];
            const currentCatInfo = categoryMaps.hierarchyMap[currentCatId];

            if (currentCatInfo) {
              refs.push({
                id: currentCatId,
                name: currentCatInfo.name,
                path: currentCatInfo.pathArray,
                path_ids: pathIds.slice(0, i + 1),
                path_string: currentCatInfo.pathArray.slice(0, i + 1).join(' > '),
                level: i,
                woo_id: null,
              });
            }
          }
        }
      });

      // Trier par niveau puis par nom
      refs.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
      });

      // Déterminer la catégorie principale
      let primary = null;
      if (categoryIds[0]) {
        primary = refs.find((ref) => ref.id === categoryIds[0]) || null;
      }

      return { refs, primary };
    },
    [categoryMaps]
  );

  // ✅ 10. UTILITAIRES DE VALIDATION
  const isValidCategoryId = useCallback(
    (categoryId) => {
      return !!(categoryMaps && categoryId && categoryMaps.nameMap[categoryId]);
    },
    [categoryMaps]
  );

  const getAllChildrenIds = useCallback(
    (categoryId) => {
      if (!categoryMaps || !categoryId) return [];

      const collectChildren = (catId) => {
        const children = categoryMaps.parentChildMap[catId] || [];
        let allChildren = [...children];

        children.forEach((childId) => {
          allChildren = allChildren.concat(collectChildren(childId));
        });

        return allChildren;
      };

      return collectChildren(categoryId);
    },
    [categoryMaps]
  );

  return {
    // États
    hierarchicalCategories,
    categoriesLoading,
    categoryMaps,

    // Fonctions de base
    fetchHierarchicalCategories,
    initWebSocketListeners,

    // Recherche et navigation
    findCategoryById,
    getCategoryName,
    getCategoryPath,
    searchInHierarchy,

    // Transformation et formatage
    flattenHierarchy,
    getCategoryOptions,
    enrichProductWithCategories,
    buildCategoryInfo,

    // Validation et utilitaires
    isValidCategoryId,
    getAllChildrenIds,

    // État de disponibilité
    isReady: !categoriesLoading && !!categoryMaps,
  };
}
