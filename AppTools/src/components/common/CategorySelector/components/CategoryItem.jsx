// AppTools/src/components/common/CategorySelector/components/CategoryItem.jsx
import React from 'react';
import { Plus, X, Star } from 'lucide-react';
import { SelectOption } from '../../../atoms/Select';

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
  displayName = null,
}) => {
  const handleClick = () => onSelect(item._id);

  // Construire les actions pour le mode multiple
  const rightActions =
    mode === 'multiple' ? (
      <div className="flex items-center space-x-2">
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
      </div>
    ) : null;

  return (
    <SelectOption
      isSelected={isSelected}
      isExpanded={isExpanded}
      hasChildren={hasChildren}
      level={level}
      onClick={handleClick}
      onExpand={onToggleExpand}
      rightIcon={rightActions}
      showCounter={showCounts && hasChildren}
      counterValue={childCount}
    >
      {displayName || item.name}
    </SelectOption>
  );
};

export default CategoryItem;
