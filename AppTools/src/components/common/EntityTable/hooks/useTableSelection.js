// src/components/common/EntityTable/hooks/useTableSelection.js
import { useState, useEffect } from 'react';

export const useTableSelection = (data) => {
  const [selectedItems, setSelectedItems] = useState([]);

  // Réinitialiser la sélection lors du changement des données
  useEffect(() => {
    setSelectedItems([]);
  }, [data]);

  const toggleSelection = (id, isSelected) => {
    setSelectedItems((prev) =>
      isSelected ? [...prev, id] : prev.filter((itemId) => itemId !== id)
    );
  };

  const selectAll = (isSelected) => {
    if (isSelected) {
      setSelectedItems(data.map((item) => item._id));
    } else {
      setSelectedItems([]);
    }
  };

  return {
    selectedItems,
    setSelectedItems,
    toggleSelection,
    selectAll,
  };
};
