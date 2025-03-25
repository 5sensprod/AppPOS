// src/components/common/EntityTable/hooks/useTableSelection.js
import { useState, useEffect } from 'react';

export const useTableSelection = (data, filteredData) => {
  const [selectedItems, setSelectedItems] = useState([]);

  // Réinitialiser la sélection lors du changement des données
  useEffect(() => {
    setSelectedItems([]);
  }, [data]);

  const toggleSelection = (id, isSelected) => {
    // Si isSelected n'est pas défini, inverser l'état actuel
    if (isSelected === undefined) {
      setSelectedItems((prev) =>
        prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
      );
    } else {
      // Sinon utiliser la valeur fournie
      setSelectedItems((prev) =>
        isSelected ? [...prev, id] : prev.filter((itemId) => itemId !== id)
      );
    }
  };

  const selectAll = (isSelected) => {
    if (isSelected) {
      // Utiliser les données filtrées ou toutes les données si filteredData est null
      const idsToSelect = (filteredData || data).map((item) => item._id);
      setSelectedItems(idsToSelect);
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
