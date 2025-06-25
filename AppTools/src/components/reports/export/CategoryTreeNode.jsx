// src/components/reports/export/CategoryTreeNode.jsx

import React from 'react';

/**
 * Composant pour un nœud individuel de l'arbre de catégories
 */
const CategoryTreeNode = ({
  category,
  level = 0,
  isExpanded,
  isSelected,
  onToggleExpansion,
  onToggleSelection,
  collectAllCategoryIds,
}) => {
  const hasChildren = category.children && category.children.length > 0;

  /**
   * Gère la sélection/désélection de la catégorie
   */
  const handleToggleSelection = (e) => {
    const isChecking = e.target.checked;

    // Collecter tous les IDs (catégorie + descendants)
    const categoryAndDescendants = [category._id];
    if (hasChildren) {
      categoryAndDescendants.push(...collectAllCategoryIds(category.children));
    }

    onToggleSelection(category._id, isChecking, categoryAndDescendants);
  };

  /**
   * Gère l'expansion/réduction de la catégorie
   */
  const handleToggleExpansion = () => {
    if (hasChildren) {
      onToggleExpansion(category._id);
    }
  };

  return (
    <div className="select-none">
      {/* Ligne principale de la catégorie */}
      <div
        className="flex items-center gap-2 py-1 px-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
        style={{ marginLeft: level * 16 }}
      >
        {/* Bouton d'expansion */}
        {hasChildren ? (
          <button
            type="button"
            onClick={handleToggleExpansion}
            className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            aria-label={isExpanded ? 'Réduire' : 'Développer'}
          >
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleToggleSelection}
          className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          aria-label={`Sélectionner ${category.name}`}
        />

        {/* Nom et badges */}
        <label className="flex items-center gap-2 cursor-pointer flex-1 text-sm">
          <span className={`text-gray-700 dark:text-gray-300 ${hasChildren ? 'font-medium' : ''}`}>
            {category.name}
          </span>

          {/* Badge: Produits directs */}
          {category.productsInStockCount > 0 && (
            <span
              className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium"
              title={`${category.productsInStockCount} produits dans cette catégorie`}
            >
              {category.productsInStockCount}
            </span>
          )}

          {/* Badge: Produits des sous-catégories */}
          {category.totalProductsInStock > category.productsInStockCount && (
            <span
              className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium"
              title={`${category.totalProductsInStock - category.productsInStockCount} produits dans les sous-catégories`}
            >
              +{category.totalProductsInStock - category.productsInStockCount}
            </span>
          )}
        </label>
      </div>

      {/* Enfants (affichés seulement si développé) */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {category.children.map((child) => (
            <CategoryTreeNode
              key={child._id}
              category={child}
              level={level + 1}
              isExpanded={isExpanded}
              isSelected={isSelected}
              onToggleExpansion={onToggleExpansion}
              onToggleSelection={onToggleSelection}
              collectAllCategoryIds={collectAllCategoryIds}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryTreeNode;
