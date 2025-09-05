// src/components/reports/export/CategoryTreeSelector.jsx

import React, { useEffect } from 'react';
import CategoryTreeNode from './CategoryTreeNode';
import { useCategoryTree } from '../../../hooks/useCategoryTree';

/**
 * Composant de poignée de redimensionnement
 */
const ResizeHandle = ({ onResizeStart, isResizing }) => (
  <div
    className={`absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center group ${
      isResizing
        ? 'bg-blue-500'
        : 'bg-blue-200 dark:bg-blue-700 hover:bg-blue-300 dark:hover:bg-blue-600'
    } transition-colors duration-200`}
    onMouseDown={onResizeStart}
    style={{ borderRadius: '0 0 6px 6px' }}
  >
    {/* Lignes de la poignée */}
    <div className="flex flex-col items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
      <div className="w-8 h-0.5 bg-white dark:bg-gray-300 rounded"></div>
      <div className="w-6 h-0.5 bg-white dark:bg-gray-300 rounded"></div>
      <div className="w-4 h-0.5 bg-white dark:bg-gray-300 rounded"></div>
    </div>
  </div>
);

/**
 * Composant pour les boutons d'action de l'arbre
 */
const TreeActionButtons = ({
  onSelectAll,
  onDeselectAll,
  onExpandAll,
  onCollapseAll,
  selectedCount,
  expandedCount,
}) => (
  <div className="flex items-center gap-3 mb-3 flex-wrap">
    <button
      type="button"
      onClick={onSelectAll}
      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
    >
      Tout sélectionner
    </button>
    <button
      type="button"
      onClick={onDeselectAll}
      className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
    >
      Tout désélectionner
    </button>
    <button
      type="button"
      onClick={expandedCount === 0 ? onExpandAll : onCollapseAll}
      className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition-colors"
    >
      {expandedCount === 0 ? 'Développer tout' : 'Réduire tout'}
    </button>
    <span className="text-xs text-blue-700 dark:text-blue-300">{selectedCount} sélectionnées</span>
  </div>
);

/**
 * Composant pour la légende des badges
 */
const BadgeLegend = () => (
  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1">
        <span className="bg-blue-100 text-blue-700 px-1 rounded text-xs">12</span>
        <span>Produits directs</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="bg-green-100 text-green-700 px-1 rounded text-xs">+8</span>
        <span>Produits des sous-catégories</span>
      </div>
    </div>
  </div>
);

/**
 * Composant principal pour la sélection d'arbre de catégories
 */
