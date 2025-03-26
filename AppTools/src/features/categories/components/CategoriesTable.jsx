// src/features/categories/components/CategoriesTable.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCategory } from '../stores/categoryStore';
import { useHierarchicalCategories } from '../stores/categoryHierarchyStore';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useEntityTable } from '@/hooks/useEntityTable';

function CategoriesTable(props) {
  // Récupérer les fonctions du store
  const { deleteCategory, syncCategory } = useCategory();

  // Accéder au store hiérarchique
  const {
    hierarchicalCategories,
    loading: hierarchicalLoading,
    fetchHierarchicalCategories,
    initWebSocketListeners,
    debugListeners,
  } = useHierarchicalCategories();

  // États locaux pour le composant
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialiser les WebSockets et charger les données au montage du composant
  useEffect(() => {
    console.log('[CATEGORIES_TABLE] Montage du composant');

    // Initialiser les écouteurs WebSocket une seule fois
    const cleanupListeners = initWebSocketListeners();

    // Charger les données initiales
    fetchHierarchicalCategories();

    // Afficher l'état des écouteurs pour débogage
    setTimeout(() => {
      debugListeners();
    }, 1000);

    // Nettoyer les écouteurs lors du démontage
    return () => {
      console.log('[CATEGORIES_TABLE] Démontage du composant');
      if (typeof cleanupListeners === 'function') {
        cleanupListeners();
      }
    };
  }, []);

  // Fonction pour rafraîchir les données
  const refreshCategories = useCallback(() => {
    console.log('[CATEGORIES_TABLE] Rafraîchissement manuel des catégories');
    return fetchHierarchicalCategories();
  }, [fetchHierarchicalCategories]);

  // Utilisation du hook useEntityTable
  const {
    loading: operationLoading,
    error,
    executeOperation,
  } = useEntityTable({
    deleteEntity: deleteCategory,
    syncEntity: syncCategory,
  });

  // Gestionnaires d'actions personnalisés
  const handleDeleteEntity = useCallback(
    async (id) => {
      if (!window.confirm(`Êtes-vous sûr de vouloir supprimer cette catégorie ?`)) {
        return;
      }

      return executeOperation(async () => {
        await deleteCategory(id);
        // Le rafraîchissement devrait se faire automatiquement via WebSocket,
        // mais on le force au cas où
        await refreshCategories();
      });
    },
    [executeOperation, deleteCategory, refreshCategories]
  );

  const handleSyncEntity = useCallback(
    async (id) => {
      return executeOperation(async () => {
        await syncCategory(id);
        // Le rafraîchissement devrait se faire automatiquement via WebSocket,
        // mais on le force au cas où
        await refreshCategories();
      });
    },
    [executeOperation, syncCategory, refreshCategories]
  );

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
        if (!cats) return results;

        cats.forEach((cat) => {
          if (!cat || !cat.name) return;

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
