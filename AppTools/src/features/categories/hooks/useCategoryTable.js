import { useEffect } from 'react';
import {
  useCategory,
  useCategoryExtras,
  useCategoryTablePreferences,
} from '../stores/categoryStore';
import { useCategoryHierarchyStore } from '../stores/categoryHierarchyStore';
import { useEntityTableWithPreferences } from '@/hooks/useEntityTableWithPreferences';
import { useCategoryExpansion } from './useCategoryExpansion';
import { useCategoryHierarchyData } from './useCategoryHierarchyData';

/**
 * Hook principal pour la gestion de la table des catégories
 * @returns {Object} Propriétés et fonctions pour le composant CategoriesTable
 */
export const useCategoryTable = () => {
  const { deleteCategory } = useCategory();
  const { syncCategory } = useCategoryExtras();
  const categoryHierarchyStore = useCategoryHierarchyStore();

  // Utiliser le hook personnalisé pour la gestion des préférences
  const {
    entities: hierarchicalCategories,
    tablePreferences,
    isLoading,
    error,
    handleDeleteEntity,
    handleSyncEntity,
    handlePreferencesChange,
    handleResetFilters,
  } = useEntityTableWithPreferences({
    entityType: 'category',
    entityStore: {
      data: categoryHierarchyStore.hierarchicalCategories,
      loading: categoryHierarchyStore.loading,
      fetchEntities: categoryHierarchyStore.fetchHierarchicalCategories,
      initWebSocket: categoryHierarchyStore.initWebSocket,
    },
    preferencesStore: useCategoryTablePreferences(),
    deleteEntityFn: async (id) => await deleteCategory(id),
    syncEntityFn: async (id) => await syncCategory(id),
  });

  // Utiliser le hook d'expansion des catégories
  const { expandedCategories, toggleCategory, handleRowClick, isUpdating, findParentPath } =
    useCategoryExpansion({
      hierarchicalCategories,
      tablePreferences,
      handlePreferencesChange,
    });

  // Utiliser le hook de traitement des données hiérarchiques
  const { processedData, flattenHierarchy, searchProcessor, sortProcessor } =
    useCategoryHierarchyData({
      hierarchicalCategories,
      expandedCategories,
      toggleCategory,
      tablePreferences,
    });

  useEffect(() => {
    handlePreferencesChange('sort', { field: 'name', direction: 'asc' });
  }, []);

  return {
    // Données et état
    hierarchicalCategories,
    processedData,
    isLoading,
    error,
    tablePreferences,

    // Gestionnaires d'actions
    handleDeleteEntity,
    handleSyncEntity,
    handlePreferencesChange,
    handleResetFilters,
    handleRowClick,

    // Fonctions de traitement des données
    searchProcessor,
    sortProcessor,

    // Propriétés supplémentaires
    isUpdating,
  };
};
