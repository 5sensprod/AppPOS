import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useCategory, useCategoryExtras } from '../contexts/categoryContext';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { ChevronRight, ChevronDown } from 'lucide-react';

function CategoriesTable(props) {
  const { categorys, loading, error, fetchCategorys, deleteCategory } = useCategory();
  const { syncCategory, getHierarchicalCategories } = useCategoryExtras();
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [localSort, setLocalSort] = useState(ENTITY_CONFIG.defaultSort);
  const [hierarchicalData, setHierarchicalData] = useState([]);
  const [loadingHierarchical, setLoadingHierarchical] = useState(false);

  // Charger les catégories normales
  useEffect(() => {
    fetchCategorys();
  }, [fetchCategorys]);

  // Charger les données hiérarchiques incluant le nombre de produits
  useEffect(() => {
    const fetchHierarchicalData = async () => {
      setLoadingHierarchical(true);
      try {
        const hierarchicalCategories = await getHierarchicalCategories();
        // Créer un mapping des données hiérarchiques pour un accès facile
        const productCountMap = {};

        // Fonction récursive pour traiter les catégories et leurs enfants
        const processCategory = (category) => {
          productCountMap[category._id] = {
            productCount: category.productCount || 0,
          };

          if (category.children && category.children.length > 0) {
            category.children.forEach(processCategory);
          }
        };

        // Traiter toutes les catégories
        hierarchicalCategories.forEach(processCategory);

        // Stocker le mapping dans l'état
        setHierarchicalData(productCountMap);
      } catch (error) {
        console.error('Erreur lors du chargement des données hiérarchiques:', error);
      } finally {
        setLoadingHierarchical(false);
      }
    };

    fetchHierarchicalData();
  }, [getHierarchicalCategories]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  // Intercepter le tri et le gérer localement
  const customSort = (field) => {
    setLocalSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const searchProcessor = useCallback(
    (items, term) => {
      if (!term) return items;

      const lowerSearchTerm = term.toLowerCase();

      const matches = categorys
        .filter(
          (cat) =>
            (cat._originalName || cat.name).toLowerCase().includes(lowerSearchTerm) ||
            (cat.description && cat.description.toLowerCase().includes(lowerSearchTerm))
        )
        .map((cat) => cat._id);

      const parentsToShow = new Set();
      const addParents = (categoryId) => {
        const category = categorys.find((cat) => cat._id === categoryId);
        if (category && category.parent_id) {
          parentsToShow.add(category.parent_id);
          addParents(category.parent_id);
        }
      };

      matches.forEach((id) => addParents(id));

      return items.filter(
        (item) =>
          matches.includes(item._id) ||
          parentsToShow.has(item._id) ||
          (item._originalName && item._originalName.toLowerCase().includes(lowerSearchTerm)) ||
          (item.description && item.description.toLowerCase().includes(lowerSearchTerm))
      );
    },
    [categorys]
  );

  const processedData = useMemo(() => {
    if (!categorys) return [];

    const categoryMap = {};
    categorys.forEach((cat) => {
      categoryMap[cat._id] = { ...cat, children: [] };
    });

    const rootCategories = [];

    categorys.forEach((cat) => {
      if (cat.parent_id && categoryMap[cat.parent_id]) {
        categoryMap[cat.parent_id].children.push(categoryMap[cat._id]);
      } else {
        rootCategories.push(categoryMap[cat._id]);
      }
    });

    // Fonction de tri récursif qui respecte la direction du tri
    const sortRecursively = (categories) => {
      // Tri du niveau actuel
      const sorted = [...categories].sort((a, b) => {
        const aValue = a.name;
        const bValue = b.name;

        const result = aValue.localeCompare(bValue);
        return localSort.direction === 'asc' ? result : -result;
      });

      // Tri récursif des enfants
      sorted.forEach((cat) => {
        if (cat.children && cat.children.length > 0) {
          cat.children = sortRecursively(cat.children);
        }
      });

      return sorted;
    };

    // Appliquer le tri hiérarchique
    const sortedRootCategories = sortRecursively(rootCategories);

    const flattenedCategories = [];
    const isSearchActive = searchTerm && searchTerm.length > 0;

    function flatten(categories, level = 0) {
      categories.forEach((cat) => {
        const isExpanded = expandedCategories[cat._id] || false;
        const hasChildren = cat.children && cat.children.length > 0;
        const childrenCount = hasChildren ? cat.children.length : 0;

        // Obtenir le nombre de produits à partir des données hiérarchiques
        const productCount = hierarchicalData[cat._id]?.productCount || 0;

        const expandButton = hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCategory(cat._id);
            }}
            className="mr-2 focus:outline-none"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
        ) : (
          <div className="w-5 flex-shrink-0"></div>
        );

        const indentedName = (
          <div className="flex items-center">
            <div style={{ width: `${level * 16}px` }} className="flex-shrink-0"></div>
            {expandButton}
            <span className="truncate text-gray-900 dark:text-gray-100">{cat.name}</span>
            {hasChildren && (
              <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                ({childrenCount})
              </span>
            )}
          </div>
        );

        flattenedCategories.push({
          ...cat,
          name: indentedName,
          _originalName: cat.name,
          _level: level,
          _childrenCount: childrenCount,
          product_count: productCount,
          // Propriété spéciale pour désactiver le tri standard
          _no_sort: true,
        });

        if (hasChildren && (isSearchActive || isExpanded)) {
          flatten(cat.children, level + 1);
        }
      });
    }

    flatten(sortedRootCategories);
    return flattenedCategories;
  }, [categorys, expandedCategories, searchTerm, localSort, hierarchicalData]);

  const filters = [
    {
      id: 'level',
      type: 'select',
      allLabel: 'Tous les niveaux',
      options: [
        { value: '0', label: 'Niveau 0' },
        { value: '1', label: 'Niveau 1' },
        { value: '2', label: 'Niveau 2' },
        { value: '3', label: 'Niveau 3' },
      ],
    },
  ];

  // Désactiver le tri standard en créant un processeur de tri personnalisé
  const sortProcessor = (data) => {
    // Retourner les données telles quelles (déjà triées dans hierarchicalData)
    return data;
  };

  return (
    <EntityTable
      data={processedData || []}
      isLoading={loading || loadingHierarchical}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="catégorie"
      entityNamePlural="catégories"
      baseRoute="/products/categories"
      filters={filters}
      searchFields={['_originalName', 'description']}
      searchProcessor={searchProcessor}
      sortProcessor={sortProcessor} // Processeur de tri personnalisé
      onSearch={handleSearch}
      onSort={customSort} // Gestionnaire de tri personnalisé
      onDelete={deleteCategory}
      onSync={syncCategory}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      actions={['view', 'edit', 'delete', 'sync']}
      batchActions={['delete', 'sync']}
      pagination={{
        enabled: true,
        pageSize: 5,
        showPageSizeOptions: true,
        pageSizeOptions: [5, 10, 25, 50],
      }}
      defaultSort={ENTITY_CONFIG.defaultSort}
      sort={localSort} // État de tri local
      {...props}
    />
  );
}

export default CategoriesTable;
