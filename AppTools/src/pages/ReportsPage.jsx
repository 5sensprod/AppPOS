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
  const [categories, setCategories] = useState([]); // 🆕 Liste des catégories
  const [categoriesWithStock, setCategoriesWithStock] = useState([]); // 🔥 NOUVEAU: Catégories avec stock
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    reportType: 'summary',
    includeCompanyInfo: true,
    includeCharts: true,
    sortBy: 'name',
    sortOrder: 'asc',
    groupByCategory: false,
    selectedCategories: [],
    includeUncategorized: true,
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

  // 🔥 NOUVELLE FONCTION: Construire l'arbre hiérarchique des catégories avec stock
  const buildCategoryTreeWithStock = (categoriesWithStock) => {
    console.log("🌳 Construction de l'arbre hiérarchique...");

    // Créer un map pour accès rapide
    const categoryMap = {};
    categoriesWithStock.forEach((cat) => {
      categoryMap[cat._id] = {
        ...cat,
        children: [],
        isExpanded: false,
      };
    });

    // Construire l'arbre
    const rootCategories = [];

    categoriesWithStock.forEach((category) => {
      if (!category.parent_id) {
        // Catégorie racine
        rootCategories.push(categoryMap[category._id]);
      } else if (categoryMap[category.parent_id]) {
        // Catégorie enfant dont le parent a aussi du stock
        categoryMap[category.parent_id].children.push(categoryMap[category._id]);
      } else {
        // Le parent n'a pas de stock, cette catégorie devient racine
        rootCategories.push(categoryMap[category._id]);
      }
    });

    // Trier récursivement
    const sortTree = (categories) => {
      categories.sort((a, b) => a.name.localeCompare(b.name));
      categories.forEach((cat) => {
        if (cat.children.length > 0) {
          sortTree(cat.children);
        }
      });
    };

    sortTree(rootCategories);

    console.log(`🌳 Arbre construit: ${rootCategories.length} catégories racines`);
    return rootCategories;
  };

  // 🔥 NOUVEAU STATE: pour gérer l'état d'expansion de l'arbre
  const [categoryTree, setCategoryTree] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const calculateCategoriesWithStock = async () => {
    try {
      console.log('🔄 Calcul des catégories avec stock...');

      // Récupérer toutes les catégories et tous les produits
      const [categoriesResponse, productsResponse] = await Promise.all([
        apiService.get('/api/categories'),
        apiService.get('/api/products'),
      ]);

      const allCategories = categoriesResponse.data.data || [];
      const allProducts = productsResponse.data.data || [];

      console.log(
        `📊 ${allCategories.length} catégories et ${allProducts.length} produits trouvés`
      );

      // Filtrer les produits en stock uniquement
      const productsInStock = allProducts.filter(
        (product) => product.type === 'simple' && (product.stock || 0) > 0
      );

      console.log(`📦 ${productsInStock.length} produits en stock`);

      // 🔥 Fonction récursive pour trouver tous les descendants d'une catégorie
      const findAllDescendants = (parentId) => {
        const descendants = [];
        const directChildren = allCategories.filter((cat) => cat.parent_id === parentId);

        directChildren.forEach((child) => {
          descendants.push(child._id);
          // Récursion pour les petits-enfants
          const grandChildren = findAllDescendants(child._id);
          descendants.push(...grandChildren);
        });

        return descendants;
      };

      // Calculer pour chaque catégorie si elle a des produits en stock
      const categoriesWithStockInfo = allCategories.map((category) => {
        // Trouver toutes les catégories concernées (elle-même + descendants)
        const relevantCategories = [category._id, ...findAllDescendants(category._id)];

        // Compter les produits en stock dans ces catégories
        const productsCount = productsInStock.filter((product) => {
          const productCategories = product.categories || [];
          return productCategories.some((catId) => relevantCategories.includes(catId));
        }).length;

        return {
          ...category,
          productsInStockCount: productsCount,
          hasStock: productsCount > 0,
        };
      });

      // Filtrer seulement celles avec du stock
      const categoriesWithStock = categoriesWithStockInfo.filter((cat) => cat.hasStock);

      console.log(`✅ ${categoriesWithStock.length} catégories avec stock trouvées`);

      // Debug: afficher quelques catégories avec stock
      categoriesWithStock.slice(0, 5).forEach((cat) => {
        console.log(`  📂 ${cat.name}: ${cat.productsInStockCount} produits en stock`);
      });

      return categoriesWithStock.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('❌ Erreur calcul catégories avec stock:', error);
      return [];
    }
  };

  // 🆕 Fonction pour charger les catégories (version améliorée)
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      // Charger toutes les catégories pour l'ancien système
      const response = await apiService.get('/api/categories');
      setCategories(response.data.data || []);

      // 🔥 Charger les catégories avec stock pour la nouvelle fonctionnalité
      const categoriesWithStockData = await calculateCategoriesWithStock();
      setCategoriesWithStock(categoriesWithStockData);

      // 🔥 NOUVEAU: Construire l'arbre hiérarchique
      const tree = buildCategoryTreeWithStock(categoriesWithStockData);
      setCategoryTree(tree);

      console.log(`📊 ${categoriesWithStockData.length} catégories avec stock disponibles`);
      console.log(`🌳 ${tree.length} catégories racines dans l'arbre`);
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  // 🔥 FONCTION MANQUANTE: Charger les statistiques de stock
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

  // 🔥 NOUVELLES FONCTIONS: Gestion de l'arbre hiérarchique
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
      if (cat.children.length > 0) {
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

  // 🔥 COMPOSANT: Rendu récursif de l'arbre de catégories
  const CategoryTreeNode = ({ category, level = 0 }) => {
    const isExpanded = expandedCategories.has(category._id);
    const isSelected = exportOptions.selectedCategories.includes(category._id);
    const hasChildren = category.children.length > 0;

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
          className={`flex items-center gap-2 py-1 px-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded ${
            level > 0 ? 'ml-' + level * 4 : ''
          }`}
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

          {/* Nom et badge */}
          <label className="flex items-center gap-2 cursor-pointer flex-1 text-xs">
            <span
              className={`text-gray-700 dark:text-gray-300 ${hasChildren ? 'font-medium' : ''}`}
            >
              {category.name}
            </span>
            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">
              {category.productsInStockCount}
            </span>
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

  const handleExportPDF = async () => {
    try {
      const companyInfo = {
        name: 'AXE Musique',
        address: '4 rue Lochet 51000 Châlons en Champagne',
        siret: '418 647 574 00031',
      };

      // Préparer les options pour l'API
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

      // 🔍 Debug: Vérifier ce qui est envoyé
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

  useEffect(() => {
    fetchStockStatistics();
    fetchCategories(); // 🆕 Charger aussi les catégories
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
                          if (e.target.checked && categoriesWithStock.length === 0) {
                            fetchCategories();
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

                  {/* 🔥 NOUVELLE SÉLECTION DES CATÉGORIES avec stock uniquement */}
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
                          <div className="flex items-center gap-3 mb-3">
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
                                // Développer/Réduire tout
                                const allIds = collectAllCategoryIds(categoryTree);
                                setExpandedCategories((prev) =>
                                  prev.size === allIds.length ? new Set() : new Set(allIds)
                                );
                              }}
                              className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                            >
                              {expandedCategories.size ===
                              collectAllCategoryIds(categoryTree).length
                                ? 'Réduire tout'
                                : 'Développer tout'}
                            </button>
                            <span className="text-xs text-blue-700 dark:text-blue-300">
                              {exportOptions.selectedCategories.length} /{' '}
                              {categoriesWithStock.length} sélectionnées
                            </span>
                          </div>

                          <div className="max-h-40 overflow-y-auto border border-blue-200 dark:border-blue-700 rounded bg-white dark:bg-gray-800 p-2">
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
                                Aucune catégorie disponible
                              </div>
                            )}
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

              {/* 🔥 NOUVELLE SECTION: Résumé de la sélection */}
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
                      Total estimé:{' '}
                      <strong>
                        {categoriesWithStock
                          .filter((cat) => exportOptions.selectedCategories.includes(cat._id))
                          .reduce((sum, cat) => sum + cat.productsInStockCount, 0)}{' '}
                        produits
                      </strong>{' '}
                      dans les catégories sélectionnées
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
