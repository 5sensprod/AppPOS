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
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
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
      const blob = await reportsService.exportReport(reportId, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-${reportId}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Erreur export: ${err.message}`);
    }
  };

  const getVarianceColor = (variance) => {
    const absVariance = Math.abs(variance);
    if (absVariance < 0.01) return 'text-green-600';
    if (absVariance < 5) return 'text-yellow-600';
    if (absVariance < 20) return 'text-orange-600';
    return 'text-red-600';
  };

  const getVarianceIcon = (variance) => {
    const absVariance = Math.abs(variance);
    if (absVariance < 0.01) return CheckCircle;
    return AlertTriangle;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Historique des rapports
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Consultation des sessions passées
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Filtres */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par caissier ou session..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">7 derniers jours</option>
                <option value="30">30 derniers jours</option>
                <option value="90">3 derniers mois</option>
                <option value="all">Tout l'historique</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Chargement des rapports...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={loadReports}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Réessayer
                </button>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun rapport trouvé</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => {
                  const VarianceIcon = getVarianceIcon(report.variance);

                  return (
                    <div
                      key={report._id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="bg-blue-100 rounded-lg p-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>

                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-900">
                                {report.cashier_name}
                              </span>
                              <span className="text-sm text-gray-500">
                                Session {report.session_id?.substring(0, 8)}...
                              </span>
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
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
                            <div className="text-sm text-gray-500">Ventes</div>
                            <div className="font-semibold">{report.total_sales.toFixed(2)}€</div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm text-gray-500">Écart</div>
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
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Voir le rapport"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleExportReport(report._id, 'pdf')}
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Page {currentPage} sur {totalPages}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg">
                  {currentPage}
                </span>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

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
