import React, { useState, useEffect, useCallback } from 'react';
import { useCategory, useCategoryExtras } from '../contexts/categoryContext';
import apiService from '../../../services/api';
import websocketService from '../../../services/websocketService';
import { ENTITY_CONFIG } from '../constants';
import EntityTable from '@/components/common/EntityTable/index';
import { ChevronRight, ChevronDown } from 'lucide-react';

function HierarchicalCategories(props) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const { categorys, deleteCategory } = useCategory();
  const { syncCategory } = useCategoryExtras();
  const [searchTerm, setSearchTerm] = useState('');
  const [localSort, setLocalSort] = useState(ENTITY_CONFIG.defaultSort);

  // ✅ Fonction pour récupérer les catégories hiérarchiques
  const fetchHierarchicalCategories = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/categories/hierarchical');
      setCategories(response.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur lors du chargement des catégories:', err);
      setError(err.message || 'Erreur de chargement');
      setLoading(false);
    }
  };

  // ✅ Charger les catégories au montage
  useEffect(() => {
    fetchHierarchicalCategories();

    // ✅ Gestion des mises à jour en temps réel via WebSocket
    const handleCategoryUpdate = () => {
      console.log('[WS-DEBUG] Catégories mises à jour via WebSocket, rechargement...');
      fetchHierarchicalCategories();
    };

    websocketService.on('categories_updated', handleCategoryUpdate);
    websocketService.on('categories_created', handleCategoryUpdate);
    websocketService.on('categories_deleted', handleCategoryUpdate);

    return () => {
      websocketService.off('categories_updated', handleCategoryUpdate);
      websocketService.off('categories_created', handleCategoryUpdate);
      websocketService.off('categories_deleted', handleCategoryUpdate);
    };
  }, []);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const customSort = (field) => {
    setLocalSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const searchProcessor = useCallback(
    (items, term) => {
      if (!term) return items;

      const lowerSearchTerm = term.toLowerCase();

      const matches = categorys
        .filter(
          (cat) =>
            (cat._originalName || cat.name).toLowerCase().includes(lowerSearchTerm) ||
            (cat.description && cat.description.toLowerCase().includes(lowerSearchTerm))
        )
        .map((cat) => cat._id);

      const parentsToShow = new Set();
      const addParents = (categoryId) => {
        const category = categorys.find((cat) => cat._id === categoryId);
        if (category && category.parent_id) {
          parentsToShow.add(category.parent_id);
          addParents(category.parent_id);
        }
      };

      matches.forEach((id) => addParents(id));

      return items.filter(
        (item) =>
          matches.includes(item._id) ||
          parentsToShow.has(item._id) ||
          (item._originalName && item._originalName.toLowerCase().includes(lowerSearchTerm)) ||
          (item.description && item.description.toLowerCase().includes(lowerSearchTerm))
      );
    },
    [categorys]
  );

  // ✅ Construction de la table des catégories hiérarchiques
  const tableData = React.useMemo(() => {
    const flattenCategories = [];

    const processCategory = (category, level = 0) => {
      const isExpanded = expandedCategories[category._id] || false;
      const hasChildren = category.children && category.children.length > 0;

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

      if (hasChildren && isExpanded) {
        category.children.forEach((child) => processCategory(child, level + 1));
      }
    };

    categories.forEach((category) => processCategory(category));
    return flattenCategories;
  }, [categories, expandedCategories]);

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
