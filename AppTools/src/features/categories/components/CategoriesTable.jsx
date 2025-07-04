import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCategory } from '../stores/categoryStore';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useEntityTable } from '@/hooks/useEntityTable';
import { useEntityFilter } from '@/hooks/useEntityFilter';
import { usePaginationStore } from '@/stores/usePaginationStore';
import { useCategoryUtils } from '../../../components/hooks/useCategoryUtils';

function CategoriesTable(props) {
  const { deleteCategory, syncCategory } = useCategory();
  const { sync, hierarchy } = ENTITY_CONFIG.features;
  const { selectedFilters, setSelectedFilters } = useEntityFilter('category');

  const { getPaginationParams } = usePaginationStore();
  const { pageSize: persistedPageSize } = getPaginationParams('category');

  const {
    hierarchicalCategories,
    categoriesLoading: hierarchicalLoading,
    fetchHierarchicalCategories,
    initWebSocketListeners,
    flattenHierarchy: flattenHierarchyBase,
    searchInHierarchy,
    getAllChildrenIds,
    isReady: categoriesReady,
  } = useCategoryUtils();

  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Initialisation conditionnelle (gardée identique)
  useEffect(() => {
    if (hierarchy) {
      const cleanup = sync ? initWebSocketListeners() : undefined;
      fetchHierarchicalCategories();

      return () => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      };
    }
  }, [hierarchy, sync, initWebSocketListeners, fetchHierarchicalCategories]);

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
    handleBatchSyncEntities,
  } = useEntityTable({
    entityType: 'catégorie',
    fetchEntities: refreshCategories,
    deleteEntity: deleteCategory,
    syncEntity: sync ? syncCategory : undefined,
    batchSyncEntities: sync
      ? async (ids) => {
          for (const id of ids) {
            await syncCategory(id);
          }
        }
      : undefined,
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

  // ✅ SIMPLIFICATION - Utiliser flattenHierarchy du hook avec rendu custom
  const flattenHierarchy = useCallback(
    (categories) => {
      const renderName = (category, level, isExpanded, hasChildren) => (
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

      return flattenHierarchyBase(expandedCategories, { renderName });
    },
    [flattenHierarchyBase, expandedCategories, toggleCategory]
  );

  // ✅ SIMPLIFICATION - Utiliser searchInHierarchy du hook
  const searchProcessor = useCallback(
    (items, term) => {
      if (!term) return items;

      const results = searchInHierarchy(term, { maxResults: 100 });

      return results.map((cat) => ({
        ...cat,
        name: (
          <div className="flex items-center">
            <span className="truncate text-gray-900 dark:text-gray-100">{cat.name}</span>
          </div>
        ),
        _originalName: cat.name,
        _level: 0,
        product_count: cat.productCount || 0,
      }));
    },
    [searchInHierarchy]
  );

  const processedData = useMemo(() => {
    if (!categoriesReady) return [];

    if (searchTerm) {
      return searchProcessor([], searchTerm);
    }

    return flattenHierarchy(hierarchicalCategories);
  }, [categoriesReady, searchTerm, searchProcessor, flattenHierarchy, hierarchicalCategories]);

  const isLoading = hierarchicalLoading || operationLoading;

  // ✅ SIMPLIFICATION - Filtrage avec getAllChildrenIds du hook
  const filteredData = useMemo(() => {
    let data = processedData;

    // Filtre par synchronisation WooCommerce (gardé identique)
    const wooFilter = selectedFilters.find((f) => f.type === 'woo')?.value;
    if (wooFilter === 'woo_synced') {
      data = data.filter((cat) => cat.woo_id != null);
    } else if (wooFilter === 'woo_unsynced') {
      data = data.filter((cat) => cat.woo_id == null);
    }

    // ✅ SIMPLIFICATION - Filtre par catégorie avec getAllChildrenIds
    const categoryFilters = selectedFilters.filter((f) => f.type === 'category');
    if (categoryFilters.length > 0) {
      const categoryIds = categoryFilters.map((f) => f.value.replace('category_', ''));

      // ✅ UTILISER LA FONCTION DU HOOK
      const allCategoryIds = [];
      categoryIds.forEach((catId) => {
        allCategoryIds.push(catId, ...getAllChildrenIds(catId));
      });

      const uniqueCategoryIds = [...new Set(allCategoryIds)];

      console.log('IDs de catégories sélectionnées:', categoryIds);
      console.log('IDs de catégories y compris enfants:', uniqueCategoryIds);

      // Fonction pour vérifier si un produit appartient à une catégorie (gardée identique)
      const productInCategory = (product, categoryId) => {
        if (product.category_id === categoryId) return true;
        if (Array.isArray(product.categories) && product.categories.includes(categoryId))
          return true;
        if (product.category_info?.refs) {
          return product.category_info.refs.some((ref) => ref.id === categoryId);
        }
        return false;
      };

      data = data.filter((p) => uniqueCategoryIds.some((catId) => productInCategory(p, catId)));
    }

    return data;
  }, [processedData, selectedFilters, getAllChildrenIds]);

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
        onBatchSync={handleBatchSyncEntities}
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
