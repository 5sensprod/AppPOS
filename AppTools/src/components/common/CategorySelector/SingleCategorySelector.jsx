// AppTools/src/components/common/CategorySelector/SingleCategorySelector.jsx
import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { SelectField } from '../../atoms/Select';
import { useCategorySelector } from './hooks/useCategorySelector';
import { CategoryDropdown, CategoryList } from './components';
import { getThemedClasses } from '../../atoms/Select/selectStyles'; // ⚡ AJOUT

const SingleCategorySelector = ({
  value = '',
  onChange,
  disabled = false,
  placeholder,
  currentCategoryId = null,
  showSearch = true,
  showCounts = true,
  allowRootSelection = true,
  autoFocusOpen = false,
  variant = 'default',
  theme = 'default',
}) => {
  const {
    isOpen,
    setIsOpen,
    searchTerm,
    setSearchTerm,
    expandedItems,
    setExpandedItems,
    containerRef,
    filteredData,
    searchResults,
    toggleExpand,
    getCategoryPath,
  } = useCategorySelector({
    currentCategoryId,
    autoFocusOpen,
    disabled,
  });

  // Label sélectionné
  const selectedLabel = useMemo(() => {
    if (!value) return '';
    // ✅ NOUVEAU - Gestion spéciale pour "Sans catégorie"
    if (value === 'no_category') return 'Sans catégorie';
    return getCategoryPath(value) || 'Catégorie inconnue';
  }, [value, getCategoryPath]);

  const defaultPlaceholder = placeholder || 'Sélectionner une catégorie';

  // ⚡ NOUVEAU: Classe pour le conteneur dropdown selon le thème
  const portalDropdownClassName = useMemo(() => {
    if (theme === 'default') {
      return 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80';
    }

    const themedClasses = getThemedClasses(theme);
    return `${themedClasses.dropdownContainer} max-h-80`;
  }, [theme]);

  // Expansion automatique vers la valeur sélectionnée
  React.useEffect(() => {
    if (!value || value === 'no_category') return;

    const expandPathToValue = (items) => {
      for (const item of items) {
        if (item._id === value) {
          return true;
        }
        if (item.children?.length > 0) {
          const foundInChildren = expandPathToValue(item.children);
          if (foundInChildren) {
            setExpandedItems((prev) => ({ ...prev, [item._id]: true }));
            return true;
          }
        }
      }
      return false;
    };

    expandPathToValue(filteredData);
  }, [value, filteredData, setExpandedItems]);

  // Gestionnaires
  const handleSelect = (categoryId) => {
    onChange(categoryId);
    setIsOpen(false);
  };

  const handleFieldClick = () => {
    if (!disabled) setIsOpen(!isOpen);
  };

  const displayData = searchTerm ? searchResults : filteredData;

  const isPortalVariant = variant === 'portal';
  const containerClassName = isPortalVariant ? 'category-selector' : 'category-selector relative';

  // ✅ NOUVEAU - Fonction pour rendre les options spéciales
  const renderSpecialOptions = () => {
    const options = [];

    // Option "Aucune" (catégorie racine)
    if (allowRootSelection && !searchTerm) {
      options.push(
        <div
          key="none"
          className={`flex items-center px-3 py-2 cursor-pointer ${
            theme === 'elegant'
              ? 'hover:bg-slate-100 dark:hover:bg-slate-800'
              : theme === 'colorful'
                ? 'hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-800/30 dark:hover:to-pink-800/30'
                : theme === 'minimal'
                  ? 'hover:bg-gray-25 dark:hover:bg-gray-850 border-b border-gray-100 dark:border-gray-800'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => handleSelect('')}
        >
          <span className="text-gray-500 dark:text-gray-400">Aucune (catégorie racine)</span>
          {value === '' && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2" />}
        </div>
      );
    }

    // ✅ NOUVEAU - Option "Sans catégorie"
    if (!searchTerm) {
      options.push(
        <div
          key="no_category"
          className={`flex items-center px-3 py-2 cursor-pointer ${
            theme === 'elegant'
              ? 'hover:bg-slate-100 dark:hover:bg-slate-800'
              : theme === 'colorful'
                ? 'hover:bg-gradient-to-r hover:from-red-100 hover:to-orange-100 dark:hover:from-red-800/30 dark:hover:to-orange-800/30'
                : theme === 'minimal'
                  ? 'hover:bg-gray-25 dark:hover:bg-gray-850 border-b border-gray-100 dark:border-gray-800'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => handleSelect('no_category')}
        >
          <span className="flex items-center">
            <span className="mr-2">🚫</span>
            <span className="text-red-600 dark:text-red-400">Sans catégorie</span>
          </span>
          {value === 'no_category' && (
            <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2" />
          )}
        </div>
      );
    }

    return options;
  };

  // ⚡ PORTAL: Rendu spécial avec thème APPLIQUÉ
  if (isPortalVariant) {
    return (
      <div ref={containerRef} className={containerClassName}>
        <CategoryDropdown
          isOpen={true}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showSearch={showSearch}
          containerRef={containerRef}
          theme={theme} // ⚡ Passe le thème
          className={portalDropdownClassName} // ⚡ Utilise la classe thématisée
        >
          {/* ✅ Options spéciales (Aucune + Sans catégorie) */}
          {renderSpecialOptions()}

          {/* Liste des catégories */}
          <CategoryList
            items={displayData}
            mode="single"
            selectedValue={value}
            searchTerm={searchTerm}
            expandedItems={expandedItems}
            showCounts={showCounts}
            onSelect={handleSelect}
            onToggleExpand={toggleExpand}
            theme={theme} // ⚡ Passe le thème
          />
        </CategoryDropdown>
      </div>
    );
  }

  // Rendu normal avec SelectField + thème
  return (
    <div ref={containerRef} className={containerClassName}>
      <SelectField
        value={selectedLabel}
        placeholder={defaultPlaceholder}
        isOpen={isOpen}
        disabled={disabled}
        onClick={handleFieldClick}
        theme={theme}
      />

      <CategoryDropdown
        isOpen={isOpen}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showSearch={showSearch}
        containerRef={containerRef}
        theme={theme}
      >
        {/* ✅ Options spéciales (Aucune + Sans catégorie) */}
        {renderSpecialOptions()}

        <CategoryList
          items={displayData}
          mode="single"
          selectedValue={value}
          searchTerm={searchTerm}
          expandedItems={expandedItems}
          showCounts={showCounts}
          onSelect={handleSelect}
          onToggleExpand={toggleExpand}
          theme={theme}
        />
      </CategoryDropdown>
    </div>
  );
};

export default SingleCategorySelector;
