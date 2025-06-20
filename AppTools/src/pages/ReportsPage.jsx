import React, { useState, useEffect } from 'react';
import {
  Package,
  TrendingUp,
  Calculator,
  PieChart,
  RefreshCw,
  Download,
  FileText,
  Settings,
  List,
  BarChart3,
  X,
  Check,
} from 'lucide-react';
import apiService from '../services/api';
import { useAdvancedPDFExport } from '../hooks/useAdvancedPDFExport';

const ReportsPage = () => {
  const [stockStats, setStockStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [categoryTree, setCategoryTree] = useState([]); // 🔥 Arbre depuis l'API
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [categorySelectorHeight, setCategorySelectorHeight] = useState(300); // 🔥 État pour la hauteur
  const [isResizing, setIsResizing] = useState(false); // 🔥 État pour le redimensionnement
  const [exportOptions, setExportOptions] = useState({
    reportType: 'summary',
    includeCompanyInfo: true,
    includeCharts: true,
    sortBy: 'name',
    sortOrder: 'asc',
    groupByCategory: false,
    selectedCategories: [],
    includeUncategorized: false, // 🔥 CHANGÉ : false par défaut
  });
  const { isExporting, exportStockStatisticsToPDF } = useAdvancedPDFExport();

  // Fonctions utilitaires
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const formatPercentage = (num) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(num / 100);
  };

  const getTaxRateLabel = (rate) => {
    if (rate === 0) return 'Occasion (0%)';
    if (rate === 5.5) return 'Réduit (5.5%)';
    if (rate === 20) return 'Normal (20%)';
    return `${rate}%`;
  };

  // 🔥 FONCTION CORRIGÉE: Utiliser l'API hierarchical + croiser avec les données de stock
  const fetchCategoriesWithStock = async () => {
    setLoadingCategories(true);
    try {
      console.log("🔄 Chargement de l'arbre hiérarchique et des données de stock...");

      // 🎯 Récupérer à la fois l'arbre hiérarchique ET les produits avec stock
      const [hierarchicalResponse, productsResponse] = await Promise.all([
        apiService.get('/api/categories/hierarchical'),
        apiService.get('/api/products'),
      ]);

      const hierarchicalData = hierarchicalResponse.data.data || [];
      const allProducts = productsResponse.data.data || [];

      console.log(
        `📊 ${hierarchicalData.length} catégories racines et ${allProducts.length} produits reçus`
      );

      // 🔥 Créer un map des produits avec leurs données de stock
      const productsMap = {};
      allProducts.forEach((product) => {
        if (product.type === 'simple' && (product.stock || 0) > 0) {
          productsMap[product._id] = {
            ...product,
            hasStock: true,
          };
        }
      });

      console.log(`📦 ${Object.keys(productsMap).length} produits en stock trouvés`);

      // 🔥 Filtrer récursivement pour ne garder que les catégories avec des produits en stock
      const filterCategoriesWithStock = (categories) => {
        return categories
          .map((category) => {
            // Croiser les produits de la catégorie avec ceux qui ont du stock
            const productsInStock = (category.products || []).filter(
              (product) => productsMap[product._id] // Le produit existe et a du stock
            );

            // Filtrer récursivement les enfants
            const filteredChildren = category.children
              ? filterCategoriesWithStock(category.children)
              : [];

            // Calculer le total de produits en stock (cette catégorie + enfants)
            const totalProductsInStock =
              productsInStock.length +
              filteredChildren.reduce((sum, child) => sum + (child.totalProductsInStock || 0), 0);

            // Garder la catégorie si elle a des produits en stock (directement ou via enfants)
            if (totalProductsInStock > 0) {
              return {
                ...category,
                children: filteredChildren,
                productsInStock: productsInStock, // 🔥 Produits enrichis avec données de stock
                productsInStockCount: productsInStock.length,
                totalProductsInStock: totalProductsInStock,
                isExpanded: false,
              };
            }

            return null;
          })
          .filter(Boolean); // Supprimer les nulls
      };

      const filteredTree = filterCategoriesWithStock(hierarchicalData);
      setCategoryTree(filteredTree);

      console.log(`✅ ${filteredTree.length} catégories racines avec stock disponibles`);

      // Debug: afficher quelques catégories
      filteredTree.slice(0, 3).forEach((cat) => {
        console.log(
          `  📂 ${cat.name}: ${cat.totalProductsInStock} produits total (${cat.productsInStockCount} directs)`
        );
      });
    } catch (err) {
      console.error('❌ Erreur chargement catégories hiérarchiques:', err);
      setCategoryTree([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fonctions de gestion de l'arbre
  const toggleCategoryExpansion = (categoryId) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const collectAllCategoryIds = (categories) => {
    let ids = [];
    categories.forEach((cat) => {
      ids.push(cat._id);
      if (cat.children && cat.children.length > 0) {
        ids.push(...collectAllCategoryIds(cat.children));
      }
    });
    return ids;
  };

  const selectAllCategories = () => {
    const allIds = collectAllCategoryIds(categoryTree);
    setExportOptions((prev) => ({
      ...prev,
      selectedCategories: allIds,
    }));
  };

  const deselectAllCategories = () => {
    setExportOptions((prev) => ({
      ...prev,
      selectedCategories: [],
    }));
  };

  const expandAllCategories = () => {
    const allIds = collectAllCategoryIds(categoryTree);
    setExpandedCategories(new Set(allIds));
  };

  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
  };

  // 🔥 NOUVEAU : Système de redimensionnement avec la souris
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);

    const startY = e.clientY;
    const startHeight = categorySelectorHeight;

    const handleMouseMove = (e) => {
      const deltaY = e.clientY - startY;
      const newHeight = Math.max(200, Math.min(500, startHeight + deltaY));
      setCategorySelectorHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = ''; // Réactiver la sélection de texte
      document.body.style.cursor = ''; // Restaurer le curseur
    };

    // Désactiver la sélection de texte pendant le redimensionnement
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 🔥 COMPOSANT: Rendu récursif de l'arbre de catégories (optimisé)
  const CategoryTreeNode = ({ category, level = 0 }) => {
    const isExpanded = expandedCategories.has(category._id);
    const isSelected = exportOptions.selectedCategories.includes(category._id);
    const hasChildren = category.children && category.children.length > 0;

    const handleToggleSelection = (e) => {
      const isChecking = e.target.checked;

      // Collecter tous les IDs (catégorie + descendants)
      const categoryAndDescendants = [category._id];
      if (hasChildren) {
        categoryAndDescendants.push(...collectAllCategoryIds(category.children));
      }

      setExportOptions((prev) => ({
        ...prev,
        selectedCategories: isChecking
          ? [
              ...prev.selectedCategories,
              ...categoryAndDescendants.filter((id) => !prev.selectedCategories.includes(id)),
            ]
          : prev.selectedCategories.filter((id) => !categoryAndDescendants.includes(id)),
      }));
    };

    return (
      <div className="select-none">
        <div
          className={`flex items-center gap-2 py-1 px-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded`}
          style={{ marginLeft: level * 16 }}
        >
          {/* Bouton d'expansion */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleCategoryExpansion(category._id)}
              className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggleSelection}
            className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />

          {/* Nom et badges */}
          <label className="flex items-center gap-2 cursor-pointer flex-1 text-sm">
            {' '}
            {/* 🔥 text-sm au lieu de text-xs */}
            <span
              className={`text-gray-700 dark:text-gray-300 ${hasChildren ? 'font-medium' : ''}`}
            >
              {category.name}
            </span>
            {category.productsInStockCount > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                {' '}
                {/* 🔥 px-2 py-1 plus grand */}
                {category.productsInStockCount}
              </span>
            )}
            {category.totalProductsInStock > category.productsInStockCount && (
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                {' '}
                {/* 🔥 px-2 py-1 plus grand */}+
                {category.totalProductsInStock - category.productsInStockCount}
              </span>
            )}
          </label>
        </div>

        {/* Enfants */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {category.children.map((child) => (
              <CategoryTreeNode key={child._id} category={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const fetchStockStatistics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get('/api/products/stock/statistics');
      setStockStats(response.data.data);
      setLastUpdate(new Date());
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
      console.error('Erreur stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const companyInfo = {
        name: 'AXE Musique',
        address: '4 rue Lochet 51000 Châlons en Champagne',
        siret: '418 647 574 00031',
      };

      const apiOptions = {
        companyInfo,
        reportType: exportOptions.reportType,
        includeCompanyInfo: exportOptions.includeCompanyInfo,
        includeCharts: exportOptions.includeCharts,
        sortBy: exportOptions.sortBy,
        sortOrder: exportOptions.sortOrder,
        groupByCategory: exportOptions.groupByCategory,
        selectedCategories: exportOptions.selectedCategories,
        includeUncategorized: exportOptions.includeUncategorized,
      };

      console.log("📤 Options envoyées à l'API:", apiOptions);
      console.log('🏷️ groupByCategory:', exportOptions.groupByCategory);
      console.log('📂 selectedCategories:', exportOptions.selectedCategories);

      await exportStockStatisticsToPDF(apiOptions);
      setShowExportModal(false);
    } catch (error) {
      console.error('Erreur export PDF:', error);
      alert("Erreur lors de l'export PDF");
    }
  };

  // Calculer le total de produits sélectionnés
  const getSelectedProductsCount = () => {
    const calculateTotal = (categories) => {
      return categories.reduce((total, cat) => {
        let catTotal = 0;
        if (exportOptions.selectedCategories.includes(cat._id)) {
          catTotal += cat.totalProductsInStock || 0;
        }
        if (cat.children) {
          catTotal += calculateTotal(cat.children);
        }
        return total + catTotal;
      }, 0);
    };

    return calculateTotal(categoryTree);
  };

  useEffect(() => {
    fetchStockStatistics();
    fetchCategoriesWithStock(); // 🔥 Utilisation de la nouvelle fonction optimisée
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
        <button
          onClick={fetchStockStatistics}
          className="ml-4 text-red-600 hover:text-red-800 underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" id="reports-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rapports de Stock</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Analyse financière du stock en temps réel
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              Mis à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
            </span>
          )}
          <button
            onClick={() => setShowExportModal(true)}
            disabled={isExporting || !stockStats}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={fetchStockStatistics}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </div>

      {stockStats && (
        <>
          {/* Métriques principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <Package className="w-8 h-8 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Produits en Stock
                </h3>
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {formatNumber(stockStats.summary.products_in_stock)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                sur {formatNumber(stockStats.summary.simple_products)} produits physiques
              </div>
              <div className="text-xs text-red-600 mt-1">
                {formatNumber(stockStats.summary.excluded_products)} exclus (stock ≤ 0)
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <Calculator className="w-8 h-8 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Valeur Stock
                </h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatCurrency(stockStats.financial.inventory_value)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Prix d'achat total</div>
              <div className="text-xs text-gray-500 mt-1">
                Moy. {formatCurrency(stockStats.performance.avg_inventory_per_product)}/produit
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Valeur de Vente
                </h3>
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {formatCurrency(stockStats.financial.retail_value)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Prix de vente total</div>
              <div className="text-xs text-gray-500 mt-1">
                Moy. {formatCurrency(stockStats.performance.avg_retail_per_product)}/produit
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <PieChart className="w-8 h-8 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Marge Potentielle
                </h3>
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {formatCurrency(stockStats.financial.potential_margin)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {formatPercentage(stockStats.financial.margin_percentage)} de marge
              </div>
              <div className="text-xs text-gray-500 mt-1">
                TVA: {formatCurrency(stockStats.financial.tax_amount)}
              </div>
            </div>
          </div>

          {/* Répartition par TVA */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Répartition par Taux de TVA
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.entries(stockStats.financial.tax_breakdown).map(([key, data]) => (
                <div
                  key={key}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {getTaxRateLabel(data.rate)}
                    </h4>
                    <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      {formatNumber(data.product_count)} produits
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Valeur achat:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(data.inventory_value)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Valeur vente:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(data.retail_value)}
                      </span>
                    </div>

                    {data.rate > 0 && (
                      <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          TVA collectée:
                        </span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(data.tax_amount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer avec résumé */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Résumé:</strong> {formatNumber(stockStats.summary.products_in_stock)}{' '}
                produits représentent une valeur de{' '}
                {formatCurrency(stockStats.financial.retail_value)} avec une marge potentielle de{' '}
                {formatCurrency(stockStats.financial.potential_margin)}(
                {formatPercentage(stockStats.financial.margin_percentage)}).
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modale d'export */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Options d'Export PDF
                </h2>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  disabled={isExporting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Type de rapport */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Type de rapport
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      exportOptions.reportType === 'summary'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() => setExportOptions((prev) => ({ ...prev, reportType: 'summary' }))}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <BarChart3
                        className={`w-5 h-5 ${exportOptions.reportType === 'summary' ? 'text-blue-600' : 'text-gray-500'}`}
                      />
                      <span
                        className={`font-medium ${exportOptions.reportType === 'summary' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        Rapport de Synthèse
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Vue d'ensemble avec métriques principales et répartition par TVA
                    </p>
                  </button>

                  <button
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      exportOptions.reportType === 'detailed'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() =>
                      setExportOptions((prev) => ({ ...prev, reportType: 'detailed' }))
                    }
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <List
                        className={`w-5 h-5 ${exportOptions.reportType === 'detailed' ? 'text-blue-600' : 'text-gray-500'}`}
                      />
                      <span
                        className={`font-medium ${exportOptions.reportType === 'detailed' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        Rapport Détaillé
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Liste complète des produits avec SKU, désignation, prix, stock et valeurs
                    </p>
                  </button>
                </div>
              </div>

              {/* Options pour rapport détaillé */}
              {exportOptions.reportType === 'detailed' && (
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
                        onChange={(e) => {
                          setExportOptions((prev) => ({
                            ...prev,
                            groupByCategory: e.target.checked,
                            selectedCategories: e.target.checked ? prev.selectedCategories : [],
                          }));
                          if (e.target.checked && categoryTree.length === 0) {
                            fetchCategoriesWithStock();
                          }
                        }}
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

                  {/* 🔥 Sélection des catégories avec arbre hiérarchique optimisé */}
                  {exportOptions.groupByCategory && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Sélection des catégories (avec stock uniquement)
                      </h5>

                      {loadingCategories ? (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          Chargement des catégories...
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <button
                              type="button"
                              onClick={selectAllCategories}
                              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                            >
                              Tout sélectionner
                            </button>
                            <button
                              type="button"
                              onClick={deselectAllCategories}
                              className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                            >
                              Tout désélectionner
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (expandedCategories.size === 0) {
                                  expandAllCategories();
                                } else {
                                  collapseAllCategories();
                                }
                              }}
                              className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                            >
                              {expandedCategories.size === 0 ? 'Développer tout' : 'Réduire tout'}
                            </button>
                            <span className="text-xs text-blue-700 dark:text-blue-300">
                              {exportOptions.selectedCategories.length} sélectionnées
                            </span>
                          </div>

                          {/* 🔥 NOUVEAU : Zone redimensionnable avec vraie poignée fonctionnelle */}
                          <div className="relative">
                            <div
                              className="overflow-y-auto border border-blue-200 dark:border-blue-700 rounded bg-white dark:bg-gray-800 p-3"
                              style={{
                                height: `${categorySelectorHeight}px`,
                                minHeight: '200px',
                                maxHeight: '500px',
                              }}
                            >
                              {categoryTree.length > 0 ? (
                                categoryTree.map((category) => (
                                  <CategoryTreeNode
                                    key={category._id}
                                    category={category}
                                    level={0}
                                  />
                                ))
                              ) : (
                                <div className="text-xs text-gray-500 italic p-2">
                                  Aucune catégorie avec stock disponible
                                </div>
                              )}
                            </div>

                            {/* 🔥 Poignée de redimensionnement fonctionnelle */}
                            <div
                              className={`absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center group ${
                                isResizing
                                  ? 'bg-blue-500'
                                  : 'bg-blue-200 dark:bg-blue-700 hover:bg-blue-300 dark:hover:bg-blue-600'
                              } transition-colors duration-200`}
                              onMouseDown={handleResizeStart}
                              style={{ borderRadius: '0 0 6px 6px' }}
                            >
                              {/* Lignes de la poignée */}
                              <div className="flex flex-col items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <div className="w-8 h-0.5 bg-white dark:bg-gray-300 rounded"></div>
                                <div className="w-6 h-0.5 bg-white dark:bg-gray-300 rounded"></div>
                                <div className="w-4 h-0.5 bg-white dark:bg-gray-300 rounded"></div>
                              </div>
                            </div>
                          </div>

                          {/* Légende des badges */}
                          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <span className="bg-blue-100 text-blue-700 px-1 rounded text-xs">
                                  12
                                </span>
                                <span>Produits directs</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="bg-green-100 text-green-700 px-1 rounded text-xs">
                                  +8
                                </span>
                                <span>Produits des sous-catégories</span>
                              </div>
                            </div>
                          </div>

                          {/* Affichage d'un message si aucune catégorie n'a de stock */}
                          {categoryTree.length === 0 && (
                            <div className="text-xs text-orange-600 italic">
                              Aucune catégorie ne contient de produits en stock
                            </div>
                          )}

                          <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-700">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={exportOptions.includeUncategorized}
                                onChange={(e) =>
                                  setExportOptions((prev) => ({
                                    ...prev,
                                    includeUncategorized: e.target.checked,
                                  }))
                                }
                                className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-700 dark:text-gray-300">
                                Inclure les produits sans catégorie
                              </span>
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Trier par
                      </label>
                      <select
                        value={exportOptions.sortBy}
                        onChange={(e) =>
                          setExportOptions((prev) => ({ ...prev, sortBy: e.target.value }))
                        }
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
                        value={exportOptions.sortOrder}
                        onChange={(e) =>
                          setExportOptions((prev) => ({ ...prev, sortOrder: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="asc">Croissant</option>
                        <option value="desc">Décroissant</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Options générales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Options générales
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeCompanyInfo}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          includeCompanyInfo: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Inclure les informations de l'entreprise
                    </span>
                  </label>

                  {exportOptions.reportType === 'summary' && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeCharts}
                        onChange={(e) =>
                          setExportOptions((prev) => ({
                            ...prev,
                            includeCharts: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Inclure les métriques graphiques
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Aperçu des colonnes pour rapport détaillé */}
              {exportOptions.reportType === 'detailed' && (
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
              )}

              {/* 🔥 NOUVELLE SECTION: Résumé de la sélection optimisée */}
              {exportOptions.groupByCategory && exportOptions.selectedCategories.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                    Aperçu de la sélection
                  </h4>
                  <div className="text-sm text-green-800 dark:text-green-200">
                    <div className="mb-2">
                      <strong>{exportOptions.selectedCategories.length}</strong> catégorie(s)
                      sélectionnée(s)
                    </div>
                    <div className="text-xs">
                      Total estimé: <strong>{getSelectedProductsCount()} produits</strong> en stock
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-xl">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  disabled={isExporting}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Export...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Exporter PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
