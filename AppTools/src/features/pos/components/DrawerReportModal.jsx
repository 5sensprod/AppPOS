// src/features/pos/components/DrawerReportModal.jsx
import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  Printer,
  Search,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  ShoppingBag,
  User,
} from 'lucide-react';
import { useDrawer, useSessionCashier } from '../../../stores/sessionStore';

const DrawerReportModal = ({ isOpen, onClose, reportData = null }) => {
  const { drawer } = useDrawer();
  const { cashierSession } = useSessionCashier();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (isOpen && !reportData && drawer && cashierSession) {
      const movements = drawer.movements || [];
      const totalIn = movements
        .filter((m) => m.type === 'in')
        .reduce((sum, m) => sum + m.amount, 0);
      const totalOut = movements
        .filter((m) => m.type === 'out')
        .reduce((sum, m) => sum + m.amount, 0);

      setReport({
        date: new Date().toISOString().split('T')[0],
        cashier: cashierSession.username,
        summary: {
          session_duration: drawer.openedAt
            ? Math.floor((new Date() - new Date(drawer.openedAt)) / (1000 * 60))
            : 0,
          opening_amount: drawer.openingAmount || 0,
          closing_amount: drawer.currentAmount || 0,
          expected_amount: drawer.expectedAmount || 0,
          variance: (drawer.currentAmount || 0) - (drawer.expectedAmount || 0),
          total_movements_in: totalIn,
          total_movements_out: totalOut,
          movements_count: movements.length,
          total_sales: movements
            .filter((m) => m.reason?.includes('Vente'))
            .reduce((sum, m) => sum + m.amount, 0),
          sales_count: cashierSession.sales_count || 0,
        },
        movements: movements.map((m) => ({
          ...m,
          timestamp: m.created_at || new Date().toISOString(),
        })),
        generated_at: new Date().toISOString(),
      });
    } else if (reportData) {
      setReport(reportData);
    }
  }, [isOpen, reportData, drawer, cashierSession]);

  const filteredMovements =
    report?.movements?.filter(
      (m) =>
        !searchTerm ||
        m.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const handlePrint = () => {
    const printContent = `
      <html>
        <head><title>Rapport de Caisse - ${report?.date}</title></head>
        <body style="font-family: Arial, sans-serif; margin: 20px;">
          <h1>Rapport de Caisse</h1>
          <p>Date: ${report?.date}</p>
          <p>Caissier: ${report?.cashier}</p>
          <h2>Résumé</h2>
          <p>Ouverture: ${report?.summary.opening_amount.toFixed(2)}€</p>
          <p>Fermeture: ${report?.summary.closing_amount.toFixed(2)}€</p>
          <p>Écart: ${report?.summary.variance.toFixed(2)}€</p>
          <p>Ventes: ${report?.summary.total_sales.toFixed(2)}€ (${report?.summary.sales_count} transactions)</p>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExport = () => {
    if (!report) return;
    const csvData = [
      ['Date', 'Heure', 'Type', 'Montant', 'Raison'],
      ...filteredMovements.map((m) => [
        new Date(m.timestamp).toLocaleDateString('fr-FR'),
        new Date(m.timestamp).toLocaleTimeString('fr-FR'),
        m.type === 'in' ? 'Entrée' : 'Sortie',
        `${m.amount.toFixed(2)}€`,
        m.reason || '',
      ]),
    ];
    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport-caisse-${report.date}.csv`;
    link.click();
  };

  if (!isOpen || !report) return null;

  const tabs = [
    { id: 'overview', label: "Vue d'ensemble", icon: BarChart3 },
    { id: 'movements', label: 'Mouvements', icon: TrendingUp },
    { id: 'details', label: 'Détails', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Rapport de fin de journée
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(report.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{report.cashier}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {new Date(report.generated_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-lg"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimer</span>
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">Ouverture</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {report.summary.opening_amount.toFixed(2)}€
                      </p>
                    </div>
                    <Wallet className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600">Fermeture</p>
                      <p className="text-2xl font-bold text-green-900">
                        {report.summary.closing_amount.toFixed(2)}€
                      </p>
                    </div>
                    <Wallet className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600">Ventes</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {report.summary.total_sales.toFixed(2)}€
                      </p>
                      <p className="text-xs text-purple-600">
                        {report.summary.sales_count} transaction(s)
                      </p>
                    </div>
                    <ShoppingBag className="h-8 w-8 text-purple-600" />
                  </div>
                </div>

                <div
                  className={`${
                    report.summary.variance >= 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  } border rounded-lg p-4`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={`text-sm ${
                          report.summary.variance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        Écart
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          report.summary.variance >= 0 ? 'text-green-900' : 'text-red-900'
                        }`}
                      >
                        {report.summary.variance >= 0 ? '+' : ''}
                        {report.summary.variance.toFixed(2)}€
                      </p>
                    </div>
                    {report.summary.variance >= 0 ? (
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    ) : (
                      <TrendingDown className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Movement Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold mb-4">Résumé des mouvements</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <ArrowUpCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Entrées</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      +{report.summary.total_movements_in.toFixed(2)}€
                    </p>
                    <p className="text-sm text-gray-500">
                      {report.movements.filter((m) => m.type === 'in').length} mouvement(s)
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <ArrowDownCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Sorties</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      -{report.summary.total_movements_out.toFixed(2)}€
                    </p>
                    <p className="text-sm text-gray-500">
                      {report.movements.filter((m) => m.type === 'out').length} mouvement(s)
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Net</span>
                    </div>
                    <p
                      className={`text-2xl font-bold ${
                        report.summary.total_movements_in - report.summary.total_movements_out >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {report.summary.total_movements_in - report.summary.total_movements_out >= 0
                        ? '+'
                        : ''}
                      {(
                        report.summary.total_movements_in - report.summary.total_movements_out
                      ).toFixed(2)}
                      €
                    </p>
                    <p className="text-sm text-gray-500">Différence totale</p>
                  </div>
                </div>
              </div>

              {/* Session Info */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold mb-4">Informations de session</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Durée de session :</span>
                      <span className="font-medium">
                        {Math.floor(report.summary.session_duration / 60)}h
                        {(report.summary.session_duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nombre de mouvements :</span>
                      <span className="font-medium">{report.summary.movements_count}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Montant attendu :</span>
                      <span className="font-medium">
                        {report.summary.expected_amount.toFixed(2)}€
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transactions :</span>
                      <span className="font-medium">{report.summary.sales_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Movements Tab */}
          {activeTab === 'movements' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher dans les mouvements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Movements List */}
              <div className="space-y-2">
                {filteredMovements.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucun mouvement trouvé</p>
                  </div>
                ) : (
                  filteredMovements.map((movement, index) => (
                    <div
                      key={movement.id || index}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-lg ${
                              movement.type === 'in' ? 'bg-green-100' : 'bg-red-100'
                            }`}
                          >
                            {movement.type === 'in' ? (
                              <ArrowUpCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <ArrowDownCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{movement.reason || 'Mouvement'}</span>
                              <span
                                className={`text-lg font-bold ${
                                  movement.type === 'in' ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {movement.type === 'in' ? '+' : '-'}
                                {movement.amount.toFixed(2)}€
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(movement.timestamp).toLocaleString('fr-FR')}
                              {movement.created_by && ` • Par ${movement.created_by}`}
                            </div>
                            {movement.notes && (
                              <div className="text-sm text-gray-600 mt-1">
                                <strong>Notes :</strong> {movement.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Summary Table */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Résumé financier</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">Fond de caisse</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Ouverture :</span>
                          <span>{report.summary.opening_amount.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fermeture :</span>
                          <span>{report.summary.closing_amount.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Attendu :</span>
                          <span>{report.summary.expected_amount.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between font-bold border-t pt-1">
                          <span>Écart :</span>
                          <span
                            className={
                              report.summary.variance >= 0 ? 'text-green-600' : 'text-red-600'
                            }
                          >
                            {report.summary.variance >= 0 ? '+' : ''}
                            {report.summary.variance.toFixed(2)}€
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Activité commerciale</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Ventes :</span>
                          <span>{report.summary.sales_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Chiffre d'affaires :</span>
                          <span>{report.summary.total_sales.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mouvements :</span>
                          <span>{report.summary.movements_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Durée :</span>
                          <span>
                            {Math.floor(report.summary.session_duration / 60)}h
                            {(report.summary.session_duration % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Movements Table */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Détail des mouvements</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Date/Heure</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Montant</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Raison</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.movements.map((movement, index) => (
                        <tr key={movement.id || index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 text-sm">
                            {new Date(movement.timestamp).toLocaleString('fr-FR')}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                movement.type === 'in'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {movement.type === 'in' ? 'Entrée' : 'Sortie'}
                            </span>
                          </td>
                          <td
                            className={`border border-gray-300 px-4 py-2 text-right font-medium ${
                              movement.type === 'in' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {movement.type === 'in' ? '+' : '-'}
                            {movement.amount.toFixed(2)}€
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm">
                            {movement.reason || '-'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm">
                            {movement.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrawerReportModal;
