// src/components/reports/StockMetrics.jsx

import React from 'react';
import { Package, Calculator, TrendingUp, PieChart } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';

/**
 * Composant individuel pour une métrique
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
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-3">
        <Icon className={`w-8 h-8 ${colorClasses[color]}`} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>

      <div className={`text-3xl font-bold ${colorClasses[color]} mb-2`}>{value}</div>

      <div className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</div>

      {extra && <div className={`text-xs ${extraColorClasses[extraColor]} mt-1`}>{extra}</div>}
    </div>
  );
};

/**
 * Composant principal pour afficher les 4 métriques de stock
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
};

export default StockMetrics;
