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

  // Fonction pour développer/replier une catégorie
  const toggleCategory = useCallback(
    (categoryId, event) => {
      if (event) {
        event.stopPropagation();
      }

      // Ne pas traiter si une mise à jour est déjà en cours
      if (isUpdating) return;

      setIsUpdating(true);
      console.log(`[CategoriesTable] Basculement de la catégorie: ${categoryId}`);

      // Capturer la position de défilement actuelle
      const currentScrollPosition = window.scrollY;
      console.log(`[CategoriesTable] Position de défilement actuelle: ${currentScrollPosition}`);

      // Mettre à jour l'état local
      const newExpandedState = {
        ...expandedCategories,
        [categoryId]: !expandedCategories[categoryId],
      };

      setExpandedCategories(newExpandedState);

      // Mise à jour synchronisée des préférences
      // Enregistrer dans selection ET expandedCategories pour assurer la compatibilité
      handlePreferencesChange('selection', {
        ...tablePreferences.selection,
        expandedCategories: newExpandedState,
        scrollPosition: currentScrollPosition,
      });

      // Mettre également à jour dans detail pour la compatibilité avec le composant de détail
      handlePreferencesChange('detail', {
        ...tablePreferences.detail,
        expandedCategories: newExpandedState,
        scrollPosition: currentScrollPosition,
      });

      // Réinitialiser le flag de mise à jour après un court délai
      setTimeout(() => {
        setIsUpdating(false);

        // Restaurer la position de défilement après l'expansion/réduction
        window.scrollTo({
          top: currentScrollPosition,
          behavior: 'instant',
        });
      }, 100);
    },
    [
      expandedCategories,
      tablePreferences.selection,
      tablePreferences.detail,
      handlePreferencesChange,
      isUpdating,
    ]
  );

  // Initialisation: déplier les parents si un élément est focalisé
  useEffect(() => {
    if (hierarchicalCategories.length > 0 && !initialized && !isUpdating) {
      console.log('[CategoriesTable] Initialisation des chemins et restauration du scroll');
      setInitialized(true);

      // Récupérer toutes les préférences potentiellement utiles
      const focusedItemId =
        tablePreferences.selection?.focusedItemId ||
        tablePreferences.detail?.focusedItemId ||
        tablePreferences.detail?.lastFocusedElementId;

      // Récupérer les états d'expansion sauvegardés (chercher dans les deux emplacements)
      const savedExpandedState =
        tablePreferences.selection?.expandedCategories ||
        tablePreferences.detail?.expandedCategories ||
        {};

      console.log("[CategoriesTable] État d'expansion récupéré:", savedExpandedState);
      console.log('[CategoriesTable] Élément focalisé récupéré:', focusedItemId);

      // Mettre d'abord à jour l'état local avec les catégories développées sauvegardées
      setExpandedCategories(savedExpandedState);

      // Si un élément est focalisé, s'assurer que ses parents sont développés
      if (focusedItemId) {
        console.log('[CategoriesTable] Élément focalisé trouvé, recherche du chemin parent');
        const parentPath = findParentPath(hierarchicalCategories, focusedItemId);

        if (parentPath && parentPath.length > 0) {
          // Créer un nouvel état qui préserve les expansions existantes et ajoute les nouvelles
          const newExpandedState = { ...savedExpandedState };

          parentPath.forEach((id) => {
            newExpandedState[id] = true;
          });

          console.log("[CategoriesTable] Nouvel état d'expansion calculé:", newExpandedState);
          setExpandedCategories(newExpandedState);

          // Synchroniser avec les préférences pour maintenir la cohérence
          // sans toutefois modifier la position de défilement qui sera restaurée séparément
          if (Object.keys(newExpandedState).length !== Object.keys(savedExpandedState).length) {
            handlePreferencesChange('selection', {
              ...tablePreferences.selection,
              expandedCategories: newExpandedState,
            });

            handlePreferencesChange('detail', {
              ...tablePreferences.detail,
              expandedCategories: newExpandedState,
            });
          }
        }
      }

      // Restaurer la position de défilement au plus tôt (si disponible)
      const scrollPosition =
        tablePreferences.selection?.scrollPosition || tablePreferences.detail?.scrollPosition;

      if (scrollPosition > 0) {
        console.log(
          `[CategoriesTable] Restauration de la position de défilement à ${scrollPosition}`
        );
        setTimeout(() => {
          window.scrollTo({
            top: scrollPosition,
            behavior: 'instant',
          });

          // Mettre en évidence l'élément focalisé s'il existe
          if (focusedItemId) {
            setTimeout(() => {
              const element = document.getElementById(`row-${focusedItemId}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-row');
                setTimeout(() => {
                  element.classList.remove('highlight-row');
                }, 2000);
              }
            }, 200);
          }
        }, 100);
      }
    }
  }, [
    hierarchicalCategories,
    tablePreferences.selection,
    tablePreferences.detail,
    findParentPath,
    initialized,
    isUpdating,
    handlePreferencesChange,
  ]);

  // Gestion de la sélection de ligne
  const handleRowClick = useCallback(
    (rowData) => {
      if (rowData && rowData._id && !isUpdating) {
        console.log('[CategoriesTable] Clic sur la ligne:', rowData._id);

        // Éviter de mettre à jour si c'est déjà l'élément focalisé
        if (tablePreferences.selection?.focusedItemId === rowData._id) {
          console.log('[CategoriesTable] Élément déjà focalisé, pas de mise à jour nécessaire');
          return;
        }

        setIsUpdating(true);

        // Sauvegarder la position de défilement actuelle
        const currentScrollPosition = window.scrollY;
        console.log(
          `[CategoriesTable] Position de défilement sauvegardée: ${currentScrollPosition}`
        );

        // Mettre à jour l'élément focalisé dans les préférences (section selection)
        handlePreferencesChange('selection', {
          ...tablePreferences.selection,
          focusedItemId: rowData._id,
          scrollPosition: currentScrollPosition,
        });

        // Mettre également à jour dans detail pour la compatibilité avec le hook useScrollRestoration
        handlePreferencesChange('detail', {
          ...tablePreferences.detail,
          lastFocusedElementId: rowData._id,
          scrollPosition: currentScrollPosition,
        });

        // Trouver le chemin vers l'élément cible
        const parentPath = findParentPath(hierarchicalCategories, rowData._id);

        if (parentPath && parentPath.length > 0) {
          console.log(
            '[CategoriesTable] Chemin parent trouvé, développement des catégories parents'
          );
          const newExpandedState = {};
          parentPath.forEach((id) => {
            newExpandedState[id] = true;
          });

          setExpandedCategories(newExpandedState);

          // Mettre à jour les deux sections pour maintenir la cohérence
          handlePreferencesChange('selection', {
            ...tablePreferences.selection,
            expandedCategories: newExpandedState,
            focusedItemId: rowData._id,
            scrollPosition: currentScrollPosition,
          });

          handlePreferencesChange('detail', {
            ...tablePreferences.detail,
            expandedCategories: newExpandedState,
            lastFocusedElementId: rowData._id,
            scrollPosition: currentScrollPosition,
          });
        }

        // Ajouter une classe pour mettre en évidence temporairement la ligne
        setTimeout(() => {
          const element = document.getElementById(`row-${rowData._id}`);
          if (element) {
            element.classList.add('highlight-row');
            setTimeout(() => {
              element.classList.remove('highlight-row');
            }, 2000);
          }
        }, 300);

        // Réinitialiser le flag après un court délai
        setTimeout(() => {
          setIsUpdating(false);
        }, 100);
      }
    },
    [
      handlePreferencesChange,
      tablePreferences.selection,
      tablePreferences.detail,
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
