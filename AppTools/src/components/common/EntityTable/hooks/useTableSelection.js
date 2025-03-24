// src/components/common/EntityTable/hooks/useTableSelection.js
import { useState, useEffect } from 'react';

export const useTableSelection = (data, filteredData, initialSelectedItems = []) => {
  const [selectedItems, setSelectedItems] = useState(initialSelectedItems);

  // Réinitialiser la sélection lors du changement des données
  // sauf si on a des éléments présélectionnés via les préférences
  useEffect(() => {
    // Vérifier si les éléments sélectionnés existent toujours dans les données
    if (selectedItems.length > 0) {
      const ids = data.map((item) => item._id);
      const validSelectedItems = selectedItems.filter((id) => ids.includes(id));

      // Si les éléments sélectionnés ont changé, mettre à jour
      if (validSelectedItems.length !== selectedItems.length) {
        setSelectedItems(validSelectedItems);
      }
    }
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
