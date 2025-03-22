import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useCategory, useCategoryExtras } from '../contexts/categoryContext';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useEntityTable } from '@/hooks/useEntityTable';

function CategoriesTable(props) {
  const { deleteCategory } = useCategory();
  const { syncCategory, getHierarchicalCategories } = useCategoryExtras();

  // États spécifiques aux catégories
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [localSort, setLocalSort] = useState(ENTITY_CONFIG.defaultSort);

  // Référence pour suivre si les données ont déjà été chargées
  const dataLoaded = useRef(false);

  // Gestionnaire d'événement spécifique pour les changements d'arborescence
  const handleCategoryTreeChange = useCallback(async () => {
    const updatedCategories = await getHierarchicalCategories();
    setCategories(updatedCategories);
  }, [getHierarchicalCategories]);

  // Utilisation du hook useEntityTable avec un fetchEntities personnalisé
  const { loading, error, executeOperation, handleDeleteEntity, handleSyncEntity } = useEntityTable(
    {
      entityType: 'category',
      // Fonction de chargement personnalisée pour les catégories hiérarchiques
      fetchEntities: async () => {
        if (!dataLoaded.current) {
          const hierarchicalCategories = await getHierarchicalCategories();
          setCategories(hierarchicalCategories);
          dataLoaded.current = true;
        }
      },
      deleteEntity: async (id) => {
        await deleteCategory(id);
        // Rafraîchissement personnalisé après suppression
        const updatedCategories = await getHierarchicalCategories();
        setCategories(updatedCategories);
      },
      syncEntity: async (id) => {
        await syncCategory(id);
        // Rafraîchissement personnalisé après synchronisation
        const updatedCategories = await getHierarchicalCategories();
        setCategories(updatedCategories);
      },
      customEventHandlers: {
        'categorys.tree.changed': handleCategoryTreeChange,
      },
    }
  );

  // Créer des gestionnaires d'événements personnalisés pour mettre à jour les catégories
  useEffect(() => {
    // Remplacer les gestionnaires d'événements standards pour les catégories
    const handleEntityEvent = async () => {
      executeOperation(async () => {
        const updatedCategories = await getHierarchicalCategories();
        setCategories(updatedCategories);
      });
    };

    // Ce hook sera exécuté après les gestionnaires d'événements standards
    // et remplacera leur comportement pour les catégories
    return () => {
      // Nettoyage si nécessaire
    };
  }, [executeOperation, getHierarchicalCategories]);

  // Fonction pour développer/replier une catégorie (spécifique à ce composant)
  const toggleCategory = useCallback((categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  // Gestionnaire de recherche (spécifique à ce composant)
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  // Gestionnaire de tri (spécifique à ce composant)
  const customSort = useCallback((field) => {
    setLocalSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Fonction pour aplatir les données hiérarchiques (spécifique à ce composant)
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

  // Processeur de recherche personnalisé (spécifique à ce composant)
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

      return searchInHierarchy(categories);
    },
    [categories]
  );

  // Traiter les données pour l'affichage (spécifique à ce composant)
  const processedData = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    // Si une recherche est active, utiliser le processeur de recherche
    if (searchTerm && searchTerm.length > 0) {
      return searchProcessor([], searchTerm);
    }

    // Cloner avant de trier pour éviter de modifier les données d'origine
    const sortedRootCategories = [...categories].sort((a, b) => {
      const aValue = a.name;
      const bValue = b.name;

      const result = aValue.localeCompare(bValue);
      return localSort.direction === 'asc' ? result : -result;
    });

    // Aplatir la hiérarchie pour l'affichage
    return flattenHierarchy(sortedRootCategories);
  }, [categories, searchTerm, localSort, flattenHierarchy, searchProcessor]);

  const filters = [];

  // Désactiver le tri standard (spécifique à ce composant)
  const sortProcessor = useCallback((data) => data, []);

  return (
    <>
      <EntityTable
        data={processedData}
        isLoading={loading}
        error={error}
        columns={ENTITY_CONFIG.columns}
        entityName="catégorie"
        entityNamePlural="catégories"
        baseRoute="/products/categories"
        filters={filters}
        searchFields={['_originalName', 'description']}
        searchProcessor={searchProcessor}
        sortProcessor={sortProcessor}
        onSearch={handleSearch}
        onSort={customSort}
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
        sort={localSort}
        {...props}
      />
    </>
  );
}

export default CategoriesTable;
