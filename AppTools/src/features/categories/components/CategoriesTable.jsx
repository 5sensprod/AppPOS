import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useCategory, useCategoryExtras } from '../contexts/categoryContext';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { ChevronRight, ChevronDown } from 'lucide-react';

function CategoriesTable(props) {
  const { dispatch, deleteCategory } = useCategory();
  const { syncCategory, getHierarchicalCategories } = useCategoryExtras();

  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [localSort, setLocalSort] = useState(ENTITY_CONFIG.defaultSort);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Utiliser useRef pour suivre si les données ont déjà été chargées
  const dataLoaded = useRef(false);
  // Utiliser useRef pour suivre si une opération est en cours
  const operationInProgress = useRef(false);

  // Charger les données hiérarchiques une seule fois au montage du composant
  useEffect(() => {
    const fetchHierarchicalData = async () => {
      // Vérifier si les données sont déjà chargées ou si une opération est en cours
      if (dataLoaded.current || operationInProgress.current) {
        return;
      }

      operationInProgress.current = true;
      setLoading(true);

      try {
        const hierarchicalCategories = await getHierarchicalCategories();
        setCategories(hierarchicalCategories);
        setError(null);
        dataLoaded.current = true;
      } catch (err) {
        console.error('Erreur lors du chargement des catégories hiérarchiques:', err);
        setError(err.message || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
        operationInProgress.current = false;
      }
    };

    fetchHierarchicalData();
  }, [getHierarchicalCategories]); // Dépendance unique

  const toggleCategory = useCallback((categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  // Intercepter le tri et le gérer localement
  const customSort = useCallback((field) => {
    setLocalSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
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

          // Ajouter la catégorie au résultat
          result.push({
            ...category,
            name: indentedName,
            _originalName: category.name,
            _level: level,
            _childrenCount: hasChildren ? category.children.length : 0,
            product_count: category.productCount || 0,
            _no_sort: true, // Désactiver le tri standard
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

      return searchInHierarchy(categories);
    },
    [categories]
  );

  // Traiter les données pour l'affichage
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

  // Désactiver le tri standard
  const sortProcessor = useCallback((data) => data, []);

  // Gérer la suppression d'une catégorie
  const handleDeleteCategory = useCallback(
    async (id) => {
      if (operationInProgress.current) return;

      operationInProgress.current = true;
      setLoading(true);

      try {
        await deleteCategory(id);
        // Rafraîchir les données après la suppression
        const updatedCategories = await getHierarchicalCategories();
        setCategories(updatedCategories);
      } catch (err) {
        console.error('Erreur lors de la suppression de la catégorie:', err);
        setError(err.message || 'Erreur lors de la suppression');
      } finally {
        setLoading(false);
        operationInProgress.current = false;
      }
    },
    [deleteCategory, getHierarchicalCategories]
  );

  // Gérer la synchronisation d'une catégorie
  const handleSyncCategory = useCallback(
    async (id) => {
      if (operationInProgress.current) return;

      operationInProgress.current = true;
      setLoading(true);

      try {
        await syncCategory(id);
        // Rafraîchir les données après la synchronisation
        const updatedCategories = await getHierarchicalCategories();
        setCategories(updatedCategories);
      } catch (err) {
        console.error('Erreur lors de la synchronisation de la catégorie:', err);
        setError(err.message || 'Erreur lors de la synchronisation');
      } finally {
        setLoading(false);
        operationInProgress.current = false;
      }
    },
    [syncCategory, getHierarchicalCategories]
  );

  // Fonction pour rafraîchir les données manuellement
  const refreshData = useCallback(async () => {
    if (operationInProgress.current) return;

    operationInProgress.current = true;
    setLoading(true);

    try {
      const updatedCategories = await getHierarchicalCategories();
      setCategories(updatedCategories);
      setError(null);
    } catch (err) {
      console.error('Erreur lors du rafraîchissement des données:', err);
      setError(err.message || 'Erreur lors du rafraîchissement');
    } finally {
      setLoading(false);
      operationInProgress.current = false;
    }
  }, [getHierarchicalCategories]);

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
        onDelete={handleDeleteCategory}
        onSync={handleSyncCategory}
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
        onRefresh={refreshData}
        {...props}
      />
    </>
  );
}

export default CategoriesTable;
