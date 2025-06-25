// src/components/reports/StockCategoryChart.jsx
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, Package, DollarSign, BarChart3 } from 'lucide-react';
import apiService from '../../services/api';

/**
 * Palette de couleurs pour le camembert
 */
const COLORS = [
  '#3B82F6', // Bleu
  '#10B981', // Vert
  '#F59E0B', // Orange
  '#EF4444', // Rouge
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#F97316', // Orange foncé
  '#84CC16', // Vert lime
  '#EC4899', // Rose
  '#6B7280', // Gris
  '#14B8A6', // Teal
  '#F43F5E', // Rose rouge
];

/**
 * Composant de tooltip personnalisé
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">{data.name}</p>
        <p className="text-blue-600 dark:text-blue-400">Valeur: {data.formattedValue}</p>
        <p className="text-gray-600 dark:text-gray-300">
          {data.products} produits ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Composant de légende personnalisée
 */
const CustomLegend = ({ payload }) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-1 px-2 py-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Composant principal du camembert des catégories
 */
const StockCategoryChart = ({ className = '' }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('value'); // 'value' | 'products' | 'margin'
  const [totalStats, setTotalStats] = useState({
    totalValue: 0,
    totalProducts: 0,
    totalMargin: 0,
  });

  /**
   * Récupération des données des catégories avec produits
   */
  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les catégories ET les produits séparément
      const [categoriesResponse, productsResponse] = await Promise.all([
        apiService.get('/api/categories'),
        apiService.get('/api/products'),
      ]);

      // Extraire les données
      const categories = categoriesResponse.data?.success
        ? categoriesResponse.data.data
        : categoriesResponse.data;

      const products = productsResponse.data?.success
        ? productsResponse.data.data
        : productsResponse.data;

      console.log('🔍 Categories:', categories?.length);
      console.log('🔍 Products:', products?.length);

      if (!Array.isArray(categories) || !Array.isArray(products)) {
        throw new Error('Données invalides reçues');
      }

      // Traiter les données pour le graphique
      const processedData = processCategoryDataFromSeparateAPIs(categories, products, viewMode);
      setChartData(processedData.chartData);
      setTotalStats(processedData.totals);
    } catch (err) {
      console.error('Erreur récupération données catégories:', err);
      setError('Impossible de charger les données des catégories');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Traitement des données séparées (catégories + produits)
   */
  const processCategoryDataFromSeparateAPIs = (categories, products, mode) => {
    const rootCategories = {};
    let totalValue = 0;
    let totalProducts = 0;
    let totalMargin = 0;

    // Créer une map des catégories pour navigation rapide
    const categoryMap = {};
    categories.forEach((cat) => {
      categoryMap[cat._id] = cat;
    });

    // Fonction pour trouver la catégorie racine
    const findRootCategory = (categoryId) => {
      if (!categoryId || !categoryMap[categoryId]) return null;

      let current = categoryMap[categoryId];
      while (current.parent_id && categoryMap[current.parent_id]) {
        current = categoryMap[current.parent_id];
      }
      return current;
    };

    // Traiter chaque produit
    products.forEach((product) => {
      // Ne traiter que les produits avec stock > 0
      const stock = product.stock || 0;
      if (stock <= 0) return;

      const purchasePrice = product.purchase_price || 0;
      const salePrice = product.price || 0;

      const productValue = stock * purchasePrice;
      const productMargin = stock * (salePrice - purchasePrice);

      // Trouver les catégories du produit
      const productCategories = product.categories || [];

      if (productCategories.length > 0) {
        // Prendre la première catégorie du produit
        const primaryCategoryId = productCategories[0];
        const rootCategory = findRootCategory(primaryCategoryId);

        if (rootCategory) {
          const rootName = rootCategory.name || 'Sans nom';

          if (!rootCategories[rootName]) {
            rootCategories[rootName] = {
              name: rootName,
              value: 0,
              products: 0,
              margin: 0,
            };
          }

          rootCategories[rootName].value += productValue;
          rootCategories[rootName].products += 1;
          rootCategories[rootName].margin += productMargin;
        }
      } else {
        // Produit sans catégorie
        const rootName = 'Sans catégorie';

        if (!rootCategories[rootName]) {
          rootCategories[rootName] = {
            name: rootName,
            value: 0,
            products: 0,
            margin: 0,
          };
        }

        rootCategories[rootName].value += productValue;
        rootCategories[rootName].products += 1;
        rootCategories[rootName].margin += productMargin;
      }

      totalValue += productValue;
      totalProducts += 1;
      totalMargin += productMargin;
    });

    // Convertir en données pour le graphique
    const chartData = Object.values(rootCategories)
      .filter((cat) => {
        if (mode === 'value') return cat.value > 0;
        if (mode === 'products') return cat.products > 0;
        if (mode === 'margin') return cat.margin > 0;
        return false;
      })
      .map((cat) => {
        let value, formattedValue, percentage;

        if (mode === 'value') {
          value = cat.value;
          formattedValue = `${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`;
          percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0;
        } else if (mode === 'products') {
          value = cat.products;
          formattedValue = `${value} produits`;
          percentage = totalProducts > 0 ? ((value / totalProducts) * 100).toFixed(1) : 0;
        } else if (mode === 'margin') {
          value = cat.margin;
          formattedValue = `${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`;
          percentage = totalMargin > 0 ? ((value / totalMargin) * 100).toFixed(1) : 0;
        }

        return {
          name: cat.name,
          value: value,
          formattedValue: formattedValue,
          percentage: percentage,
          products: cat.products,
          stockValue: cat.value,
          margin: cat.margin,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);

    return {
      chartData,
      totals: {
        totalValue,
        totalProducts,
        totalMargin,
      },
    };
  };

  /**
   * Traitement des données de catégories pour le graphique
   */
  const processCategoryData = (categories, mode) => {
    const rootCategories = {};
    let totalValue = 0;
    let totalProducts = 0;
    let totalMargin = 0;

    // Fonction récursive pour traiter chaque catégorie
    const processCategory = (category, rootName = null) => {
      const currentRootName = rootName || category.name;

      if (!rootCategories[currentRootName]) {
        rootCategories[currentRootName] = {
          name: currentRootName,
          value: 0,
          products: 0,
          margin: 0,
        };
      }

      // Traiter les produits de cette catégorie
      if (category.products && category.products.length > 0) {
        category.products.forEach((product) => {
          const stock = product.stock || 0;
          const purchasePrice = product.purchase_price || 0;
          const salePrice = product.price || 0;

          const productValue = stock * purchasePrice;
          const productMargin = stock * (salePrice - purchasePrice);

          rootCategories[currentRootName].value += productValue;
          rootCategories[currentRootName].products += 1;
          rootCategories[currentRootName].margin += productMargin;

          totalValue += productValue;
          totalProducts += 1;
          totalMargin += productMargin;
        });
      }

      // Traiter les sous-catégories
      if (category.children && category.children.length > 0) {
        category.children.forEach((child) => {
          processCategory(child, currentRootName);
        });
      }
    };

    // Traiter toutes les catégories racines
    categories.forEach((category) => {
      processCategory(category);
    });

    // Convertir en données pour le graphique
    const chartData = Object.values(rootCategories)
      .filter((cat) => {
        // Filtrer selon le mode d'affichage
        if (mode === 'value') return cat.value > 0;
        if (mode === 'products') return cat.products > 0;
        if (mode === 'margin') return cat.margin > 0;
        return false;
      })
      .map((cat) => {
        let value, formattedValue, percentage;

        if (mode === 'value') {
          value = cat.value;
          formattedValue = `${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`;
          percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0;
        } else if (mode === 'products') {
          value = cat.products;
          formattedValue = `${value} produits`;
          percentage = totalProducts > 0 ? ((value / totalProducts) * 100).toFixed(1) : 0;
        } else if (mode === 'margin') {
          value = cat.margin;
          formattedValue = `${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`;
          percentage = totalMargin > 0 ? ((value / totalMargin) * 100).toFixed(1) : 0;
        }

        return {
          name: cat.name,
          value: value,
          formattedValue: formattedValue,
          percentage: percentage,
          products: cat.products,
          stockValue: cat.value,
          margin: cat.margin,
        };
      })
      .sort((a, b) => b.value - a.value) // Trier par valeur décroissante
      .slice(0, 12); // Limiter à 12 catégories pour la lisibilité

    return {
      chartData,
      totals: {
        totalValue,
        totalProducts,
        totalMargin,
      },
    };
  };

  /**
   * Effet pour charger les données
   */
  useEffect(() => {
    fetchCategoryData();
  }, [viewMode]);

  /**
   * Obtenir le titre selon le mode
   */
  const getChartTitle = () => {
    switch (viewMode) {
      case 'value':
        return 'Répartition par Valeur de Stock';
      case 'products':
        return 'Répartition par Nombre de Produits';
      case 'margin':
        return 'Répartition par Marge Potentielle';
      default:
        return 'Répartition des Catégories';
    }
  };

  /**
   * Obtenir l'icône selon le mode
   */
  const getChartIcon = () => {
    switch (viewMode) {
      case 'value':
        return <DollarSign className="w-5 h-5" />;
      case 'products':
        return <Package className="w-5 h-5" />;
      case 'margin':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <BarChart3 className="w-5 h-5" />;
    }
  };

  /**
   * Rendu du composant
   */
  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-80">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
        <div className="text-center text-red-600 dark:text-red-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>{error}</p>
          <button
            onClick={fetchCategoryData}
            className="mt-2 text-blue-600 hover:text-blue-800 underline"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Aucune donnée de catégorie disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
      {/* En-tête avec sélecteur de mode */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-0">
          {getChartIcon()}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{getChartTitle()}</h3>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('value')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'value'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Valeur
          </button>
          <button
            onClick={() => setViewMode('products')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'products'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Produits
          </button>
          <button
            onClick={() => setViewMode('margin')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'margin'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Marge
          </button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalStats.totalValue.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Valeur totale</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {totalStats.totalProducts.toLocaleString('fr-FR')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Produits</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {totalStats.totalMargin.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Marge potentielle</p>
        </div>
      </div>

      {/* Graphique camembert */}
      <div style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name} (${percentage}%)`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Note explicative */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Affichage des {chartData.length} principales catégories racines
          {chartData.length === 12 ? ' (limitée à 12 pour la lisibilité)' : ''}
        </p>
      </div>
    </div>
  );
};

export default StockCategoryChart;
