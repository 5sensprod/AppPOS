//AppTools\src\components\common\CategorySelector\components\CategoryItem.jsx
import React from 'react';
import { ChevronRight, ChevronDown, Check, Plus, X, Star } from 'lucide-react';

const CategoryItem = ({
  item,
  level = 0,
  isSelected = false,
  isPrimary = false,
  hasChildren = false,
  isExpanded = false,
  childCount = 0,
  showCounts = true,
  mode = 'single', // 'single' | 'multiple'
  onSelect,
  onToggleExpand,
  onSetPrimary,
  displayName = null, // Pour les résultats de recherche avec chemin complet
}) => {
  const handleClick = () => {
    if (mode === 'single') {
      onSelect(item._id);
    } else {
      onSelect(item._id); // Toggle en mode multiple
    }
  };

  return (
    <div
      className={`flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      style={{ paddingLeft: `${12 + level * 20}px` }}
      onClick={handleClick}
    >
      {/* Bouton expand/collapse */}
      {hasChildren ? (
        <button
          type="button"
          className="p-1 mr-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none"
          onClick={onToggleExpand}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>
      ) : (
        <div className="w-7" />
      )}

      {/* Nom de la catégorie */}
      <span className="flex-grow text-sm truncate">{displayName || item.name}</span>

      {/* Compteur d'enfants */}
      {hasChildren && showCounts && (
        <span className="text-xs text-gray-500 ml-2">({childCount})</span>
      )}

      {/* Actions selon le mode */}
      <div className="flex items-center space-x-2">
        {mode === 'single' && isSelected && (
          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        )}

        {mode === 'multiple' && (
          <>
            {/* Badge principale */}
            {isPrimary && (
              <Star className="h-4 w-4 text-yellow-500 fill-current" title="Catégorie principale" />
            )}

            {/* Bouton "Définir comme principale" */}
            {isSelected && !isPrimary && onSetPrimary && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetPrimary(item._id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 hover:text-yellow-600 px-2 py-1 rounded bg-gray-100 dark:bg-gray-600"
                title="Définir comme principale"
              >
                ★
              </button>
            )}

            {/* Bouton Add/Remove */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item._id);
              }}
              className={`p-1 rounded-full transition-colors ${
                isSelected
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-800 dark:text-red-200'
                  : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-800 dark:text-green-200'
              }`}
              title={isSelected ? 'Retirer' : 'Ajouter'}
            >
              {isSelected ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CategoryItem;
