// src/components/common/EntityTable/hooks/useTableSelection.js
import { useState, useEffect, useRef } from 'react';

export const useTableSelection = (data, filteredData) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const previousDataLength = useRef(data.length);
  const lastActionTime = useRef(0);

  // Réinitialiser la sélection seulement si :
  // 1. Le nombre d'éléments a changé de manière significative (ajout/suppression)
  // 2. Et qu'il ne s'agit pas d'une mise à jour récente (< 1 seconde)
  useEffect(() => {
    const currentTime = Date.now();
    const timeSinceLastAction = currentTime - lastActionTime.current;

    // Si c'est une mise à jour récente (moins de 2 secondes), ne pas réinitialiser
    if (timeSinceLastAction < 2000) {
      previousDataLength.current = data.length;

      // Vérifier que les items sélectionnés existent encore
      const validIds = data.map((item) => item._id);
      setSelectedItems((prev) => {
        const stillValid = prev.filter((id) => validIds.includes(id));
        return stillValid;
      });
      return;
    }

    // Si le nombre d'items a changé significativement, réinitialiser
    const dataLengthChanged = Math.abs(data.length - previousDataLength.current) > 0;
    if (dataLengthChanged) {
      setSelectedItems([]);
    }

    previousDataLength.current = data.length;
  }, [data]);

  const toggleSelection = (id, isSelected) => {
    lastActionTime.current = Date.now(); // Marquer l'heure de l'action

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
    lastActionTime.current = Date.now(); // Marquer l'heure de l'action

    if (isSelected) {
      // Utiliser les données filtrées ou toutes les données si filteredData est null
      const idsToSelect = (filteredData || data).map((item) => item._id);
      setSelectedItems(idsToSelect);
    } else {
      setSelectedItems([]);
    }
  };

  // Fonction pour marquer qu'une action batch vient d'être effectuée
  const markBatchActionPerformed = () => {
    lastActionTime.current = Date.now();
  };

  return {
    selectedItems,
    setSelectedItems,
    toggleSelection,
    selectAll,
    markBatchActionPerformed,
  };
};
