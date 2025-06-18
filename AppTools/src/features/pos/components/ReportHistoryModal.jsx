// src/features/pos/components/ReportHistoryModal.jsx
import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  History,
} from 'lucide-react';
import BaseModal from '../../../components/common/ui/BaseModal';
import reportsService from '../../../services/reportsService';
import DrawerReportModal from './DrawerReportModal';

const ReportHistoryModal = ({ isOpen, onClose }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('7'); // 7 derniers jours par défaut
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const reportsPerPage = 10;

  useEffect(() => {
    if (isOpen) {
      loadReports();
    }
  }, [isOpen, dateFilter, currentPage]);

  const loadReports = async () => {
    setLoading(true);
    setError(null);

    try {
      const endDate = new Date();
      const startDate = new Date();

      if (dateFilter !== 'all') {
        startDate.setDate(endDate.getDate() - parseInt(dateFilter));
      } else {
        startDate.setFullYear(endDate.getFullYear() - 1); // 1 an max
      }

      const params = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        limit: reportsPerPage,
        offset: (currentPage - 1) * reportsPerPage,
      };

      const response = await reportsService.getHistoricalReports(params);
      setReports(response.data.reports || []);
      setTotalPages(Math.ceil((response.data.total || 0) / reportsPerPage));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(
    (report) =>
      !searchTerm ||
      report.cashier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.session_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewReport = async (report) => {
    try {
      // ✅ ADAPTER la structure pour DrawerReportModal
      const adaptedReport = {
        date: report.session_date,
        cashier: report.cashier_name,
        summary: {
          session_duration: report.session_duration || 0,
          opening_amount: report.opening_amount || 0,
          closing_amount: report.closing_amount || 0,
          expected_amount: report.expected_amount || 0,
          variance: report.variance || 0,
          total_movements_in: report.total_movements_in || 0,
          total_movements_out: report.total_movements_out || 0,
          movements_count: report.movements_count || 0,
          total_sales: report.total_sales || 0,
          sales_count: report.sales_count || 0,
        },
        movements: (report.movements || []).map((m) => ({
          ...m,
          timestamp: m.created_at || new Date().toISOString(),
        })),
        sales: report.sales_data || [],
        sales_summary: {
          total_sales: report.total_sales || 0,
          sales_count: report.sales_count || 0,
          cash_sales: report.cash_sales || 0,
          card_sales: report.card_sales || 0,
          mixed_sales: report.mixed_sales || 0,
        },
        generated_at: report.generated_at || new Date().toISOString(),
      };

      setSelectedReport(adaptedReport);
      setShowReportModal(true);
    } catch (err) {
      setError(`Erreur ouverture rapport: ${err.message}`);
    }
  };

  const handleExportReport = async (reportId, format = 'pdf') => {
    try {
      console.log('Export demandé:', reportId, format);

      // Construire l'URL avec le bon format
      const url = `/api/reports/${reportId}/export?format=${format}`;

      // Récupérer le token d'auth
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      // Faire la requête avec fetch pour gérer le blob
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
      }

      // Récupérer le nom du fichier depuis les headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `rapport-${reportId}.${format}`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      // Convertir en blob
      const blob = await response.blob();

      // Créer le lien de téléchargement
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;

      // Déclencher le téléchargement
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Nettoyer l'URL
      window.URL.revokeObjectURL(downloadUrl);

      console.log('Export réussi:', filename);
    } catch (err) {
      console.error('Erreur export:', err);
      setError(`Erreur export: ${err.message}`);
    }
  };

  const getVarianceColor = (variance) => {
    const absVariance = Math.abs(variance);
    if (absVariance < 0.01) return 'text-green-600 dark:text-green-400';
    if (absVariance < 5) return 'text-yellow-600 dark:text-yellow-400';
    if (absVariance < 20) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getVarianceIcon = (variance) => {
    const absVariance = Math.abs(variance);
    if (absVariance < 0.01) return CheckCircle;
    return AlertTriangle;
  };

  // Footer avec bouton fermer
  const footer = (
    <button
      onClick={onClose}
      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
    >
      Fermer
    </button>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Historique des rapports"
        icon={History}
        footer={footer}
        maxWidth="max-w-6xl"
      >
        {/* Description */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Consultation des sessions passées
          </p>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par caissier ou session..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">3 derniers mois</option>
            <option value="all">Tout l'historique</option>
          </select>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">
                Chargement des rapports...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={loadReports}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Aucun rapport trouvé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => {
                const VarianceIcon = getVarianceIcon(report.variance);

                return (
                  <div
                    key={report._id}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 dark:bg-blue-900/50 rounded-lg p-2">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {report.cashier_name}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                              Session {report.session_id?.substring(0, 8)}...
                            </span>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(report.session_date).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {new Date(report.session_start).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {report.session_end && (
                                  <>
                                    {' '}
                                    -{' '}
                                    {new Date(report.session_end).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </>
                                )}
                              </span>
                            </div>
                            <span>{report.session_duration || 0} min</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        {/* Stats */}
                        <div className="text-right">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Ventes</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {report.total_sales.toFixed(2)}€
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Écart</div>
                          <div
                            className={`font-semibold flex items-center ${getVarianceColor(report.variance)}`}
                          >
                            <VarianceIcon className="h-4 w-4 mr-1" />
                            {report.variance > 0 ? '+' : ''}
                            {report.variance.toFixed(2)}€
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewReport(report)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                            title="Voir le rapport"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleExportReport(report._id, 'pdf')}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-colors"
                            title="Exporter en PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !loading && !error && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Page {currentPage} sur {totalPages}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-lg">
                {currentPage}
              </span>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </BaseModal>

      {/* Modal rapport détaillé */}
      {showReportModal && selectedReport && (
        <DrawerReportModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedReport(null);
          }}
          reportData={selectedReport}
        />
      )}
    </>
  );
};

export default ReportHistoryModal;
