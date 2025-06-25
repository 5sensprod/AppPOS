// src/components/reports/StockCategoryChart.jsx - UX AMÉLIORÉE
import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, Package, DollarSign, BarChart3 } from 'lucide-react';
import useReportsStore from '../../stores/useReportsStore';

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
 * Composant de légende personnalisée avec animations
 */
const CustomLegend = ({ payload, viewMode }) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {payload.map((entry, index) => (
        <div
          key={index}
          className="flex items-center gap-1 px-2 py-1 transition-opacity duration-300 ease-in-out"
          style={{ opacity: 1 }} // Toujours visible
        >
          <div
            className="w-3 h-3 rounded-full transition-all duration-200"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px] transition-opacity duration-300">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Composant principal du camembert des catégories - UX AMÉLIORÉE
 */
const StockCategoryChart = ({ className = '' }) => {
  const [viewMode, setViewMode] = useState('value');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Store Zustand optimisé
  const {
    categories,
    products,
    categoryAnalytics,
    preCalculatedChartData,
    loading,
    errors,
    fetchCategories,
    fetchProducts,
    calculateCategoryAnalytics,
    calculateAllChartData,
    getOptimizedChartData,
    isLoading,
    hasErrors,
  } = useReportsStore();

  /**
   * 🎯 GESTION DE TRANSITION SMOOTH lors du changement de mode
   */
  const handleViewModeChange = (newMode) => {
    if (newMode === viewMode) return;

    setIsTransitioning(true);

    // Transition d'opacité
    setTimeout(() => {
      setViewMode(newMode);
      setIsTransitioning(false);
    }, 150); // 150ms de transition
  };

  /**
   * Chargement intelligent des données
   */
  useEffect(() => {
    const loadData = async () => {
      if (categories && products && categoryAnalytics && preCalculatedChartData) {
        console.log('✅ Toutes les données chart déjà disponibles');
        return;
      }

      try {
        if (!categories) await fetchCategories();
        if (!products) await fetchProducts();

        if (categories && products && !categoryAnalytics) {
          calculateCategoryAnalytics();
        }

        if (categoryAnalytics && !preCalculatedChartData) {
          calculateAllChartData();
          console.log('✅ Données chart pré-calculées');
        }
      } catch (error) {
        console.error('Erreur chargement données chart:', error);
      }
    };

    loadData();
  }, [categories, products, categoryAnalytics, preCalculatedChartData]);

  useEffect(() => {
    if (categoryAnalytics && !preCalculatedChartData) {
      calculateAllChartData();
    }
  }, [categoryAnalytics, preCalculatedChartData, calculateAllChartData]);

  /**
   * Données optimisées du graphique
   */
  const { chartData, totals } = useMemo(() => {
    return getOptimizedChartData(viewMode);
  }, [getOptimizedChartData, viewMode, preCalculatedChartData]);

  /**
   * Configuration mémorisée
   */
  const chartConfig = useMemo(() => {
    const configs = {
      value: {
        title: 'Répartition par Valeur de Stock',
        icon: DollarSign,
      },
      products: {
        title: 'Répartition par Nombre de Produits',
        icon: Package,
      },
      margin: {
        title: 'Répartition par Marge Potentielle',
        icon: TrendingUp,
      },
    };
    return configs[viewMode] || configs.value;
  }, [viewMode]);

  /**
   * Gestion du retry
   */
  const handleRetry = async () => {
    try {
      await Promise.all([fetchCategories(), fetchProducts()]);
      calculateCategoryAnalytics();
      calculateAllChartData();
    } catch (error) {
      console.error('Erreur retry:', error);
    }
  };

  // États de chargement
  if (isLoading() && !chartData.length) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-80">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (hasErrors() && !chartData.length) {
    const errorMessage = errors.categories || errors.products || 'Erreur de chargement';

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
        <div className="text-center text-red-600 dark:text-red-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>{errorMessage}</p>
          <button
            onClick={handleRetry}
            className="mt-2 text-blue-600 hover:text-blue-800 underline"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Aucune donnée de catégorie disponible</p>
          <button
            onClick={handleRetry}
            className="mt-2 text-blue-600 hover:text-blue-800 underline"
          >
            Actualiser
          </button>
        </div>
      </div>
    );
  }

  const { icon: IconComponent, title } = chartConfig;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
      {/* En-tête avec sélecteur de mode */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-0">
          <IconComponent className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {['value', 'products', 'margin'].map((mode) => (
            <button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === mode
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {mode === 'value' ? 'Valeur' : mode === 'products' ? 'Produits' : 'Marge'}
            </button>
          ))}
        </div>
      </div>

      {/* Statistiques rapides avec transition */}
      <div
        className={`grid grid-cols-3 gap-4 mb-6 transition-opacity duration-300 ${
          isTransitioning ? 'opacity-50' : 'opacity-100'
        }`}
      >
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totals.totalValue.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Valeur totale</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {totals.totalProducts.toLocaleString('fr-FR')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Produits</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {totals.totalMargin.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Marge potentielle</p>
        </div>
      </div>

      {/* Graphique camembert avec transitions et sans highlights */}
      <div
        style={{ width: '100%', height: '400px' }}
        className={`transition-opacity duration-300 ${
          isTransitioning ? 'opacity-30' : 'opacity-100'
        }`}
      >
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              // 🎯 FIX: Labels flottants avec transition CSS intégrée
              label={({ name, percentage }) => `${name} (${percentage}%)`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              // 🎯 FIX 1: Supprimer les interactions de highlight
              activeIndex={-1} // Pas d'élément actif
              activeShape={undefined} // Pas de forme active
              onMouseEnter={() => {}} // Désactiver hover
              onClick={() => {}} // Désactiver clic
              // 🎯 FIX 2: Animation smooth des labels flottants
              animationBegin={0}
              animationDuration={300}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  // 🎯 FIX 1: Désactiver complètement les interactions
                  style={{ cursor: 'default' }}
                />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              // Garder le tooltip mais sans interaction
              cursor={false}
            />
            {/* 🎯 FIX 2: Légende avec transition */}
            <Legend
              content={<CustomLegend viewMode={viewMode} />}
              wrapperStyle={{
                transition: 'opacity 300ms ease-in-out',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 🎯 NOUVEAU: CSS pour les labels flottants */}
      <style jsx>{`
        .recharts-pie-label-text {
          transition: all 300ms ease-in-out !important;
          opacity: ${isTransitioning ? '0.3' : '1'} !important;
        }
        .recharts-pie-label-line {
          transition: all 300ms ease-in-out !important;
          opacity: ${isTransitioning ? '0.3' : '1'} !important;
        }
      `}</style>

      {/* Note explicative avec transition */}
      <div
        className={`mt-4 text-center transition-opacity duration-300 ${
          isTransitioning ? 'opacity-50' : 'opacity-100'
        }`}
      >
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Affichage des {chartData.length} principales catégories racines
          {chartData.length === 12 ? ' (limitée à 12 pour la lisibilité)' : ''}
          {preCalculatedChartData?.lastCalculated && (
            <span className="block mt-1">
              Données calculées: {preCalculatedChartData.lastCalculated.toLocaleTimeString('fr-FR')}
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default StockCategoryChart;
