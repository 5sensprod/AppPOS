import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCategory } from '../stores/categoryStore';
import { useHierarchicalCategories } from '../stores/categoryHierarchyStore';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useEntityTable } from '@/hooks/useEntityTable';

function CategoriesTable(props) {
  const { deleteCategory, syncCategory } = useCategory();
  const { sync, hierarchy } = ENTITY_CONFIG.features;

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

  return (
    <EntityTable
      data={processedData}
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
      onSync={sync ? handleSyncEntity : undefined}
      syncEnabled={sync}
      actions={['view', 'edit', 'delete', ...(sync ? ['sync'] : [])]}
      batchActions={['delete', ...(sync ? ['sync'] : [])]}
      pagination={{
        enabled: true,
        pageSize: 5,
        showPageSizeOptions: true,
        pageSizeOptions: [5, 10, 25, 50],
      }}
      defaultSort={ENTITY_CONFIG.defaultSort}
      {...props}
    />
  );
}

export default CategoriesTable;
