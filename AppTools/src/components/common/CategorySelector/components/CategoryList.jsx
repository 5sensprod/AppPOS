//AppTools\src\components\common\CategorySelector\components\CategoryList.jsx
import React from 'react';
import CategoryItem from './CategoryItem';

const CategoryList = ({
  items,
  mode,
  selectedValue, // string pour single
  selectedValues = [], // array pour multiple
  primaryId = '',
  searchTerm,
  expandedItems,
  showCounts,
  onSelect,
  onToggleExpand,
  onSetPrimary,
}) => {
  const renderItems = (items, level = 0) => {
    return items.map((item) => {
      const hasChildren = item.children?.length > 0;
      const isExpanded = expandedItems[item._id];
      const childCount = hasChildren ? item.children.length : 0;

      // État selon le mode
      const isSelected =
        mode === 'single' ? selectedValue === item._id : selectedValues.includes(item._id);
      const isPrimary = mode === 'multiple' && item._id === primaryId;

      return (
        <div key={item._id}>
          <CategoryItem
            item={item}
            level={level}
            isSelected={isSelected}
            isPrimary={isPrimary}
            hasChildren={hasChildren}
            isExpanded={isExpanded}
            childCount={childCount}
            showCounts={showCounts}
            mode={mode}
            onSelect={onSelect}
            onToggleExpand={(e) => onToggleExpand(item._id, e)}
            onSetPrimary={onSetPrimary}
            displayName={searchTerm ? item._fullPath : null}
          />

          {/* Enfants */}
          {hasChildren && isExpanded && renderItems(item.children, level + 1)}
        </div>
      );
    });
  };

  const renderSearchResults = () => {
    if (!Array.isArray(items)) return null;

    return items.map((item) => {
      const isSelected =
        mode === 'single' ? selectedValue === item._id : selectedValues.includes(item._id);
      const isPrimary = mode === 'multiple' && item._id === primaryId;
      const level = item._level || 0;

      return (
        <CategoryItem
          key={item._id}
          item={item}
          level={level}
          isSelected={isSelected}
          isPrimary={isPrimary}
          hasChildren={false}
          isExpanded={false}
          childCount={0}
          showCounts={showCounts}
          mode={mode}
          onSelect={onSelect}
          onToggleExpand={() => {}}
          onSetPrimary={onSetPrimary}
          displayName={item._fullPath || item.name}
        />
      );
    });
  };

  // Gestion du contenu vide
  if (!items || items.length === 0) {
    return (
      <div className="p-3 text-center text-gray-500 dark:text-gray-400">
        {searchTerm ? 'Aucune catégorie trouvée' : 'Aucune catégorie disponible'}
      </div>
    );
  }

  return searchTerm ? renderSearchResults() : renderItems(items);
};

export default CategoryList;
