import React, { useState, useEffect } from 'react';
import {
  Package,
  TrendingUp,
  Calculator,
  PieChart,
  RefreshCw,
  Download,
  FileText,
} from 'lucide-react';
import apiService from '../services/api';
import { useAPIPDFExport } from '../hooks/useAPIPDFExport';

const ReportsPage = () => {
  const [stockStats, setStockStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const { isExporting: isAPIExporting, exportStockStatisticsToPDF } = useAPIPDFExport();

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
        name: 'AXE Musique', // À récupérer depuis vos paramètres
        address: '4 rue Lochet 51000 Châlons en Champagne',
        siret: '418 647 574 00031',
      };

      await exportStockStatisticsToPDF(companyInfo);
    } catch (error) {
      console.error('Erreur export PDF:', error);
      alert("Erreur lors de l'export PDF");
    }
  };

  const handleExportHTMLToPDF = async () => {
    try {
      const fileName = `rapport_stock_${new Date().toISOString().split('T')[0]}.pdf`;
      await exportElementToPDF('reports-container', fileName);
    } catch (error) {
      console.error('Erreur export HTML vers PDF:', error);
      alert("Erreur lors de l'export PDF");
    }
  };

  useEffect(() => {
    fetchStockStatistics();
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
            onClick={handleExportPDF}
            disabled={isAPIExporting || !stockStats}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAPIExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Export...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Export PDF
              </>
            )}
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
    </div>
  );
};

export default ReportsPage;
