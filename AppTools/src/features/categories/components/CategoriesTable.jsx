// src/features/categories/components/CategoriesTable.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useCategory, useCategoryExtras } from '../contexts/categoryContext';
import EntityTable from '@/components/common/EntityTable/index';
import { ENTITY_CONFIG } from '../constants';
import { ChevronRight, ChevronDown } from 'lucide-react';

function CategoriesTable(props) {
  const { categorys, loading, error, fetchCategorys, deleteCategory } = useCategory();
  const { syncCategory } = useCategoryExtras();
  const [expandedCategories, setExpandedCategories] = useState({});

  // Chargement direct des données au montage du composant
  useEffect(() => {
    fetchCategorys();
  }, [fetchCategorys]);

  // Toggle l'état d'expansion d'une catégorie
  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Organiser les catégories en structure hiérarchique
  const hierarchicalData = useMemo(() => {
    if (!categorys) return [];

    // Créer une map d'ID à catégorie et identifier les relations parent-enfant
    const categoryMap = {};
    categorys.forEach((cat) => {
      categoryMap[cat._id] = { ...cat, children: [] };
    });

    // Remplir la structure hiérarchique
    const rootCategories = [];

    categorys.forEach((cat) => {
      if (cat.parent_id && categoryMap[cat.parent_id]) {
        categoryMap[cat.parent_id].children.push(categoryMap[cat._id]);
      } else {
        rootCategories.push(categoryMap[cat._id]);
      }
    });

    // Trier les catégories
    rootCategories.sort((a, b) => a.name.localeCompare(b.name));
    Object.values(categoryMap).forEach((cat) => {
      if (cat.children.length > 0) {
        cat.children.sort((a, b) => a.name.localeCompare(b.name));
      }
    });

    // Aplatir l'arborescence selon l'état d'expansion
    const flattenedCategories = [];

    function flatten(categories, level = 0) {
      categories.forEach((cat) => {
        const isExpanded = expandedCategories[cat._id];
        const hasChildren = cat.children && cat.children.length > 0;

        // Créer le rendu du nom avec indentation et icône
        const indentedName = (
          <div className="flex items-center">
            <div style={{ width: `${level * 16}px` }} className="flex-shrink-0"></div>
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(cat._id);
                }}
                className="flex-shrink-0 mr-1 focus:outline-none hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded"
                aria-label={isExpanded ? 'Replier la catégorie' : 'Déplier la catégorie'}
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-5 flex-shrink-0"></div>}
            <span className="truncate">{cat.name}</span>
            {hasChildren && <span className="ml-2 text-gray-500">({cat.children.length})</span>}
          </div>
        );

        // Ajouter la catégorie avec le nom modifié
        flattenedCategories.push({
          ...cat,
          name: indentedName,
          _originalName: cat.name, // Conserver le nom original pour la recherche
        });

        // Ajouter récursivement les enfants si cette catégorie est étendue
        if (hasChildren && isExpanded) {
          flatten(cat.children, level + 1);
        }
      });
    }

    flatten(rootCategories);
    return flattenedCategories;
  }, [categorys, expandedCategories]);

  // Configuration des filtres
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

  // Modification de la recherche pour utiliser le nom original
  const searchProcessor = (items, searchTerm) => {
    if (!searchTerm) return items;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item._originalName?.toLowerCase().includes(lowerSearchTerm) ||
        item.description?.toLowerCase().includes(lowerSearchTerm)
    );
  };

  return (
    <EntityTable
      data={hierarchicalData || []}
      isLoading={loading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="catégorie"
      entityNamePlural="catégories"
      baseRoute="/products/categories"
      filters={filters}
      searchFields={['_originalName', 'description']}
      onDelete={deleteCategory}
      onSync={syncCategory}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      actions={['view', 'edit', 'delete', 'sync']}
      batchActions={['delete', 'sync']}
      pagination={{
        enabled: true,
        pageSize: 15,
        showPageSizeOptions: true,
        pageSizeOptions: [15, 30, 50, 100],
      }}
      defaultSort={ENTITY_CONFIG.defaultSort}
      searchProcessor={searchProcessor}
      {...props}
    />
  );
}

export default CategoriesTable;
