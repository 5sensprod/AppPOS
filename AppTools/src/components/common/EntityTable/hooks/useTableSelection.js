// src/components/common/EntityTable/hooks/useTableSelection.js
import { useState, useEffect, useRef } from 'react';
import { useSelectionStore } from '../../../../stores/selectionStore';

export const useTableSelection = (data, filteredData, options = {}) => {
  const {
    persist = false, // Par défaut false pour compatibilité avec l'existant
    entityName = 'default',
    pageKey = 'default',
  } = options;

  // ✅ GARDE - États locaux pour mode non-persistant
  const [localSelectedItems, setLocalSelectedItems] = useState([]);
  const previousDataLength = useRef(data.length);
  const lastActionTime = useRef(0);

  // ✅ NOUVEAU - Store Zustand pour mode persistant
  const {
    getSelection,
    setSelection,
    toggleSelection: toggleInStore,
    clearSelection,
  } = useSelectionStore();

  // ✅ HYBRIDE - Sélection actuelle selon le mode
  const selectedItems = persist ? getSelection(entityName, pageKey) : localSelectedItems;

  const setSelectedItems = persist
    ? (newItems) => {
        const itemsArray = typeof newItems === 'function' ? newItems(selectedItems) : newItems;
        setSelection(entityName, pageKey, itemsArray);
      }
    : setLocalSelectedItems;

  // ✅ GARDE - Logique existante de réinitialisation/nettoyage
  useEffect(() => {
    const currentTime = Date.now();
    const timeSinceLastAction = currentTime - lastActionTime.current;

    // Si c'est une mise à jour récente (moins de 2 secondes), ne pas réinitialiser
    if (timeSinceLastAction < 2000) {
      previousDataLength.current = data.length;

      // ✅ GARDE - Vérifier que les items sélectionnés existent encore
      const validIds = data.map((item) => item._id);
      setSelectedItems((prev) => {
        const stillValid = prev.filter((id) => validIds.includes(id));
        return stillValid;
      });
      return;
    }

    // ✅ GARDE - Si le nombre d'items a changé significativement, réinitialiser
    const dataLengthChanged = Math.abs(data.length - previousDataLength.current) > 0;
    if (dataLengthChanged) {
      setSelectedItems([]);
    }

    previousDataLength.current = data.length;
  }, [data]); // ✅ NOTE: setSelectedItems est stable dans les deux modes

  // ✅ GARDE - Fonction toggleSelection avec votre logique
  const toggleSelection = (id, isSelected) => {
    lastActionTime.current = Date.now(); // Marquer l'heure de l'action

    if (persist) {
      // ✅ NOUVEAU - Mode persistant avec store
      if (isSelected === undefined) {
        // Auto-toggle
        toggleInStore(entityName, pageKey, id);
      } else {
        // Valeur explicite
        const currentSelection = getSelection(entityName, pageKey);
        const newSelection = isSelected
          ? [...currentSelection, id]
          : currentSelection.filter((itemId) => itemId !== id);
        setSelection(entityName, pageKey, newSelection);
      }
    } else {
      // ✅ GARDE - Mode local existant
      if (isSelected === undefined) {
        setLocalSelectedItems((prev) =>
          prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
        );
      } else {
        setLocalSelectedItems((prev) =>
          isSelected ? [...prev, id] : prev.filter((itemId) => itemId !== id)
        );
      }
    }
  };

  // ✅ GARDE - Fonction selectAll avec votre logique
  const selectAll = (isSelected) => {
    lastActionTime.current = Date.now(); // Marquer l'heure de l'action

    if (isSelected) {
      // ✅ GARDE - Utiliser les données filtrées ou toutes les données si filteredData est null
      const idsToSelect = (filteredData || data).map((item) => item._id);
      setSelectedItems(idsToSelect);
    } else {
      setSelectedItems([]);
    }
  };

  // ✅ GARDE - Fonction pour marquer qu'une action batch vient d'être effectuée
  const markBatchActionPerformed = () => {
    lastActionTime.current = Date.now();
  };

  // ✅ NOUVEAU - Fonction pour préserver la sélection (compatibilité)
  const preserveSelectionOnNextDataChange = () => {
    lastActionTime.current = Date.now();
  };

  // ✅ NOUVEAU - Informations dérivées pour compatibilité avec EntityTable
  const allSelected =
    filteredData && filteredData.length > 0
      ? filteredData.every((item) => selectedItems.includes(item._id))
      : false;

  const someSelected =
    selectedItems.length > 0 &&
    filteredData &&
    filteredData.some((item) => selectedItems.includes(item._id)) &&
    !allSelected;

  return {
    selectedItems,
    setSelectedItems,
    toggleSelection,
    selectAll,
    markBatchActionPerformed,
    preserveSelectionOnNextDataChange, // ✅ NOUVEAU - Pour compatibilité EntityTable

    // ✅ NOUVEAU - Informations utiles
    allSelected,
    someSelected,
    selectionCount: selectedItems.length,
    hasSelection: selectedItems.length > 0,

    // ✅ NOUVEAU - Actions supplémentaires pour mode persistant
    ...(persist && {
      clearSelection: () => clearSelection(entityName, pageKey),
      isSelected: (id) => selectedItems.includes(id),
    }),
  };
};
