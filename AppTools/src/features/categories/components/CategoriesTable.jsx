import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCategory, useCategoryExtras } from '../stores/categoryStore';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useEntityTable } from '@/hooks/useEntityTable';

function CategoriesTable(props) {
  // Utiliser useCategoryExtras qui inclut maintenant les données hiérarchiques
  const {
    deleteCategory,
    syncCategory,
    hierarchicalCategories,
    hierarchicalLoading,
    getHierarchicalCategories,
    initWebSocketListeners,
  } = useCategoryExtras();

  // États locaux pour le composant
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Initialiser les WebSockets une seule fois au montage du composant
  useEffect(() => {
    console.log('[TABLE] Initialisation du composant CategoriesTable');
    // Initialiser les écouteurs WebSocket avec la nouvelle méthode
    const cleanup = initWebSocketListeners();

    // Charger les catégories si elles ne sont pas déjà chargées
    if (!hierarchicalCategories || hierarchicalCategories.length === 0) {
      getHierarchicalCategories();
    }

    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [initWebSocketListeners, getHierarchicalCategories, hierarchicalCategories]);

  // Utilisation du hook useEntityTable sans les abonnements WebSocket
  const {
    loading: operationLoading,
    error,
    handleDeleteEntity,
    handleSyncEntity,
  } = useEntityTable({
    entityType: 'category',
    fetchEntities: getHierarchicalCategories,
    deleteEntity: async (id) => {
      await deleteCategory(id);
      // Le refresh se fera automatiquement via les événements WebSocket
    },
    syncEntity: async (id) => {
      await syncCategory(id);
      // Le refresh se fera automatiquement via les événements WebSocket
    },
    // Ne pas spécifier de customEventHandlers pour éviter les abonnements doublons
  });

  // Fonction pour développer/replier une catégorie
  const toggleCategory = useCallback((categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  // Gestionnaire de recherche
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
  }, []);

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
            _childrenCount: hasChildren ? category.children.length : 0,
            product_count: category.productCount || 0,
            _sortIndex: result.length, // Ajouter un index de tri pour préserver l'ordre
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
    if (searchTerm && searchTerm.length > 0) {
      return searchProcessor([], searchTerm);
    }

    // Aplatir la hiérarchie pour l'affichage
    return flattenHierarchy(hierarchicalCategories);
  }, [hierarchicalCategories, searchTerm, flattenHierarchy, searchProcessor]);

  const filters = [];

  // Combinaison de l'état de chargement du store et des opérations
  const isLoading = hierarchicalLoading || operationLoading;

  return (
    <>
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
        onSearch={handleSearch}
        onDelete={handleDeleteEntity}
        onSync={handleSyncEntity}
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
        {...props}
      />
    </>
  );
}

export default CategoriesTable;
