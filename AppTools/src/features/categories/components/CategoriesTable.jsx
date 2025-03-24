import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useCategory,
  useCategoryExtras,
  useCategoryTablePreferences,
} from '../stores/categoryStore';
import { useCategoryHierarchyStore } from '../stores/categoryHierarchyStore';
import { useEntityTableWithPreferences } from '@/hooks/useEntityTableWithPreferences';
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
  } = useEntityTableWithPreferences({
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
  // Référence pour suivre si une mise à jour est en cours
  const [isUpdating, setIsUpdating] = useState(false);
  // Référence pour suivre si l'initialisation a été faite
  const [initialized, setInitialized] = useState(false);

  // Fonction améliorée pour trouver le chemin vers un élément
  const findParentPath = useCallback((categories, targetId, currentPath = []) => {
    if (!categories || !targetId) return null;

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
  }, []);

  // Fonction pour développer uniquement le chemin vers un élément
  const expandParentsOf = useCallback(
    (targetId) => {
      if (!targetId || hierarchicalCategories.length === 0 || isUpdating) return false;

      // Marquer qu'une mise à jour est en cours
      setIsUpdating(true);

      // Trouver le chemin vers l'élément cible
      const parentPath = findParentPath(hierarchicalCategories, targetId);
      console.log('Chemin trouvé pour', targetId, ':', parentPath);

      if (parentPath && parentPath.length > 0) {
        // Réinitialiser toutes les expansions d'abord
        const newExpandedState = {};

        // Marquer tous les éléments du chemin comme dépliés, y compris l'élément cible
        parentPath.forEach((id) => {
          newExpandedState[id] = true;
        });

        console.log("Nouvel état d'expansion:", newExpandedState);

        // Mettre à jour l'état local
        setExpandedCategories(newExpandedState);

        // IMPORTANT: Utiliser la section 'selection' au lieu de 'detail'
        handlePreferencesChange('selection', {
          ...tablePreferences.selection,
          expandedCategories: newExpandedState,
        });

        // Réinitialiser le flag de mise à jour après un court délai
        setTimeout(() => {
          setIsUpdating(false);
        }, 100);

        return true;
      }

      setIsUpdating(false);
      return false;
    },
    [
      hierarchicalCategories,
      findParentPath,
      handlePreferencesChange,
      tablePreferences.selection,
      isUpdating,
    ]
  );

  // Fonction pour développer/replier une catégorie
  const toggleCategory = useCallback(
    (categoryId, event) => {
      if (event) {
        event.stopPropagation();
      }

      // Ne pas traiter si une mise à jour est déjà en cours
      if (isUpdating) return;

      setIsUpdating(true);

      // Mettre à jour l'état local
      const newExpandedState = {
        ...expandedCategories,
        [categoryId]: !expandedCategories[categoryId],
      };

      setExpandedCategories(newExpandedState);

      // Mettre à jour les préférences dans la section 'selection'
      handlePreferencesChange('selection', {
        ...tablePreferences.selection,
        expandedCategories: newExpandedState,
      });

      // Réinitialiser le flag de mise à jour après un court délai
      setTimeout(() => {
        setIsUpdating(false);
      }, 100);
    },
    [expandedCategories, tablePreferences.selection, handlePreferencesChange, isUpdating]
  );

  // Initialisation: déplier les parents si un élément est focalisé
  useEffect(() => {
    if (hierarchicalCategories.length > 0 && !initialized && !isUpdating) {
      console.log('Initialisation des chemins');
      setInitialized(true);

      // Récupérer l'élément focalisé et les catégories dépliées depuis tablePreferences
      const focusedItemId = tablePreferences.selection?.focusedItemId;
      const savedExpandedState = tablePreferences.selection?.expandedCategories;

      if (focusedItemId) {
        console.log('Élément focalisé trouvé:', focusedItemId);
        // Pour éviter la boucle infinie, on ne met pas à jour les préférences ici
        const parentPath = findParentPath(hierarchicalCategories, focusedItemId);

        if (parentPath && parentPath.length > 0) {
          const newExpandedState = {};
          parentPath.forEach((id) => {
            newExpandedState[id] = true;
          });

          setExpandedCategories(newExpandedState);
        }
      } else if (savedExpandedState) {
        console.log("Restauration de l'état d'expansion sauvegardé");
        setExpandedCategories(savedExpandedState);
      }
    }
  }, [hierarchicalCategories, tablePreferences.selection, findParentPath, initialized, isUpdating]);

  // Gestion de la sélection de ligne
  const handleRowClick = useCallback(
    (rowData) => {
      if (rowData && rowData._id && !isUpdating) {
        console.log('Clic sur la ligne:', rowData._id);

        // Éviter de mettre à jour si c'est déjà l'élément focalisé
        if (tablePreferences.selection?.focusedItemId === rowData._id) {
          return;
        }

        setIsUpdating(true);

        // Sauvegarder la position de défilement actuelle
        const currentScrollPosition = window.scrollY;

        // Mettre à jour l'élément focalisé dans les préférences
        handlePreferencesChange('selection', {
          ...tablePreferences.selection,
          focusedItemId: rowData._id,
          scrollPosition: currentScrollPosition, // Sauvegarder la position
        });

        // Trouver le chemin vers l'élément cible
        const parentPath = findParentPath(hierarchicalCategories, rowData._id);

        if (parentPath && parentPath.length > 0) {
          const newExpandedState = {};
          parentPath.forEach((id) => {
            newExpandedState[id] = true;
          });

          setExpandedCategories(newExpandedState);
        }

        // Réinitialiser le flag après un court délai
        setTimeout(() => {
          setIsUpdating(false);
        }, 100);
      }
    },
    [
      handlePreferencesChange,
      tablePreferences.selection,
      findParentPath,
      hierarchicalCategories,
      isUpdating,
    ]
  );

  // Fonction pour aplatir les données hiérarchiques
  const flattenHierarchy = useCallback(
    (categories, level = 0, parentExpanded = true) => {
      if (!categories) return [];

      let result = [];

      categories.forEach((category) => {
        const isExpanded = expandedCategories[category._id] === true;
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
    expandedCategories,
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
