import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useCategory, useCategoryExtras } from '../contexts/categoryContext';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { ChevronRight, ChevronDown } from 'lucide-react';
import websocketService from '@/services/websocketService';

function CategoriesTable(props) {
  const { dispatch, deleteCategory } = useCategory();
  const { syncCategory, getHierarchicalCategories } = useCategoryExtras();

  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [localSort, setLocalSort] = useState(ENTITY_CONFIG.defaultSort);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSearchTerm, setLastSearchTerm] = useState(''); // Pour éviter les requêtes redondantes

  // Utiliser useRef pour suivre si une opération est en cours
  const operationInProgress = useRef(false);

  useEffect(() => {
    const handleCategoryTreeChange = async () => {
      console.log('[WS-DEBUG] Rafraîchissement des catégories suite à un événement WebSocket');

      if (operationInProgress.current) return;

      operationInProgress.current = true;
      setLoading(true);

      try {
        const updatedCategories = await getHierarchicalCategories(searchTerm);
        setCategories(updatedCategories || []); // Assurer qu'on a au moins un tableau vide
        setError(null);
      } catch (err) {
        console.error('Erreur lors du rafraîchissement des catégories via WebSocket:', err);
        setError(err.message || 'Erreur de rafraîchissement');
      } finally {
        setLoading(false);
        operationInProgress.current = false;
      }
    };

    // Abonnement à l'événement WebSocket
    websocketService.on('category_tree_changed', handleCategoryTreeChange);

    // Désabonnement à la destruction du composant
    return () => {
      websocketService.off('category_tree_changed', handleCategoryTreeChange);
    };
  }, [getHierarchicalCategories, searchTerm]);

  // Charger les données hiérarchiques
  // Effet pour le chargement initial
  useEffect(() => {
    // Chargement initial au montage du composant
    if (!operationInProgress.current) {
      refreshData();
    }
  }, []); // Dépendance vide pour exécuter au montage uniquement

  // Effet pour la recherche
  useEffect(() => {
    // Éviter les requêtes inutiles si le terme de recherche n'a pas changé
    if (searchTerm === lastSearchTerm && searchTerm !== '') {
      return;
    }

    const fetchHierarchicalData = async () => {
      if (operationInProgress.current) {
        return;
      }

      operationInProgress.current = true;
      setLoading(true);
      setLastSearchTerm(searchTerm);

      try {
        const hierarchicalCategories = await getHierarchicalCategories(searchTerm);
        setCategories(hierarchicalCategories || []); // Toujours initialiser avec un tableau vide

        // NOUVEAU: Si recherche active, développer automatiquement toutes les catégories avec des résultats
        if (searchTerm) {
          const newExpandedState = {};

          // Fonction récursive pour trouver toutes les catégories à développer
          const findCategoriesToExpand = (cats) => {
            if (!cats || cats.length === 0) return;

            cats.forEach((cat) => {
              if (cat.children && cat.children.length > 0) {
                newExpandedState[cat._id] = true;
                findCategoriesToExpand(cat.children);
              }
            });
          };

          findCategoriesToExpand(hierarchicalCategories);
          setExpandedCategories(newExpandedState);
        }

        setError(null);
      } catch (err) {
        console.error('Erreur lors du chargement des catégories hiérarchiques:', err);
        setError(err.message || 'Erreur lors du chargement des données');
        setCategories([]); // En cas d'erreur, initialiser avec un tableau vide
      } finally {
        setLoading(false);
        operationInProgress.current = false;
      }
    };

    fetchHierarchicalData();
  }, [getHierarchicalCategories, searchTerm, lastSearchTerm]);

  const toggleCategory = useCallback((categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  // Fonction de recherche simplifiée - envoie directement au backend
  const handleSearch = useCallback((value) => {
    // Conserver la même logique mais avec value directement
    setSearchTerm(value);

    // Réinitialiser l'état d'expansion si la recherche est vide
    if (!value) {
      setExpandedCategories({});
    }
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
      if (!categories || categories.length === 0) return [];

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

          // NOUVEAU: Mettre en surbrillance les résultats de recherche quand searchTerm est actif
          const isSearchMatch =
            searchTerm &&
            (category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (category.description &&
                category.description.toLowerCase().includes(searchTerm.toLowerCase())));

          // Ajouter la catégorie au résultat
          result.push({
            ...category,
            name: indentedName,
            _originalName: category.name,
            _level: level,
            _childrenCount: hasChildren ? category.children.length : 0,
            product_count: category.productCount || 0,
            _no_sort: true, // Désactiver le tri standard
            _highlight: isSearchMatch, // NOUVEAU: Marquer les correspondances
          });

          // Ajouter récursivement les enfants si la catégorie est développée ou si recherche active
          if (hasChildren && (isExpanded || searchTerm)) {
            result = result.concat(
              flattenHierarchy(category.children, level + 1, isExpanded || searchTerm)
            );
          }
        }
      });

      return result;
    },
    [expandedCategories, toggleCategory, searchTerm]
  );

  // Traiter les données pour l'affichage
  const processedData = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    // Cloner avant de trier pour éviter de modifier les données d'origine
    const sortedRootCategories = [...categories].sort((a, b) => {
      const aValue = a.name;
      const bValue = b.name;

      const result = aValue.localeCompare(bValue);
      return localSort.direction === 'asc' ? result : -result;
    });

    // Aplatir la hiérarchie pour l'affichage
    return flattenHierarchy(sortedRootCategories);
  }, [categories, localSort, flattenHierarchy]);

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
        const updatedCategories = await getHierarchicalCategories(searchTerm);
        setCategories(updatedCategories || []);
      } catch (err) {
        console.error('Erreur lors de la suppression de la catégorie:', err);
        setError(err.message || 'Erreur lors de la suppression');
      } finally {
        setLoading(false);
        operationInProgress.current = false;
      }
    },
    [deleteCategory, getHierarchicalCategories, searchTerm]
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
        const updatedCategories = await getHierarchicalCategories(searchTerm);
        setCategories(updatedCategories || []);
      } catch (err) {
        console.error('Erreur lors de la synchronisation de la catégorie:', err);
        setError(err.message || 'Erreur lors de la synchronisation');
      } finally {
        setLoading(false);
        operationInProgress.current = false;
      }
    },
    [syncCategory, getHierarchicalCategories, searchTerm]
  );

  // Fonction pour rafraîchir les données manuellement
  const refreshData = useCallback(async () => {
    if (operationInProgress.current) return;

    operationInProgress.current = true;
    setLoading(true);

    try {
      const updatedCategories = await getHierarchicalCategories(searchTerm);
      setCategories(updatedCategories || []);
      setError(null);
    } catch (err) {
      console.error('Erreur lors du rafraîchissement des données:', err);
      setError(err.message || 'Erreur lors du rafraîchissement');
    } finally {
      setLoading(false);
      operationInProgress.current = false;
    }
  }, [getHierarchicalCategories, searchTerm]);

  // NOUVEAU: Style CSS pour mettre en surbrillance les résultats de recherche
  const customRowClassName = useCallback((item) => {
    return item._highlight ? 'bg-yellow-50 dark:bg-yellow-900' : '';
  }, []);

  // Toujours avoir des données à afficher, même vides
  const dataToDisplay = processedData || [];

  return (
    <>
      <EntityTable
        data={dataToDisplay}
        isLoading={loading}
        error={error}
        columns={ENTITY_CONFIG.columns}
        entityName="catégorie"
        entityNamePlural="catégories"
        baseRoute="/products/categories"
        filters={filters}
        searchFields={['_originalName', 'description']}
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
        customRowClassName={customRowClassName}
        {...props}
      />
    </>
  );
}

export default CategoriesTable;
