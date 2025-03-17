import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useCategory, useCategoryExtras } from '../contexts/categoryContext';
import { ENTITY_CONFIG } from '../constants';
import EntityTable from '@/components/common/EntityTable/index';
import { ChevronRight, ChevronDown } from 'lucide-react';

function HierarchicalCategories(props) {
  // États
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [localSort, setLocalSort] = useState(ENTITY_CONFIG.defaultSort);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [previousExpandedState, setPreviousExpandedState] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);

  // Contextes
  const { categorys, deleteCategory, fetchCategorys } = useCategory();
  const { syncCategory, getHierarchicalCategories } = useCategoryExtras();

  // Chargement initial des données
  useEffect(() => {
    async function loadData() {
      if (!dataLoaded) {
        try {
          setLoading(true);
          if (!categorys?.length) fetchCategorys();
          const data = await getHierarchicalCategories();
          setCategories(data);
          setDataLoaded(true);
        } catch (err) {
          setError(err.message || 'Erreur de chargement');
        } finally {
          setLoading(false);
        }
      }
    }
    loadData();
  }, [dataLoaded, fetchCategorys, getHierarchicalCategories, categorys]);

  // Actualisation quand les données du contexte changent
  useEffect(() => {
    if (categorys?.length && dataLoaded) {
      const timeoutId = setTimeout(async () => {
        try {
          const data = await getHierarchicalCategories();
          setCategories(data);
        } catch (err) {
          console.error('Erreur de mise à jour:', err);
        }
      }, 300); // Debounce les mises à jour
      return () => clearTimeout(timeoutId);
    }
  }, [categorys, getHierarchicalCategories, dataLoaded]);

  // Surveillance de l'état de recherche
  useEffect(() => {
    setIsSearchActive(Boolean(searchTerm));
  }, [searchTerm]);

  // Fonctions d'interaction
  const toggleCategory = useCallback((categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  const handleSearch = useCallback(
    (value) => {
      // Restauration de l'état d'origine si on efface la recherche
      if (!value && isSearchActive) {
        setExpandedCategories(previousExpandedState);
        setSearchTerm('');
        return;
      }

      // Sauvegarde de l'état avant recherche
      if (value && !isSearchActive) {
        setPreviousExpandedState({ ...expandedCategories });
      }

      setSearchTerm(value);

      if (!value) return;

      // Expansion des parents pour les résultats de recherche
      const lowerSearchTerm = value.toLowerCase();
      const matchingCategories = categorys.filter(
        (cat) =>
          (cat.name || '').toLowerCase().includes(lowerSearchTerm) ||
          (cat.description || '').toLowerCase().includes(lowerSearchTerm)
      );

      const parentsToExpand = new Set();

      const addParents = (categoryId) => {
        const category = categorys.find((cat) => cat._id === categoryId);
        if (category?.parent_id) {
          parentsToExpand.add(category.parent_id);
          addParents(category.parent_id);
        }
      };

      matchingCategories.forEach((category) => {
        if (category.parent_id) {
          parentsToExpand.add(category.parent_id);
          addParents(category.parent_id);
        }
      });

      setExpandedCategories((prev) => {
        const newState = { ...prev };
        parentsToExpand.forEach((id) => {
          newState[id] = true;
        });
        return newState;
      });
    },
    [categorys, isSearchActive, previousExpandedState, expandedCategories]
  );

  const customSort = useCallback((field) => {
    setLocalSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Processeur de recherche
  const searchProcessor = useCallback(
    (items, term) => {
      if (!term) return items;

      const lowerSearchTerm = term.toLowerCase();

      return items.filter((item) => {
        // Correspondance directe
        if (
          (item._originalName && item._originalName.toLowerCase().includes(lowerSearchTerm)) ||
          (item.description && item.description.toLowerCase().includes(lowerSearchTerm))
        ) {
          return true;
        }

        // Parent d'une correspondance
        return categorys.some(
          (cat) =>
            cat.parent_id === item._id &&
            ((cat.name && cat.name.toLowerCase().includes(lowerSearchTerm)) ||
              (cat.description && cat.description.toLowerCase().includes(lowerSearchTerm)))
        );
      });
    },
    [categorys]
  );

  // Construction de la table
  const tableData = useMemo(() => {
    const flattenCategories = [];

    const processCategory = (category, level = 0, forceShow = false) => {
      const isExpanded = expandedCategories[category._id] || false;
      const hasChildren = category.children?.length > 0;
      const shouldShowThisLevel = isSearchActive || forceShow;

      // Nom avec indentation
      const indentedName = (
        <div className="flex items-center">
          <div style={{ width: `${level * 16}px` }} className="flex-shrink-0"></div>
          {hasChildren && (
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
          )}
          <span className="text-gray-900 dark:text-gray-100">{category.name}</span>
        </div>
      );

      flattenCategories.push({
        ...category,
        name: indentedName,
        _originalName: category.name,
        _level: level,
      });

      // Traitement des enfants
      if (hasChildren && (isExpanded || shouldShowThisLevel)) {
        category.children.forEach((child) =>
          processCategory(child, level + 1, shouldShowThisLevel)
        );
      }
    };

    categories.forEach((category) => processCategory(category));
    return flattenCategories;
  }, [categories, expandedCategories, toggleCategory, isSearchActive]);

  // Filtres
  const filters = [
    {
      id: 'level',
      type: 'select',
      allLabel: 'Tous les niveaux',
      options: [
        { value: '0', label: 'Niveau 0' },
        { value: '1', label: 'Niveau 1' },
        { value: '2', label: 'Niveau 2' },
        { value: '3', label: 'Niveau 3' },
      ],
    },
  ];

  return (
    <EntityTable
      data={tableData}
      isLoading={loading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="catégorie"
      entityNamePlural="catégories"
      baseRoute="/products/categories"
      filters={filters}
      searchFields={['_originalName', 'description']}
      searchProcessor={searchProcessor}
      onSearch={handleSearch}
      onSort={customSort}
      onDelete={deleteCategory}
      onSync={syncCategory}
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
  );
}

export default HierarchicalCategories;
