// src/components/common/CategorySelector/CategorySelector.jsx
import React from 'react';
import { useCategoryUtils } from '../../hooks/useCategoryUtils';
import SingleCategorySelector from './SingleCategorySelector';
import MultipleCategorySelector from './MultipleCategorySelector';

const CategorySelector = ({
  // Mode de fonctionnement
  mode = 'single', // 'single' | 'multiple'

  // Props pour mode single
  value = '', // string pour single
  onChange, // (value: string) => void pour single

  // Props pour mode multiple
  selectedCategories = [], // string[] pour multiple
  primaryCategoryId = '', // string pour multiple
  onMultipleChange, // ({ categories: string[], primaryId: string }) => void pour multiple

  // Configuration commune
  disabled = false,
  placeholder,
  currentCategoryId = null, // Pour exclure la catégorie actuelle et ses descendants

  // Style et comportement
  showSearch = true,
  showCounts = true,
  allowRootSelection = true, // Permet de sélectionner "Aucune" en mode single
  autoFocusOpen = false,
  variant = 'default', // ⚡ NOUVEAU: 'default' | 'compact' | 'portal'
  theme = 'default',
}) => {
  const { isReady, categoriesLoading } = useCategoryUtils();

  // Affichage de chargement
  if (categoriesLoading || !isReady) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Chargement des catégories...
        </div>
      </div>
    );
  }

  // Props communes à passer aux sous-composants
  const commonProps = {
    disabled,
    placeholder,
    currentCategoryId,
    showSearch,
    showCounts,
    allowRootSelection,
    autoFocusOpen,
    variant,
    theme,
  };

  // Rendu conditionnel selon le mode
  if (mode === 'single') {
    return <SingleCategorySelector value={value} onChange={onChange} {...commonProps} />;
  }

  if (mode === 'multiple') {
    return (
      <MultipleCategorySelector
        selectedCategories={selectedCategories}
        primaryCategoryId={primaryCategoryId}
        onMultipleChange={onMultipleChange}
        {...commonProps}
      />
    );
  }

  console.error(`Mode "${mode}" non supporté. Utilisez 'single' ou 'multiple'.`);
  return <div className="text-red-500">Mode de sélection invalide</div>;
};

export default CategorySelector;
