// src/pages/ReportsPage.jsx - MISE À JOUR

import React, { useState } from 'react';
import { RefreshCw, FileText } from 'lucide-react';

// Composants modulaires
import StockMetrics from '../components/reports/StockMetrics';
import TaxBreakdown from '../components/reports/TaxBreakdown';
import ReportSummary from '../components/reports/ReportSummary';
import StockCategoryChart from '../components/reports/StockCategoryChart'; // 🆕 NOUVEAU
import ExportModal from '../components/reports/export/ExportModal';

// Hooks
import { useStockStatistics } from '../hooks/useStockStatistics';
import { useAdvancedPDFExport } from '../hooks/useAdvancedPDFExport';

/**
 * Composant pour l'indicateur de chargement
 */
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

/**
 * Composant pour l'affichage d'erreur
 */
const ErrorMessage = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
    {error}
    <button onClick={onRetry} className="ml-4 text-red-600 hover:text-red-800 underline">
      Réessayer
    </button>
  </div>
);

/**
 * Composant pour l'en-tête de la page
 */
const PageHeader = ({ lastUpdate, onRefresh, onExport, isExporting, hasData }) => (
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
        onClick={onExport}
        disabled={isExporting || !hasData}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileText className="w-4 h-4" />
        Export PDF
      </button>

      <button
        onClick={onRefresh}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Actualiser
      </button>
    </div>
  </div>
);

/**
 * Composant principal de la page des rapports
 */
const ReportsPage = () => {
  // État local
  const [showExportModal, setShowExportModal] = useState(false);

  // Hooks personnalisés
  const { stockStats, loading, error, lastUpdate, refreshData } = useStockStatistics();
  const { isExporting, exportStockStatisticsToPDF } = useAdvancedPDFExport();

  /**
   * Gère l'export PDF
   */
  const handleExportPDF = async (apiOptions) => {
    try {
      console.log("📤 Lancement de l'export PDF avec les options:", apiOptions);

      await exportStockStatisticsToPDF(apiOptions);

      // Fermer la modale après succès
      setShowExportModal(false);

      console.log('✅ Export PDF terminé avec succès');
    } catch (error) {
      console.error("❌ Erreur lors de l'export PDF:", error);
      throw error; // Relancer pour que ExportModal puisse gérer l'erreur
    }
  };

  /**
   * Ouvre la modale d'export
   */
  const handleOpenExportModal = () => {
    setShowExportModal(true);
  };

  /**
   * Ferme la modale d'export
   */
  const handleCloseExportModal = () => {
    setShowExportModal(false);
  };

  // Rendu du composant
  return (
    <div className="p-6 max-w-7xl mx-auto" id="reports-container">
      {/* En-tête de la page */}
      <PageHeader
        lastUpdate={lastUpdate}
        onRefresh={refreshData}
        onExport={handleOpenExportModal}
        isExporting={isExporting}
        hasData={!!stockStats}
      />

      {/* États de chargement et d'erreur */}
      {loading && <LoadingSpinner />}

      {error && <ErrorMessage error={error} onRetry={refreshData} />}

      {/* Contenu principal */}
      {stockStats && !loading && (
        <>
          {/* Métriques principales */}
          <StockMetrics stats={stockStats} />

          {/* 🆕 NOUVEAU : Graphique de répartition des catégories */}
          <div className="mb-8">
            <StockCategoryChart />
          </div>

          {/* 🔥 FIX : Répartition par TVA sur une ligne complète */}
          <div className="mb-8">
            <TaxBreakdown breakdown={stockStats.financial.tax_breakdown} />
          </div>

          {/* 🔥 FIX : Résumé final sur une ligne complète */}
          <div className="mb-8">
            <ReportSummary summary={stockStats.summary} financial={stockStats.financial} />
          </div>
        </>
      )}

      {/* Modale d'export */}
      {showExportModal && (
        <ExportModal
          onClose={handleCloseExportModal}
          onExport={handleExportPDF}
          isExporting={isExporting}
        />
      )}
    </div>
  );
};

export default ReportsPage;
