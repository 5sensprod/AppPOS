// src/components/reports/TaxBreakdown.jsx

import React from 'react';
import { formatCurrency, formatNumber, getTaxRateLabel } from '../../utils/formatters';

/**
 * Composant pour une carte de taux de TVA
 */
const TaxRateCard = ({ taxKey, data }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
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
          <span className="text-sm text-gray-600 dark:text-gray-400">Valeur achat:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(data.inventory_value)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Valeur vente:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(data.retail_value)}
          </span>
        </div>

        {data.rate > 0 && (
          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
            <span className="text-sm text-gray-600 dark:text-gray-400">TVA collectée:</span>
            <span className="font-medium text-green-600">{formatCurrency(data.tax_amount)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Composant principal pour la répartition par taux de TVA
 */
const TaxBreakdown = ({ breakdown }) => {
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Répartition par Taux de TVA
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(breakdown).map(([key, data]) => (
          <TaxRateCard key={key} taxKey={key} data={data} />
        ))}
      </div>
    </div>
  );
};

export default TaxBreakdown;
