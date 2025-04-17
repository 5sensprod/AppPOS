import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCategory } from '../stores/categoryStore';
import { useHierarchicalCategories } from '../stores/categoryHierarchyStore';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useEntityTable } from '@/hooks/useEntityTable';
import UnifiedFilterBar from '../../../components/common/EntityTable/components/UnifiedFilterBar';
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
    executeOperation,
  } = useEntityTable({
    deleteEntity: deleteCategory,
    syncEntity: sync ? syncCategory : undefined,
  });

  const handleDeleteEntity = useCallback(
    async (id) => {
      if (!window.confirm(`Êtes-vous sûr de vouloir supprimer cette catégorie ?`)) return;
      return executeOperation(async () => {
        await deleteCategory(id);
        await refreshCategories?.();
      });
    },
    [executeOperation, deleteCategory, refreshCategories]
  );

  const handleSyncEntity = useCallback(
    async (id) => {
      return executeOperation(async () => {
        await syncCategory(id);
        await refreshCategories?.();
      });
    },
    [executeOperation, syncCategory, refreshCategories]
  );

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

    const wooFilter = selectedFilters.find((f) => f.type === 'woo')?.value;
    if (wooFilter === 'woo_synced') {
      data = data.filter((cat) => cat.woo_id != null);
    } else if (wooFilter === 'woo_unsynced') {
      data = data.filter((cat) => cat.woo_id == null);
    }

    return data;
  }, [processedData, selectedFilters]);

  return (
    <div className="space-y-4">
      <UnifiedFilterBar
        filterOptions={[
          { label: 'Synchronisé', value: 'woo_synced', type: 'woo' },
          { label: 'Non synchronisé', value: 'woo_unsynced', type: 'woo' },
        ]}
        selectedFilters={selectedFilters}
        onChange={setSelectedFilters}
        enableCategories={false}
      />

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
        onDelete={handleDeleteEntity}
        syncEnabled={sync}
        actions={['view', 'edit', 'delete', 'sync']}
        batchActions={['delete', 'sync']}
        onSync={handleSyncEntity}
        pagination={{
          enabled: true,
          pageSize: persistedPageSize || 5, // Utiliser la taille persistante ou la valeur par défaut
          showPageSizeOptions: true,
          pageSizeOptions: [5, 10, 25, 50],
        }}
        defaultSort={ENTITY_CONFIG.defaultSort}
        paginationEntityId="category" // Identifiant unique pour la pagination
        {...props}
      />
    </div>
  );
}

export default CategoriesTable;
