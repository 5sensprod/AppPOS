// src/components/common/fields/CategorySelectField/components/CategoryTree.jsx
import React from 'react';
import { ChevronRight, ChevronDown, Check } from 'lucide-react';

const CategoryTree = ({
  items,
  expandedItems,
  onToggleExpand,
  selectedValue,
  onSelect,
  level = 0,
}) => {
  return (
    <>
      {items.map((item) => {
        const hasChildren = item.children?.length > 0;
        const isExpanded = expandedItems[item._id];
        const isSelected = selectedValue === item._id;

        return (
          <div key={item._id}>
            <div
              className={`flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              style={{ paddingLeft: `${12 + level * 20}px` }}
              onClick={() => onSelect(item._id)}
            >
              {hasChildren ? (
                <button
                  type="button"
                  className="p-1 mr-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none transition-colors"
                  onClick={(e) => onToggleExpand(item._id, e)}
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

              <span className="flex-grow text-sm text-gray-900 dark:text-gray-100 truncate">
                {item.name}
              </span>

              {hasChildren && (
                <span className="text-xs text-gray-500 ml-2">({item.children.length})</span>
              )}

              {isSelected && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2" />}
            </div>

            {hasChildren && isExpanded && (
              <CategoryTree
                items={item.children}
                expandedItems={expandedItems}
                onToggleExpand={onToggleExpand}
                selectedValue={selectedValue}
                onSelect={onSelect}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </>
  );
};

export default CategoryTree;
