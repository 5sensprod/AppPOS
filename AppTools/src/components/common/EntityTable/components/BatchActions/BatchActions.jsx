import React, { useState, useEffect } from 'react';
import { useCategoryUtils } from '../../../../../hooks/useCategoryUtils';
import { createActionsConfig } from './config/batchActionsConfig';
import ActionButton from './components/ActionButton';

export const BatchActions = ({
  selectedItems = [],
  entityName = '',
  entityNamePlural = '',
  batchActions = ['status', 'stock', 'category', 'delete', 'sync', 'export', 'createSheet'],
  onBatchDelete,
  onBatchSync,
  onBatchExport,
  onBatchStatusChange,
  onBatchCategoryChange,
  onBatchStockChange,
  onCreateSheet,
  categoryOptions = [],
  syncStats,
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const {
    hierarchicalCategories,
    categoriesLoading,
    fetchHierarchicalCategories,
    isReady: categoriesReady,
  } = useCategoryUtils();

  useEffect(() => {
    if (
      batchActions.includes('category') &&
      !categoriesLoading &&
      hierarchicalCategories.length === 0
    ) {
      fetchHierarchicalCategories();
    }
  }, [batchActions, categoriesLoading, hierarchicalCategories.length, fetchHierarchicalCategories]);

  useEffect(() => {
    if (selectedItems.length > 0) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [selectedItems.length]);

  const selectedCount = selectedItems.length;
  const itemLabel = selectedCount === 1 ? entityName : entityNamePlural;

  const callbacks = {
    selectedItems,
    onBatchDelete,
    onBatchSync,
    onBatchExport,
    onBatchStatusChange,
    onBatchCategoryChange,
    onBatchStockChange,
    onCreateSheet,
    setOpenDropdown,
  };

  const actionsConfig = createActionsConfig(callbacks, hierarchicalCategories, syncStats);

  const availableBatchActions = batchActions.filter((action) => {
    const cfg = actionsConfig[action];
    return cfg?.available;
  });

  return (
    <div
      className={`bg-white dark:bg-gray-800 flex flex-col sm:flex-row justify-between items-center border-b border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-in-out overflow-hidden z-30 ${
        isVisible ? 'opacity-100 max-h-24 p-4' : 'opacity-0 max-h-0 p-0 border-b-0'
      }`}
    >
      <div className="text-gray-700 dark:text-gray-300 mb-2 sm:mb-0">
        <span className="font-semibold">{selectedCount}</span> {itemLabel}
      </div>

      <div className="flex space-x-2">
        {availableBatchActions.map((action) => {
          const cfg = actionsConfig[action];
          if (!cfg) return null;

          return (
            <ActionButton
              key={action}
              action={action}
              cfg={cfg}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              hierarchicalData={hierarchicalCategories}
              syncStats={syncStats}
            />
          );
        })}
      </div>
    </div>
  );
};

export default BatchActions;
