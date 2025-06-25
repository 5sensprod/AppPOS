// src/components/reports/ReportSummary.jsx

import React from 'react';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';

/**
 * Composant pour le résumé final du rapport
 */
const ReportSummary = ({ summary, financial }) => {
  if (!summary || !financial) {
    return null;
  }

  return (
    <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Résumé:</strong> {formatNumber(summary.products_in_stock)} produits représentent
          une valeur de {formatCurrency(financial.retail_value)} avec une marge potentielle de{' '}
          {formatCurrency(financial.potential_margin)} (
          {formatPercentage(financial.margin_percentage)}).
        </div>
      </div>
    </div>
  );
};

export default ReportSummary;
