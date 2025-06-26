// src/components/reports/StockMetrics.jsx - VERSION CORRIGÉE

import React from 'react';
import { Package, Calculator, TrendingUp, PieChart } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';

/**
 * Composant individuel pour une métrique - VERSION CORRIGÉE
 */
const MetricCard = ({ icon: Icon, title, value, subtitle, extra, color, extraColor = 'red' }) => {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };

  const extraColorClasses = {
    red: 'text-red-600',
    gray: 'text-gray-500',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700 min-h-[140px] flex flex-col">
      {/* En-tête avec icône et titre */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${colorClasses[color]} flex-shrink-0`} />
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-tight">
          {title}
        </h3>
      </div>

      {/* Valeur principale - RESPONSIVE ET SANS DÉBORDEMENT */}
      <div
        className={`text-xl sm:text-2xl lg:text-3xl font-bold ${colorClasses[color]} mb-2 break-words leading-tight flex-shrink-0`}
      >
        {value}
      </div>

      {/* Sous-titre */}
      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-tight flex-shrink-0">
        {subtitle}
      </div>

      {/* Information supplémentaire */}
      {extra && (
        <div
          className={`text-xs ${extraColorClasses[extraColor]} mt-1 leading-tight flex-shrink-0`}
        >
          {extra}
        </div>
      )}
    </div>
  );
};

/**
 * Composant principal pour afficher les 4 métriques de stock - VERSION CORRIGÉE
 */
const StockMetrics = ({ stats }) => {
  if (!stats) {
    return null;
  }

  const metrics = [
    {
      icon: Package,
      title: 'Produits en Stock',
      value: formatNumber(stats.summary.products_in_stock),
      subtitle: `sur ${formatNumber(stats.summary.simple_products)} produits physiques`,
      extra: `${formatNumber(stats.summary.excluded_products)} exclus (stock ≤ 0)`,
      color: 'blue',
      extraColor: 'red',
    },
    {
      icon: Calculator,
      title: 'Valeur Stock',
      value: formatCurrency(stats.financial.inventory_value),
      subtitle: "Prix d'achat total",
      extra: `Moy. ${formatCurrency(stats.performance.avg_inventory_per_product)}/produit`,
      color: 'green',
      extraColor: 'gray',
    },
    {
      icon: TrendingUp,
      title: 'Valeur de Vente',
      value: formatCurrency(stats.financial.retail_value),
      subtitle: 'Prix de vente total',
      extra: `Moy. ${formatCurrency(stats.performance.avg_retail_per_product)}/produit`,
      color: 'purple',
      extraColor: 'gray',
    },
    {
      icon: PieChart,
      title: 'Marge Potentielle',
      value: formatCurrency(stats.financial.potential_margin),
      subtitle: `${formatPercentage(stats.financial.margin_percentage)} de marge`,
      extra: `TVA: ${formatCurrency(stats.financial.tax_amount)}`,
      color: 'orange',
      extraColor: 'gray',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
};

export default StockMetrics;
