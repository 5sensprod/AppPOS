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
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  ShoppingBag,
  User,
  ClipboardList,
} from 'lucide-react';
import BaseModal from '../../../components/common/ui/BaseModal';
import { useDrawer, useSessionCashier } from '../../../stores/sessionStore';
import salesService from '../../../services/salesService';

const DrawerReportModal = ({ isOpen, onClose, reportData = null }) => {
  const { drawer } = useDrawer();
  const { cashierSession } = useSessionCashier();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [report, setReport] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (isOpen && !reportData && drawer && cashierSession) {
        const movements = drawer.movements || [];
        const totalIn = movements
          .filter((m) => m.type === 'in')
          .reduce((sum, m) => sum + m.amount, 0);
        const totalOut = movements
          .filter((m) => m.type === 'out')
          .reduce((sum, m) => sum + m.amount, 0);

        let allSales = [];
        let salesSummary = {
          total_sales: 0,
          sales_count: 0,
          cash_sales: 0,
          card_sales: 0,
          mixed_sales: 0,
        };

        try {
          const salesResponse = await salesService.getSales({
            cashier_id: cashierSession.cashier_id,
            start_date: drawer.openedAt,
            end_date: new Date().toISOString(),
          });

          allSales = salesResponse.data.sales || [];

          // Filtrer les ventes de cette session uniquement
          const sessionSales = allSales.filter((sale) => {
            const saleDate = new Date(sale.created_at);
            const sessionStart = new Date(drawer.openedAt);
            return saleDate >= sessionStart && sale.cashier_id === cashierSession.cashier_id;
          });

          salesSummary = {
            total_sales: sessionSales.reduce((sum, sale) => sum + sale.total_amount, 0),
            sales_count: sessionSales.length,
            cash_sales: sessionSales
              .filter((s) => s.payment_method === 'cash')
              .reduce((sum, s) => sum + s.total_amount, 0),
            card_sales: sessionSales
              .filter((s) => s.payment_method === 'card')
              .reduce((sum, s) => sum + s.total_amount, 0),
            mixed_sales: sessionSales
              .filter((s) => s.payment_method === 'mixed')
              .reduce((sum, s) => sum + s.total_amount, 0),
          };

          allSales = sessionSales;
        } catch (error) {
          console.error('Erreur récupération ventes:', error);
          salesSummary = {
            total_sales: movements
              .filter((m) => m.reason?.includes('Vente'))
              .reduce((sum, m) => sum + m.amount, 0),
            sales_count: cashierSession.sales_count || 0,
            cash_sales: movements
              .filter((m) => m.reason?.includes('Vente'))
              .reduce((sum, m) => sum + m.amount, 0),
            card_sales: 0,
            mixed_sales: 0,
          };
        }

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
            ...salesSummary,
          },
          movements: movements.map((m) => ({
            ...m,
            timestamp: m.created_at || new Date().toISOString(),
          })),
          sales: allSales,
          sales_summary: salesSummary,
          generated_at: new Date().toISOString(),
        });
      } else if (reportData) {
        setReport(reportData);
      }
    };

    fetchData();
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
    { id: 'sales', label: 'Ventes', icon: ShoppingBag },
    { id: 'movements', label: 'Mouvements', icon: TrendingUp },
    { id: 'details', label: 'Détails', icon: FileText },
  ];

  // Footer avec boutons d'action
  const footer = (
    <div className="flex justify-between w-full">
      <div className="flex items-center space-x-2">
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
        >
          <Printer className="h-4 w-4" />
          <span>Imprimer</span>
        </button>
      </div>

      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
      >
        Fermer
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rapport de session"
      icon={ClipboardList}
      footer={footer}
      maxWidth="max-w-5xl"
    >
      {/* Informations d'en-tête */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
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

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Ouverture</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {report.summary.opening_amount.toFixed(2)}€
                    </p>
                  </div>
                  <Wallet className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400">Fermeture</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {report.summary.closing_amount.toFixed(2)}€
                    </p>
                  </div>
                  <Wallet className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 dark:text-purple-400">Ventes</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {report.summary.total_sales.toFixed(2)}€
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      {report.summary.sales_count} transaction(s)
                    </p>
                  </div>
                  <ShoppingBag className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>

              <div
                className={`${
                  report.summary.variance >= 0
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                } border rounded-lg p-4`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-sm ${
                        report.summary.variance >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      Écart
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        report.summary.variance >= 0
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-red-900 dark:text-red-100'
                      }`}
                    >
                      {report.summary.variance >= 0 ? '+' : ''}
                      {report.summary.variance.toFixed(2)}€
                    </p>
                  </div>
                  {report.summary.variance >= 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Movement Summary */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Résumé des mouvements
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <ArrowUpCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">Entrées</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    +{report.summary.total_movements_in.toFixed(2)}€
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {report.movements.filter((m) => m.type === 'in').length} mouvement(s)
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <ArrowDownCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">Sorties</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    -{report.summary.total_movements_out.toFixed(2)}€
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {report.movements.filter((m) => m.type === 'out').length} mouvement(s)
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">Net</span>
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">Différence totale</p>
                </div>
              </div>
            </div>

            {/* Session Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Informations de session
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Durée de session :</span>
                    <span className="font-medium">
                      {Math.floor(report.summary.session_duration / 60)}h
                      {(report.summary.session_duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Nombre de mouvements :</span>
                    <span className="font-medium">{report.summary.movements_count}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Montant attendu :</span>
                    <span className="font-medium">
                      {report.summary.expected_amount.toFixed(2)}€
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Transactions :</span>
                    <span className="font-medium">{report.summary.sales_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <div className="space-y-4">
            {/* Sales Summary */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Résumé des ventes
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="text-gray-700 dark:text-gray-300">
                  <span>Total ventes :</span>
                  <span className="ml-2 font-bold text-lg text-gray-900 dark:text-gray-100">
                    {report.summary.total_sales.toFixed(2)}€
                  </span>
                </div>
                <div className="text-gray-700 dark:text-gray-300">
                  <span>Nombre de transactions :</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                    {report.summary.sales_count}
                  </span>
                </div>
                <div className="text-gray-700 dark:text-gray-300">
                  <span>Ticket moyen :</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                    {report.summary.sales_count > 0
                      ? (report.summary.total_sales / report.summary.sales_count).toFixed(2)
                      : '0.00'}
                    €
                  </span>
                </div>
                {/* 🆕 NOUVEAU : Total des réductions */}
                <div className="text-gray-700 dark:text-gray-300">
                  <span>Total réductions :</span>
                  <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                    {report.sales
                      ? report.sales
                          .reduce(
                            (sum, sale) =>
                              sum + (sale.total_discounts || sale.item_discounts_total || 0),
                            0
                          )
                          .toFixed(2)
                      : '0.00'}
                    €
                  </span>
                </div>
              </div>

              {/* 🆕 NOUVEAU : Détail des réductions si présentes */}
              {report.sales &&
                report.sales.some(
                  (sale) =>
                    (sale.total_discounts && sale.total_discounts > 0) ||
                    (sale.item_discounts_total && sale.item_discounts_total > 0)
                ) && (
                  <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <h5 className="font-medium mb-2 text-gray-900 dark:text-gray-100">
                      📊 Analyse des réductions
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                        <div className="text-red-700 dark:text-red-300">
                          <div className="font-medium">Ventes avec réductions</div>
                          <div className="text-lg font-bold">
                            {
                              report.sales.filter(
                                (sale) =>
                                  (sale.total_discounts && sale.total_discounts > 0) ||
                                  (sale.item_discounts_total && sale.item_discounts_total > 0)
                              ).length
                            }
                          </div>
                          <div className="text-xs">sur {report.summary.sales_count} ventes</div>
                        </div>
                      </div>

                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-3">
                        <div className="text-orange-700 dark:text-orange-300">
                          <div className="font-medium">Taux de réduction</div>
                          <div className="text-lg font-bold">
                            {report.summary.total_sales > 0
                              ? (
                                  (report.sales.reduce(
                                    (sum, sale) =>
                                      sum +
                                      (sale.total_discounts || sale.item_discounts_total || 0),
                                    0
                                  ) /
                                    report.summary.total_sales) *
                                  100
                                ).toFixed(1)
                              : '0.0'}
                            %
                          </div>
                          <div className="text-xs">du chiffre d'affaires</div>
                        </div>
                      </div>

                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
                        <div className="text-green-700 dark:text-green-300">
                          <div className="font-medium">Réduction moyenne</div>
                          <div className="text-lg font-bold">
                            {(() => {
                              const salesWithDiscounts = report.sales.filter(
                                (sale) =>
                                  (sale.total_discounts && sale.total_discounts > 0) ||
                                  (sale.item_discounts_total && sale.item_discounts_total > 0)
                              );
                              if (salesWithDiscounts.length === 0) return '0.00';
                              const totalDiscounts = salesWithDiscounts.reduce(
                                (sum, sale) =>
                                  sum + (sale.total_discounts || sale.item_discounts_total || 0),
                                0
                              );
                              return (totalDiscounts / salesWithDiscounts.length).toFixed(2);
                            })()}
                            €
                          </div>
                          <div className="text-xs">par vente réduite</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* Payment Methods Breakdown */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Répartition par mode de paiement
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-green-800 dark:text-green-200 font-medium">Espèces</span>
                    <span className="text-green-900 dark:text-green-100 font-bold">
                      {report.sales_summary.cash_sales.toFixed(2)}€
                    </span>
                  </div>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-800 dark:text-blue-200 font-medium">Carte</span>
                    <span className="text-blue-900 dark:text-blue-100 font-bold">
                      {report.sales_summary.card_sales.toFixed(2)}€
                    </span>
                  </div>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-800 dark:text-purple-200 font-medium">Mixte</span>
                    <span className="text-purple-900 dark:text-purple-100 font-bold">
                      {report.sales_summary.mixed_sales.toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales List */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Liste des ventes
              </h4>
              {!report.sales || report.sales.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Aucune vente enregistrée pour cette session
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {report.sales.map((sale, index) => (
                    <div
                      key={sale._id || index}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {sale.transaction_id}
                            </span>
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                sale.payment_method === 'cash'
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                  : sale.payment_method === 'card'
                                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                                    : 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200'
                              }`}
                            >
                              {sale.payment_method === 'cash'
                                ? 'Espèces'
                                : sale.payment_method === 'card'
                                  ? 'Carte'
                                  : 'Mixte'}
                            </span>
                            {/* 🆕 Badge réduction si présente */}
                            {(sale.total_discounts || sale.item_discounts_total) > 0 && (
                              <span className="inline-flex ...">💰 Réduit</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(sale.created_at).toLocaleString('fr-FR')} •{' '}
                            {sale.items?.length || 0} article(s)
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {sale.total_amount.toFixed(2)}€
                          </span>
                          {/* 🆕 Affichage économies */}
                          {(sale.total_discounts || sale.item_discounts_total) > 0 && (
                            <div className="text-xs text-green-600 dark:text-green-400">
                              -{(sale.total_discounts || sale.item_discounts_total).toFixed(2)}€
                              économisés
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sale Items avec détails réductions */}
                      {sale.items && sale.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="space-y-2">
                            {sale.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="space-y-1">
                                {/* Ligne principale de l'article */}
                                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                                  <span>
                                    {item.product_name} x{item.quantity}
                                    {item.unit_price && (
                                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                                        ({item.unit_price.toFixed(2)}€/u)
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-medium">
                                    {item.total_price.toFixed(2)}€
                                  </span>
                                </div>

                                {/* Réduction sur cet article si présente */}
                                {item.discount && item.discount.amount > 0 && (
                                  <div className="flex justify-between text-xs text-red-600 dark:text-red-400 ml-2">
                                    <span className="flex items-center space-x-1">
                                      <span>📉</span>
                                      <span>
                                        Réduction{' '}
                                        {item.discount.type === 'percentage'
                                          ? `${item.discount.value}%`
                                          : 'fixe'}
                                        {item.discount.reason && ` (${item.discount.reason})`}
                                      </span>
                                    </span>
                                    <span>-{item.discount.amount.toFixed(2)}€</span>
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Réductions globales de la vente */}
                            {sale.ticket_discount && sale.ticket_discount.amount > 0 && (
                              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                <div className="flex justify-between text-xs text-red-600 dark:text-red-400">
                                  <span className="flex items-center space-x-1">
                                    <span>🎯</span>
                                    <span>
                                      Réduction ticket{' '}
                                      {sale.ticket_discount.type === 'percentage'
                                        ? `${sale.ticket_discount.value}%`
                                        : 'fixe'}
                                      {sale.ticket_discount.reason &&
                                        ` (${sale.ticket_discount.reason})`}
                                    </span>
                                  </span>
                                  <span>-{sale.ticket_discount.amount.toFixed(2)}€</span>
                                </div>
                              </div>
                            )}

                            {/* Résumé des économies si réductions présentes */}
                            {(sale.total_discounts || 0) + (sale.item_discounts_total || 0) > 0 && (
                              <div className="pt-2 border-t border-green-200 dark:border-green-600">
                                <div className="flex justify-between text-xs text-green-600 dark:text-green-400 font-medium">
                                  <span className="flex items-center space-x-1">
                                    <span>💰</span>
                                    <span>Total économies</span>
                                  </span>
                                  <span>
                                    -
                                    {(
                                      Number(sale.total_discounts || 0) +
                                      Number(sale.item_discounts_total || 0)
                                    ).toFixed(2)}
                                    €
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Movements List */}
            <div className="space-y-2">
              {filteredMovements.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">Aucun mouvement trouvé</p>
                </div>
              ) : (
                filteredMovements.map((movement, index) => (
                  <div
                    key={movement.id || index}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-lg ${
                            movement.type === 'in'
                              ? 'bg-green-100 dark:bg-green-900/20'
                              : 'bg-red-100 dark:bg-red-900/20'
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
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {movement.reason || 'Mouvement'}
                            </span>
                            <span
                              className={`text-lg font-bold ${
                                movement.type === 'in' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {movement.type === 'in' ? '+' : '-'}
                              {movement.amount.toFixed(2)}€
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(movement.timestamp).toLocaleString('fr-FR')}
                            {movement.created_by && ` • Par ${movement.created_by}`}
                          </div>
                          {movement.notes && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Résumé financier
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium mb-2 text-gray-900 dark:text-gray-100">
                      Fond de caisse
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Ouverture :</span>
                        <span>{report.summary.opening_amount.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Fermeture :</span>
                        <span>{report.summary.closing_amount.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Attendu :</span>
                        <span>{report.summary.expected_amount.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-gray-300 dark:border-gray-600 pt-1">
                        <span className="text-gray-900 dark:text-gray-100">Écart :</span>
                        <span
                          className={
                            report.summary.variance >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {report.summary.variance >= 0 ? '+' : ''}
                          {report.summary.variance.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2 text-gray-900 dark:text-gray-100">
                      Activité commerciale
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Ventes :</span>
                        <span>{report.summary.sales_count}</span>
                      </div>
                      <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Chiffre d'affaires :</span>
                        <span>{report.summary.total_sales.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Mouvements :</span>
                        <span>{report.summary.movements_count}</span>
                      </div>
                      <div className="flex justify-between text-gray-700 dark:text-gray-300">
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
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Détail des mouvements
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">
                        Date/Heure
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">
                        Type
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                        Montant
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">
                        Raison
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.movements.map((movement, index) => (
                      <tr
                        key={movement.id || index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                          {new Date(movement.timestamp).toLocaleString('fr-FR')}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              movement.type === 'in'
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                            }`}
                          >
                            {movement.type === 'in' ? 'Entrée' : 'Sortie'}
                          </span>
                        </td>
                        <td
                          className={`border border-gray-300 dark:border-gray-600 px-4 py-2 text-right font-medium ${
                            movement.type === 'in' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {movement.type === 'in' ? '+' : '-'}
                          {movement.amount.toFixed(2)}€
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                          {movement.reason || '-'}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
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
    </BaseModal>
  );
};
export default DrawerReportModal; // src/features/pos/components/DrawerReportModal.jsx
