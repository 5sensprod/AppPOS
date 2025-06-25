// src/components/reports/export/DetailedReportOptions.jsx

import React from 'react';
import CategoryTreeSelector from './CategoryTreeSelector';

/**
 * Composant pour les options de tri
 */
const SortingOptions = ({ sortBy, sortOrder, onSortByChange, onSortOrderChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Trier par
      </label>
      <select
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
      >
        <option value="name">Désignation</option>
        <option value="sku">SKU</option>
        <option value="stock">Stock</option>
        <option value="value">Valeur stock</option>
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Ordre
      </label>
      <select
        value={sortOrder}
        onChange={(e) => onSortOrderChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
      >
        <option value="asc">Croissant</option>
        <option value="desc">Décroissant</option>
      </select>
    </div>
  </div>
);

/**
 * Composant pour l'aperçu des colonnes
 */
const ColumnsPreview = () => (
  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
      Colonnes du tableau détaillé :
    </h4>
    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
      <div>
        • <strong>SKU</strong> - Référence produit
      </div>
      <div>
        • <strong>Désignation</strong> - Nom du produit
      </div>
      <div>
        • <strong>PA HT</strong> - Prix d'achat hors taxes
      </div>
      <div>
        • <strong>PV TTC</strong> - Prix de vente toutes taxes comprises
      </div>
      <div>
        • <strong>Stock</strong> - Quantité en stock
      </div>
      <div>
        • <strong>TVA %</strong> - Taux de TVA
      </div>
      <div>
        • <strong>Valeur Stock</strong> - PA HT × Stock
      </div>
      <div>
        • <strong>Montant TVA</strong> - TVA calculée sur la valeur de vente
      </div>
    </div>
  </div>
);

/**
 * Composant principal pour les options du rapport détaillé
 */
const DetailedReportOptions = ({
  exportOptions,
  setExportOptions,
  categorySelectorHeight,
  setCategorySelectorHeight,
  isResizing,
  handleResizeStart,
  onCategoryTreeLoad,
}) => {
  /**
   * Gère l'activation/désactivation du groupement par catégories
   */
  const handleGroupByCategoryChange = (enabled) => {
    setExportOptions((prev) => ({
      ...prev,
      groupByCategory: enabled,
      selectedCategories: enabled ? prev.selectedCategories : [],
    }));

    // Charger l'arbre de catégories si nécessaire
    if (enabled && onCategoryTreeLoad) {
      onCategoryTreeLoad();
    }
  };

  /**
   * Met à jour une option simple
   */
  const updateOption = (key, value) => {
    setExportOptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
        Options du rapport détaillé
      </h4>

      {/* Option groupement par catégories */}
      <div className="mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={exportOptions.groupByCategory}
            onChange={(e) => handleGroupByCategoryChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Grouper par catégories
          </span>
        </label>
        <p className="text-xs text-gray-500 ml-7 mt-1">
          Afficher les produits regroupés par catégorie avec des sous-totaux
        </p>
      </div>

      {/* Sélecteur de catégories (si groupement activé) */}
      {exportOptions.groupByCategory && (
        <CategoryTreeSelector
          exportOptions={exportOptions}
          setExportOptions={setExportOptions}
          categorySelectorHeight={categorySelectorHeight}
          setCategorySelectorHeight={setCategorySelectorHeight}
          isResizing={isResizing}
          handleResizeStart={handleResizeStart}
        />
      )}

      {/* Options de tri */}
      <SortingOptions
        sortBy={exportOptions.sortBy}
        sortOrder={exportOptions.sortOrder}
        onSortByChange={(value) => updateOption('sortBy', value)}
        onSortOrderChange={(value) => updateOption('sortOrder', value)}
      />

      {/* Aperçu des colonnes */}
      <div className="mt-4">
        <ColumnsPreview />
      </div>
    </div>
  );
};

export default DetailedReportOptions;
