import { useState, useEffect, useCallback } from 'react';

/**
 * Hook pour gérer l'expansion et la sélection des catégories dans une vue hiérarchique
 * @param {Object} options Options de configuration
 * @param {Array} options.hierarchicalCategories Liste hiérarchique des catégories
 * @param {Object} options.tablePreferences Préférences de la table
 * @param {Function} options.handlePreferencesChange Fonction pour mettre à jour les préférences
 * @returns {Object} Fonctions et états pour gérer l'expansion
 */
export const useCategoryExpansion = ({
  hierarchicalCategories,
  tablePreferences,
  handlePreferencesChange,
}) => {
  // États pour l'expansion des catégories
  const [expandedCategories, setExpandedCategories] = useState({});
  // Référence pour suivre si une mise à jour est en cours
  const [isUpdating, setIsUpdating] = useState(false);
  // Référence pour suivre si l'initialisation a été faite
  const [initialized, setInitialized] = useState(false);

  // Fonction pour trouver le chemin vers un élément
  const findParentPath = useCallback((categories, targetId, currentPath = []) => {
    if (!categories || !targetId) return null;

    for (const cat of categories || []) {
      if (cat._id === targetId) {
        return [...currentPath, cat._id];
      }

      if (cat.children && cat.children.length > 0) {
        const found = findParentPath(cat.children, targetId, [...currentPath, cat._id]);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Fonction pour développer/replier une catégorie
  const toggleCategory = useCallback(
    (categoryId, event) => {
      if (event) {
        event.stopPropagation();
      }

      // Ne pas traiter si une mise à jour est déjà en cours
      if (isUpdating) return;

      setIsUpdating(true);

      // Capturer la position de défilement actuelle
      const currentScrollPosition = window.scrollY;

      // Mettre à jour l'état local
      const newExpandedState = {
        ...expandedCategories,
        [categoryId]: !expandedCategories[categoryId],
      };

      setExpandedCategories(newExpandedState);

      // Mise à jour synchronisée des préférences
      // Enregistrer dans selection ET expandedCategories pour assurer la compatibilité
      handlePreferencesChange('selection', {
        ...tablePreferences.selection,
        expandedCategories: newExpandedState,
        scrollPosition: currentScrollPosition,
      });

      // Mettre également à jour dans detail pour la compatibilité avec le composant de détail
      handlePreferencesChange('detail', {
        ...tablePreferences.detail,
        expandedCategories: newExpandedState,
        scrollPosition: currentScrollPosition,
      });

      // Réinitialiser le flag de mise à jour après un court délai
      setTimeout(() => {
        setIsUpdating(false);

        // Restaurer la position de défilement après l'expansion/réduction sans animation
        window.scrollTo(0, currentScrollPosition);
      }, 100);
    },
    [
      expandedCategories,
      tablePreferences.selection,
      tablePreferences.detail,
      handlePreferencesChange,
      isUpdating,
    ]
  );

  // Gestion de la sélection de ligne
  const handleRowClick = useCallback(
    (rowData) => {
      if (rowData && rowData._id && !isUpdating) {
        // Éviter de mettre à jour si c'est déjà l'élément focalisé
        if (tablePreferences.selection?.focusedItemId === rowData._id) {
          return;
        }
        setIsUpdating(true);
        // Mettre à jour l'élément focalisé dans les préférences (section selection)
        // handlePreferencesChange gérera la sauvegarde de la position de défilement
        handlePreferencesChange('selection', {
          ...tablePreferences.selection,
          focusedItemId: rowData._id,
        });
        // Trouver le chemin vers l'élément cible
        const parentPath = findParentPath(hierarchicalCategories, rowData._id);
        if (parentPath && parentPath.length > 0) {
          const newExpandedState = {};
          parentPath.forEach((id) => {
            newExpandedState[id] = true;
          });
          setExpandedCategories(newExpandedState);
          // Mettre à jour uniquement selection avec le nouvel état d'expansion
          handlePreferencesChange('selection', {
            ...tablePreferences.selection,
            expandedCategories: newExpandedState,
            focusedItemId: rowData._id,
          });
        }
        // Réinitialiser le flag après un court délai
        setTimeout(() => {
          setIsUpdating(false);
        }, 100);
      }
    },
    [
      handlePreferencesChange,
      tablePreferences.selection,
      findParentPath,
      hierarchicalCategories,
      isUpdating,
    ]
  );

  // Initialisation: déplier les parents si un élément est focalisé, sans gérer le défilement
  useEffect(() => {
    if (hierarchicalCategories.length > 0 && !initialized && !isUpdating) {
      setInitialized(true);

      // Récupérer toutes les préférences potentiellement utiles
      const focusedItemId =
        tablePreferences.selection?.focusedItemId ||
        tablePreferences.detail?.focusedItemId ||
        tablePreferences.detail?.lastFocusedElementId;

      // Récupérer les états d'expansion sauvegardés (chercher dans les deux emplacements)
      const savedExpandedState =
        tablePreferences.selection?.expandedCategories ||
        tablePreferences.detail?.expandedCategories ||
        {};

      // Mettre d'abord à jour l'état local avec les catégories développées sauvegardées
      setExpandedCategories(savedExpandedState);

      // Si un élément est focalisé, s'assurer que ses parents sont développés
      if (focusedItemId) {
        const parentPath = findParentPath(hierarchicalCategories, focusedItemId);

        if (parentPath && parentPath.length > 0) {
          // Créer un nouvel état qui préserve les expansions existantes et ajoute les nouvelles
          const newExpandedState = { ...savedExpandedState };

          parentPath.forEach((id) => {
            newExpandedState[id] = true;
          });

          setExpandedCategories(newExpandedState);

          // Synchroniser avec les préférences pour maintenir la cohérence
          if (Object.keys(newExpandedState).length !== Object.keys(savedExpandedState).length) {
            handlePreferencesChange('selection', {
              ...tablePreferences.selection,
              expandedCategories: newExpandedState,
            });

            handlePreferencesChange('detail', {
              ...tablePreferences.detail,
              expandedCategories: newExpandedState,
            });
          }
        }
      }

      // Note: La restauration du défilement est gérée par useScrollRestoration
    }
  }, [
    hierarchicalCategories,
    tablePreferences.selection,
    tablePreferences.detail,
    findParentPath,
    initialized,
    isUpdating,
    handlePreferencesChange,
  ]);

  return {
    expandedCategories,
    toggleCategory,
    handleRowClick,
    isUpdating,
    findParentPath,
  };
};
