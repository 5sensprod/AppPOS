import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useCategory,
  useCategoryExtras,
  useCategoryTablePreferences,
} from '../stores/categoryStore';
import { useCategoryHierarchyStore } from '../stores/categoryHierarchyStore';
import { useEntityWithPreferences } from '@/hooks/useEntityWithPreferences';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { ChevronRight, ChevronDown } from 'lucide-react';

function CategoriesTable(props) {
  const { deleteCategory } = useCategory();
  const { syncCategory } = useCategoryExtras();
  const categoryHierarchyStore = useCategoryHierarchyStore();

  // Utiliser le hook personnalisé pour la gestion des préférences
  const {
    entities: hierarchicalCategories,
    tablePreferences,
    isLoading,
    error,
    handleDeleteEntity,
    handleSyncEntity,
    handlePreferencesChange,
    handleResetFilters,
  } = useEntityWithPreferences({
    entityType: 'category',
    entityStore: {
      data: categoryHierarchyStore.hierarchicalCategories,
      loading: categoryHierarchyStore.loading,
      fetchEntities: categoryHierarchyStore.fetchHierarchicalCategories,
      initWebSocket: categoryHierarchyStore.initWebSocket,
    },
    preferencesStore: useCategoryTablePreferences(),
    deleteEntityFn: async (id) => await deleteCategory(id),
    syncEntityFn: async (id) => await syncCategory(id),
  });

  // États pour l'expansion des catégories
  const [expandedCategories, setExpandedCategories] = useState({});

  // Restaurer l'état d'expansion depuis les préférences au chargement initial
  // et ouvrir/fermer les catégories selon la sélection active
  useEffect(() => {
    if (tablePreferences.detail?.lastFocusedElementId && hierarchicalCategories.length > 0) {
      // Si une ligne est sélectionnée, ouvrir uniquement ses parents
      const findParentPath = (categories, targetId, currentPath = []) => {
        for (const cat of categories || []) {
          if (cat._id === targetId) {
            return [...currentPath, cat._id];
          }

          if (cat.children && cat.children.length > 0) {
            const found = findParentPath(cat.children, targetId, [...currentPath, cat._id]);
            if (found) return found;
          }
        }
        return null;
      };

      const parentPath = findParentPath(
        hierarchicalCategories,
        tablePreferences.detail.lastFocusedElementId
      );

      if (parentPath) {
        const newExpandedState = {};
        parentPath.forEach((id) => {
          newExpandedState[id] = true;
        });

        setExpandedCategories(newExpandedState);
      }
    } else if (tablePreferences.detail?.expandedCategories) {
      // Sinon utiliser l'état d'expansion mémorisé
      setExpandedCategories(tablePreferences.detail.expandedCategories);
    }
  }, [tablePreferences.detail?.lastFocusedElementId, hierarchicalCategories]);

  // Fonction pour développer/replier une catégorie
  const toggleCategory = useCallback(
    (categoryId, event) => {
      if (event) {
        event.stopPropagation();
      }

      // Mettre à jour l'état local
      const newExpandedState = {
        ...expandedCategories,
        [categoryId]: !expandedCategories[categoryId],
      };

      setExpandedCategories(newExpandedState);

      // Mettre à jour les préférences APRÈS le rendu (via useEffect)
      setTimeout(() => {
        handlePreferencesChange('detail', {
          ...tablePreferences.detail,
          expandedCategories: newExpandedState,
          lastFocusedCategoryId: categoryId,
        });
      }, 0);
    },
    [expandedCategories, tablePreferences.detail, handlePreferencesChange]
  );

  // Gestion de la sélection de ligne avec repli automatique des autres
  const handleRowClick = useCallback(
    (rowData) => {
      // Si on clique sur une ligne, replier toutes les catégories sauf les parentes de celle-ci
      if (rowData && rowData._id) {
        // Déterminer le chemin de la hiérarchie pour cette ligne
        const findParentPath = (categories, targetId, currentPath = []) => {
          for (const cat of categories || []) {
            if (cat._id === targetId) {
              return [...currentPath, cat._id];
            }

            if (cat.children && cat.children.length > 0) {
              const found = findParentPath(cat.children, targetId, [...currentPath, cat._id]);
              if (found) return found;
            }
          }
          return null;
        };

        const parentPath = findParentPath(hierarchicalCategories, rowData._id);

        if (parentPath) {
          // Créer un nouvel état d'expansion où seuls les parents de la ligne cliquée sont développés
          const newExpandedState = {};
          parentPath.forEach((id) => {
            newExpandedState[id] = true;
          });

          setExpandedCategories(newExpandedState);

          // Mettre à jour les préférences
          setTimeout(() => {
            handlePreferencesChange('detail', {
              ...tablePreferences.detail,
              expandedCategories: newExpandedState,
              lastFocusedElementId: rowData._id,
              scrollPosition: window.scrollY,
            });
          }, 0);
        }
      }
    },
    [hierarchicalCategories, tablePreferences.detail, handlePreferencesChange]
  );

  // Fonction pour aplatir les données hiérarchiques
  const flattenHierarchy = useCallback(
    (categories, level = 0, parentExpanded = true) => {
      if (!categories) return [];

      let result = [];

      categories.forEach((category) => {
        const isExpanded = expandedCategories[category._id] || false;
        const hasChildren = category.children && category.children.length > 0;
        const isVisible = level === 0 || parentExpanded;

        if (isVisible) {
          // Créer l'élément nom avec indentation et icône d'expansion
          const indentedName = (
            <div className="flex items-center">
              <div style={{ width: `${level * 16}px` }} className="flex-shrink-0"></div>
              {hasChildren ? (
                <button
                  onClick={(e) => toggleCategory(category._id, e)}
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
            _childrenCount: hasChildren ? category.children.length : 0,
            product_count: category.productCount || 0,
            _no_sort: true,
          });

          // Ajouter récursivement les enfants si la catégorie est développée
          if (hasChildren && isExpanded) {
            result = result.concat(flattenHierarchy(category.children, level + 1, true));
          }
        }
      });

      return result;
    },
    [expandedCategories, toggleCategory]
  );

  // Processeur de recherche personnalisé
  const searchProcessor = useCallback(
    (items, term) => {
      if (!term) return items;

      const lowerSearchTerm = term.toLowerCase();

      // Fonction récursive pour rechercher dans la hiérarchie
      const searchInHierarchy = (cats, results = []) => {
        cats.forEach((cat) => {
          const nameMatch = cat.name.toLowerCase().includes(lowerSearchTerm);
          const descMatch =
            cat.description && cat.description.toLowerCase().includes(lowerSearchTerm);

          if (nameMatch || descMatch) {
            // Formater l'entrée pour l'affichage
            results.push({
              ...cat,
              name: (
                <div className="flex items-center">
                  <div style={{ width: `${0}px` }} className="flex-shrink-0"></div>
                  <span className="truncate text-gray-900 dark:text-gray-100">{cat.name}</span>
                </div>
              ),
              _originalName: cat.name,
              _level: 0,
              product_count: cat.productCount || 0,
              _no_sort: true,
            });
          }

          // Rechercher dans les enfants
          if (cat.children && cat.children.length > 0) {
            searchInHierarchy(cat.children, results);
          }
        });

        return results;
      };

      return searchInHierarchy(hierarchicalCategories);
    },
    [hierarchicalCategories]
  );

  // Traiter les données pour l'affichage
  const processedData = useMemo(() => {
    if (!hierarchicalCategories || hierarchicalCategories.length === 0) return [];

    // Si une recherche est active, utiliser le processeur de recherche
    if (tablePreferences.search.term && tablePreferences.search.term.length > 0) {
      return searchProcessor([], tablePreferences.search.term);
    }

    // Cloner avant de trier pour éviter de modifier les données d'origine
    const sortedRootCategories = [...hierarchicalCategories].sort((a, b) => {
      const aValue = a.name;
      const bValue = b.name;

      const result = aValue.localeCompare(bValue);
      return tablePreferences.sort.direction === 'asc' ? result : -result;
    });

    // Aplatir la hiérarchie pour l'affichage
    return flattenHierarchy(sortedRootCategories);
  }, [
    hierarchicalCategories,
    tablePreferences.search.term,
    tablePreferences.sort.direction,
    flattenHierarchy,
    searchProcessor,
  ]);

  // Désactiver le tri standard
  const sortProcessor = useCallback((data) => data, []);

  // Configuration des filtres
  const filters = ENTITY_CONFIG.filters || [];

  return (
    <div className="space-y-4">
      {Object.keys(tablePreferences.search.activeFilters).length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleResetFilters}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
      <EntityTable
        data={processedData}
        isLoading={isLoading}
        error={error}
        columns={ENTITY_CONFIG.columns}
        entityName="catégorie"
        entityNamePlural="catégories"
        baseRoute="/products/categories"
        filters={filters}
        searchFields={['_originalName', 'description']}
        searchProcessor={searchProcessor}
        sortProcessor={sortProcessor}
        onDelete={handleDeleteEntity}
        onSync={handleSyncEntity}
        syncEnabled={ENTITY_CONFIG.syncEnabled}
        actions={['view', 'edit', 'delete', 'sync']}
        batchActions={['delete', 'sync']}
        pagination={{
          enabled: true,
          pageSize: tablePreferences.pagination.pageSize,
          showPageSizeOptions: true,
          pageSizeOptions: [5, 10, 25, 50],
        }}
        defaultSort={ENTITY_CONFIG.defaultSort}
        tablePreferences={tablePreferences}
        onPreferencesChange={handlePreferencesChange}
        onRowClick={handleRowClick}
        {...props}
      />
    </div>
  );
}

export default CategoriesTable;