const CategoryTreeSelector = ({
  exportOptions,
  setExportOptions,
  categorySelectorHeight,
  setCategorySelectorHeight,
  isResizing,
  handleResizeStart,
}) => {
  const {
    categoryTree,
    loadingCategories,
    expandedCategories,
    fetchCategoriesWithStock,
    toggleCategoryExpansion,
    expandAllCategories,
    collapseAllCategories,
    selectAllCategories,
    deselectAllCategories,
    collectAllCategoryIds,
    getSelectedProductsCount,
    handleCategorySelection,
  } = useCategoryTree();

  // Charger les catégories au montage si le groupement est activé
  useEffect(() => {
    if (exportOptions.groupByCategory && categoryTree.length === 0) {
      fetchCategoriesWithStock();
    }
  }, [exportOptions.groupByCategory, categoryTree.length, fetchCategoriesWithStock]);

  /**
   * Gère la sélection de toutes les catégories
   */
  const handleSelectAll = () => {
    const allIds = selectAllCategories();
    setExportOptions((prev) => ({
      ...prev,
      selectedCategories: allIds,
    }));
  };

  /**
   * Gère la désélection de toutes les catégories
   */
  const handleDeselectAll = () => {
    setExportOptions((prev) => ({
      ...prev,
      selectedCategories: [],
    }));
  };

  /**
   * Gère la sélection d'une catégorie individuelle
   */
  const handleCategoryToggle = (categoryId, isChecking, categoryAndDescendants) => {
    const newSelection = isChecking
      ? [
          ...exportOptions.selectedCategories,
          ...categoryAndDescendants.filter((id) => !exportOptions.selectedCategories.includes(id)),
        ]
      : exportOptions.selectedCategories.filter((id) => !categoryAndDescendants.includes(id));

    setExportOptions((prev) => ({
      ...prev,
      selectedCategories: newSelection,
    }));
  };

  // Si le chargement est en cours
  if (loadingCategories) {
    return (
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
        <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Sélection des catégories (avec stock uniquement)
        </h5>
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          Chargement des catégories...
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
      <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
        Sélection des catégories (avec stock uniquement)
      </h5>

      {/* Boutons d'action */}
      <TreeActionButtons
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onExpandAll={expandAllCategories}
        onCollapseAll={collapseAllCategories}
        selectedCount={exportOptions.selectedCategories.length}
        expandedCount={expandedCategories.size}
      />

      {/* Zone d'arbre redimensionnable */}
      <div className="relative">
        <div
          className="overflow-y-auto border border-blue-200 dark:border-blue-700 rounded bg-white dark:bg-gray-800 p-3"
          style={{
            height: `${categorySelectorHeight}px`,
            minHeight: '200px',
            maxHeight: '500px',
          }}
        >
          {categoryTree.length > 0 ? (
            categoryTree.map((category) => (
              <CategoryTreeNode
                key={category._id}
                category={category}
                level={0}
                isExpanded={expandedCategories.has(category._id)}
                isSelected={exportOptions.selectedCategories.includes(category._id)}
                onToggleExpansion={toggleCategoryExpansion}
                onToggleSelection={handleCategoryToggle}
                collectAllCategoryIds={collectAllCategoryIds}
                selectedCategories={exportOptions.selectedCategories} // 🔥 CORRECTION : Passer la liste complète
              />
            ))
          ) : (
            <div className="text-xs text-gray-500 italic p-2">
              Aucune catégorie avec stock disponible
            </div>
          )}
        </div>

        {/* Poignée de redimensionnement */}
        <ResizeHandle onResizeStart={handleResizeStart} isResizing={isResizing} />
      </div>

      {/* Légende des badges */}
      <BadgeLegend />

      {/* Message si aucune catégorie */}
      {categoryTree.length === 0 && !loadingCategories && (
        <div className="text-xs text-orange-600 italic mt-2">
          Aucune catégorie ne contient de produits en stock
        </div>
      )}

      {/* Options supplémentaires */}
      <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-700">
        <div className="space-y-2">
          {/* Option inclure produits sans catégorie */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportOptions.includeUncategorized}
              onChange={(e) =>
                setExportOptions((prev) => ({
                  ...prev,
                  includeUncategorized: e.target.checked,
                }))
              }
              className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              Inclure les produits sans catégorie
            </span>
          </label>

          {/* Option : Rapport simplifié */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportOptions.isSimplified || false}
              onChange={(e) =>
                setExportOptions((prev) => ({
                  ...prev,
                  isSimplified: e.target.checked,
                }))
              }
              className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              Rapport simplifié avec TVA
            </span>
          </label>
          <div className="text-xs text-gray-500 italic mt-1">
            Affiche uniquement les totaux par catégorie racine (sans le détail des produits)
          </div>
        </div>
      </div>

      {/* Aperçu de la sélection */}
      {exportOptions.selectedCategories.length > 0 && (
        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
          <div className="text-xs text-green-800 dark:text-green-200">
            <div className="mb-1">
              <strong>{exportOptions.selectedCategories.length}</strong> catégorie(s)
              sélectionnée(s)
            </div>
            <div className="text-xs">
              Total estimé:{' '}
              <strong>{getSelectedProductsCount(exportOptions.selectedCategories)} produits</strong>{' '}
              en stock
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryTreeSelector;
