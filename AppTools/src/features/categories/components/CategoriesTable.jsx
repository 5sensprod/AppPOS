import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCategory } from '../stores/categoryStore';
import { useHierarchicalCategories } from '../stores/categoryHierarchyStore';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useEntityTable } from '@/hooks/useEntityTable';
import { useEntityFilter } from '@/hooks/useEntityFilter';
import { usePaginationStore } from '@/stores/usePaginationStore'; // Nouvel import

function CategoriesTable(props) {
  const { deleteCategory, syncCategory } = useCategory();
  const { sync, hierarchy } = ENTITY_CONFIG.features;
  const { selectedFilters, setSelectedFilters } = useEntityFilter('category');

  // Récupérer les paramètres de pagination persistants
  const { getPaginationParams } = usePaginationStore();
  const { pageSize: persistedPageSize } = getPaginationParams('category');

  // Hiérarchie activée
  const {
    hierarchicalCategories,
    loading: hierarchicalLoading,
    fetchHierarchicalCategories,
    initWebSocketListeners,
    debugListeners,
  } = useHierarchicalCategories();

  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Initialisation conditionnelle
  useEffect(() => {
    if (hierarchy) {
      const cleanup = sync ? initWebSocketListeners() : undefined;
      fetchHierarchicalCategories();

      if (sync) {
        setTimeout(() => debugListeners?.(), 1000);
      }

      return () => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      };
    }
  }, [hierarchy, sync, initWebSocketListeners, fetchHierarchicalCategories, debugListeners]);

  const refreshCategories = useCallback(() => {
    if (hierarchy) {
      return fetchHierarchicalCategories();
    }
  }, [fetchHierarchicalCategories, hierarchy]);

  const {
    loading: operationLoading,
    error,
    handleDeleteEntity,
    handleSyncEntity,
  } = useEntityTable({
    entityType: 'category',
    fetchEntities: refreshCategories,
    deleteEntity: deleteCategory,
    syncEntity: sync ? syncCategory : undefined,
  });

  const toggleCategory = useCallback((categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const flattenHierarchy = useCallback(
    (categories, level = 0, parentExpanded = true, parentIndex = '', parentId = null) => {
      if (!categories) return [];

      let result = [];

      categories.forEach((category, index) => {
        const isExpanded = expandedCategories[category._id] || false;
        const hasChildren = category.children?.length > 0;
        const isVisible = level === 0 || parentExpanded;

        const hierarchyIndex = parentIndex
          ? `${parentIndex}.${String(index).padStart(3, '0')}`
          : `${String(index).padStart(3, '0')}`;

        if (isVisible) {
          const indentedName = (
            <div className="flex items-center">
              <div style={{ width: `${level * 16}px` }} className="flex-shrink-0"></div>
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategory(category._id);
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
              )}
              <span className="truncate text-gray-900 dark:text-gray-100">{category.name}</span>
              {hasChildren && (
                <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  ({category.children.length})
                </span>
              )}
            </div>
          );

          result.push({
            ...category,
            name: indentedName,
            _originalName: category.name,
            _level: level,
            _childrenCount: category.children?.length || 0,
            product_count: category.productCount || 0,
            _sortIndex: index,
            _hierarchyIndex: hierarchyIndex,
            _parentId: parentId,
          });

          if (hasChildren && isExpanded) {
            result = result.concat(
              flattenHierarchy(category.children, level + 1, true, hierarchyIndex, category._id)
            );
          }
        }
      });

      return result;
    },
    [expandedCategories, toggleCategory]
  );

  const searchProcessor = useCallback(
    (items, term) => {
      if (!term) return items;

      const lowerTerm = term.toLowerCase();

      const searchInHierarchy = (cats, results = []) => {
        cats?.forEach((cat) => {
          if (
            cat.name?.toLowerCase().includes(lowerTerm) ||
            cat.description?.toLowerCase().includes(lowerTerm)
          ) {
            results.push({
              ...cat,
              name: (
                <div className="flex items-center">
                  <span className="truncate text-gray-900 dark:text-gray-100">{cat.name}</span>
                </div>
              ),
              _originalName: cat.name,
              _level: 0,
              product_count: cat.productCount || 0,
            });
          }

          if (cat.children?.length) {
            searchInHierarchy(cat.children, results);
          }
        });

        return results;
      };

      return searchInHierarchy(hierarchicalCategories);
    },
    [hierarchicalCategories]
  );

  const processedData = useMemo(() => {
    if (!hierarchicalCategories?.length) return [];

    if (searchTerm) {
      return searchProcessor([], searchTerm);
    }

    return flattenHierarchy(hierarchicalCategories);
  }, [hierarchicalCategories, searchTerm, flattenHierarchy, searchProcessor]);

  const isLoading = hierarchicalLoading || operationLoading;
  const filteredData = useMemo(() => {
    let data = processedData;

    // Filtre par synchronisation WooCommerce
    const wooFilter = selectedFilters.find((f) => f.type === 'woo')?.value;
    if (wooFilter === 'woo_synced') {
      data = data.filter((cat) => cat.woo_id != null);
    } else if (wooFilter === 'woo_unsynced') {
      data = data.filter((cat) => cat.woo_id == null);
    }

    // Filtre par catégorie
    const categoryFilters = selectedFilters.filter((f) => f.type === 'category');
    if (categoryFilters.length > 0) {
      const categoryIds = categoryFilters.map((f) => f.value.replace('category_', ''));

      // Fonction pour trouver tous les IDs de catégories enfants d'une catégorie donnée
      const findAllChildCategoryIds = (categoryId) => {
        const result = [categoryId]; // Inclure la catégorie elle-même

        // Fonction récursive pour parcourir l'arbre des catégories
        const findChildren = (catId) => {
          const category = hierarchicalCategories.find((cat) => cat._id === catId);

          // Si la catégorie existe et a des enfants
          if (category && category.children && category.children.length > 0) {
            category.children.forEach((childCat) => {
              result.push(childCat._id); // Ajouter l'ID de l'enfant
              findChildren(childCat._id); // Chercher récursivement ses enfants
            });
          }
        };

        // Initialiser la recherche récursive
        findChildren(categoryId);
        return result;
      };

      // Collecter tous les IDs de catégories, y compris les enfants
      const allCategoryIds = [];
      categoryIds.forEach((catId) => {
        allCategoryIds.push(...findAllChildCategoryIds(catId));
      });

      // Supprimer les doublons
      const uniqueCategoryIds = [...new Set(allCategoryIds)];

      console.log('IDs de catégories sélectionnées:', categoryIds);
      console.log('IDs de catégories y compris enfants:', uniqueCategoryIds);

      // Fonction pour vérifier si un produit appartient à une catégorie
      const productInCategory = (product, categoryId) => {
        // Vérifier la catégorie principale
        if (product.category_id === categoryId) return true;

        // Vérifier les catégories additionnelles
        if (Array.isArray(product.categories) && product.categories.includes(categoryId))
          return true;

        // Vérifier dans les category_info.refs si disponible
        if (product.category_info?.refs) {
          return product.category_info.refs.some((ref) => ref.id === categoryId);
        }

        return false;
      };

      data = data.filter((p) => uniqueCategoryIds.some((catId) => productInCategory(p, catId)));
    }

    return data;
  }, [processedData, selectedFilters]);

  return (
    <div className="space-y-4">
      <EntityTable
        data={filteredData}
        isLoading={isLoading}
        error={error}
        columns={ENTITY_CONFIG.columns}
        entityName="catégorie"
        entityNamePlural="catégories"
        baseRoute="/products/categories"
        filters={[]}
        searchFields={['_originalName', 'description']}
        searchProcessor={searchProcessor}
        onSearch={handleSearch}
        // NOUVELLES PROPS UnifiedFilterBar
        enableUnifiedFilters={true}
        unifiedFilterOptions={[
          { label: 'Synchronisé', value: 'woo_synced', type: 'woo' },
          { label: 'Non synchronisé', value: 'woo_unsynced', type: 'woo' },
        ]}
        selectedFilters={selectedFilters}
        onFiltersChange={setSelectedFilters}
        enableCategories={true}
        enableStatusFilter={false}
        onDelete={handleDeleteEntity}
        syncEnabled={sync}
        actions={['view', 'edit', 'delete', 'sync']}
        batchActions={['delete', 'sync']}
        showActions={false}
        onSync={handleSyncEntity}
        pagination={{
          enabled: true,
          pageSize: persistedPageSize || 5,
          showPageSizeOptions: true,
          pageSizeOptions: [5, 10, 25, 50],
        }}
        defaultSort={ENTITY_CONFIG.defaultSort}
        paginationEntityId="category"
        {...props}
      />
    </div>
  );
}

export default CategoriesTable;
