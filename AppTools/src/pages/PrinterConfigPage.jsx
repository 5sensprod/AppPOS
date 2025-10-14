import React, { useState } from 'react';
import {
  Printer,
  Scan,
  Power,
  PowerOff,
  TestTube,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  Info,
  Receipt,
  Scissors,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Ruler,
} from 'lucide-react';
import { usePrinter } from '../hooks/usePrinter';
import { useToastStore } from '../components/common/EntityTable/components/BatchActions/stores/useToastStore';

const PrinterConfigPage = () => {
  const {
    printers,
    selectedPrinter,
    connectionStatus,
    scanning,
    config,
    scanPrinters,
    connect,
    disconnect,
    setSelectedPrinter,
    updateConfig,
    printText,
    printReceipt,
    cutPaper,
    feedPaper,
    testPrinter,
    calibratePrinter,
    isConnected,
    isLoading,
  } = usePrinter();

  const { success, error, info } = useToastStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testing, setTesting] = useState(false);
  const [calibrating, setCalibrating] = useState(false);

  const [testMessage, setTestMessage] = useState({
    text: 'Test impression POS',
    options: {
      autoWrap: true,
      paperWidth: 80,
      fontSize: 10,
      bold: true,
      align: 'left',
      charsPerLine: 30, // VALEUR PAR DÉFAUT : 30 caractères
    },
  });

  const [receiptTest, setReceiptTest] = useState({
    storeName: 'MAGASIN TEST',
    storeAddress: '123 Rue de la Paix',
    cashierName: 'Caissier Test',
    items: [
      { name: 'Article 1', price: 15.99, quantity: 2 },
      { name: 'Article 2', price: 8.5, quantity: 1 },
    ],
    paymentMethod: 'CARTE',
  });

  const [lineTest, setLineTest] = useState({
    leftText: 'Total',
    rightText: '25.99 EUR',
    separator: '.',
  });

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Erreur de connexion:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  const handleSendTestMessage = async () => {
    try {
      await printText(testMessage.text, testMessage.options);
    } catch (error) {
      console.error('Erreur envoi message:', error);
    }
  };

  const handlePrintTestReceipt = async () => {
    try {
      const receiptOptions = {
        storeName: receiptTest.storeName,
        storeAddress: receiptTest.storeAddress,
        cashierName: receiptTest.cashierName,
        paymentMethod: receiptTest.paymentMethod,
        transactionId: `TEST-${Date.now()}`,
        fontSize: testMessage.options.fontSize,
        fontBold: testMessage.options.bold,
        paperWidth: testMessage.options.paperWidth,
        charsPerLine: testMessage.options.charsPerLine,
      };

      await printReceipt(receiptTest.items, receiptOptions);
    } catch (error) {
      console.error('Erreur impression ticket:', error);
    }
  };

  const handleCutPaper = async () => {
    try {
      await cutPaper();
    } catch (error) {
      console.error('Erreur coupe papier:', error);
    }
  };

  const handleFeedPaper = async () => {
    try {
      await feedPaper(3);
    } catch (error) {
      console.error('Erreur avance papier:', error);
    }
  };

  const handleRunTest = async () => {
    setTesting(true);
    try {
      await testPrinter();
    } catch (error) {
      console.error('Erreur test complet:', error);
    } finally {
      setTesting(false);
    }
  };

  // NOUVELLE FONCTION : Calibration avec toast
  const handleCalibrate = async () => {
    setCalibrating(true);
    try {
      await calibratePrinter(testMessage.options.paperWidth, testMessage.options.fontSize);
      success(
        'Test de calibration imprimé ! Trouvez la ligne qui ne déborde pas et utilisez son numéro dans "Caractères/ligne".',
        {
          duration: 8000,
          title: 'Calibration lancée',
        }
      );
    } catch (error) {
      console.error('Erreur calibration:', error);
      error('Erreur lors de la calibration : ' + error.message, {
        title: 'Erreur de calibration',
      });
    } finally {
      setCalibrating(false);
    }
  };

  const handleConfigChange = (field, value) => {
    try {
      updateConfig({ [field]: value });
    } catch (error) {
      console.error('Erreur mise à jour config:', error);
    }
  };

  const handleTestMessageChange = (field, value) => {
    if (field.startsWith('options.')) {
      const optionField = field.replace('options.', '');
      setTestMessage((prev) => ({
        ...prev,
        options: {
          ...prev.options,
          [optionField]: value,
        },
      }));
    } else {
      setTestMessage((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const StatusBadge = ({ connected, loading }) => {
    if (loading) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          Connexion...
        </span>
      );
    }

    if (connected) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Connecté
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Déconnecté
      </span>
    );
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Printer className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Configuration Imprimante POS
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Gérez votre imprimante de tickets et reçus
                </p>
              </div>
            </div>
            <StatusBadge connected={isConnected} loading={isLoading} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panneau de connexion */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connexion</h2>
              <button
                onClick={scanPrinters}
                disabled={scanning}
                className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
              >
                <Scan className={`w-4 h-4 mr-1 ${scanning ? 'animate-spin' : ''}`} />
                Scanner
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Imprimante
              </label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isConnected}
              >
                <option value="">Sélectionner une imprimante</option>
                {printers.map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    {printer.name} ({printer.type}){printer.posProbability > 70 && ' ⭐'}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <Settings className="w-4 h-4 mr-1" />
                Configuration avancée
              </button>

              {showAdvanced && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Largeur papier (mm)
                      </label>
                      <select
                        value={config.paperWidth}
                        onChange={(e) => handleConfigChange('paperWidth', parseInt(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                      >
                        <option value={58}>58mm</option>
                        <option value={80}>80mm</option>
                        <option value={110}>110mm</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Taille police
                      </label>
                      <select
                        value={config.fontSize}
                        onChange={(e) => handleConfigChange('fontSize', parseInt(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                      >
                        <option value={8}>8pt</option>
                        <option value={9}>9pt</option>
                        <option value={10}>10pt</option>
                        <option value={11}>11pt</option>
                        <option value={12}>12pt</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.fontBold}
                        onChange={(e) => handleConfigChange('fontBold', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">
                        Texte en gras
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  disabled={!selectedPrinter || isLoading}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Power className="w-4 h-4 mr-2" />
                  Se connecter
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <PowerOff className="w-4 h-4 mr-2" />
                  Déconnecter
                </button>
              )}
            </div>

            {connectionStatus.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                  <span className="text-sm text-red-800">{connectionStatus.error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Panneau de diagnostic */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Diagnostic</h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Statut</span>
                <StatusBadge connected={isConnected} loading={isLoading} />
              </div>

              {connectionStatus.printer && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Imprimante</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {connectionStatus.printer}
                  </span>
                </div>
              )}

              {connectionStatus.method && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Méthode</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {connectionStatus.method}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Impressions</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {connectionStatus.printCount || 0}
                </span>
              </div>

              {connectionStatus.lastPrint && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Dernière impression
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {connectionStatus.lastPrint}
                  </span>
                </div>
              )}
            </div>

            {connectionStatus.config && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <div className="flex items-center mb-2">
                  <Info className="w-4 h-4 text-blue-500 mr-2" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Configuration active
                  </span>
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                  <div>Papier: {connectionStatus.config.paperWidth}mm</div>
                  <div>Police: {connectionStatus.config.fontSize}pt</div>
                  <div>Gras: {connectionStatus.config.fontBold ? 'Oui' : 'Non'}</div>
                  <div>Caractères/ligne: {connectionStatus.config.charactersPerLine}</div>
                </div>
              </div>
            )}
          </div>

          {/* Panneau de test des messages */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Test d'impression
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={handleCalibrate}
                  disabled={!isConnected || calibrating}
                  className="inline-flex items-center px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 disabled:opacity-50"
                  title="Imprimer un test pour trouver la largeur optimale"
                >
                  <Ruler className={`w-4 h-4 mr-1 ${calibrating ? 'animate-pulse' : ''}`} />
                  Calibration
                </button>
                <button
                  onClick={handleRunTest}
                  disabled={!isConnected || testing}
                  className="inline-flex items-center px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50"
                >
                  <TestTube className={`w-4 h-4 mr-1 ${testing ? 'animate-pulse' : ''}`} />
                  Test complet
                </button>
              </div>
            </div>

            {/* Message de test simple */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Message simple
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Texte à imprimer
                  </label>
                  <textarea
                    value={testMessage.text}
                    onChange={(e) => handleTestMessageChange('text', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={3}
                    placeholder="Entrez votre texte de test..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Largeur papier
                    </label>
                    <select
                      value={testMessage.options.paperWidth}
                      onChange={(e) =>
                        handleTestMessageChange('options.paperWidth', parseInt(e.target.value))
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    >
                      <option value={30}>30mm</option>
                      <option value={58}>58mm</option>
                      <option value={80}>80mm</option>
                      <option value={110}>110mm</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Taille police
                    </label>
                    <select
                      value={testMessage.options.fontSize}
                      onChange={(e) =>
                        handleTestMessageChange('options.fontSize', parseInt(e.target.value))
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    >
                      <option value={8}>8pt</option>
                      <option value={9}>9pt</option>
                      <option value={10}>10pt</option>
                      <option value={11}>11pt</option>
                      <option value={12}>12pt</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Caractères/ligne
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={testMessage.options.charsPerLine || ''}
                      onChange={(e) =>
                        handleTestMessageChange(
                          'options.charsPerLine',
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                      placeholder="Auto"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center w-full">
                      <input
                        type="checkbox"
                        checked={testMessage.options.bold}
                        onChange={(e) => handleTestMessageChange('options.bold', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Gras</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-700 dark:text-gray-300">Alignement:</span>
                  <button
                    onClick={() => handleTestMessageChange('options.align', 'left')}
                    className={`p-1 rounded ${testMessage.options.align === 'left' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleTestMessageChange('options.align', 'center')}
                    className={`p-1 rounded ${testMessage.options.align === 'center' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleTestMessageChange('options.align', 'right')}
                    className={`p-1 rounded ${testMessage.options.align === 'right' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={handleSendTestMessage}
                  disabled={!isConnected}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Imprimer message
                </button>
              </div>
            </div>
          </div>

          {/* Panneau des tests avancés */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tests avancés
            </h2>
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                Ticket de caisse
              </h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={receiptTest.storeName}
                  onChange={(e) =>
                    setReceiptTest((prev) => ({ ...prev, storeName: e.target.value }))
                  }
                  placeholder="Nom magasin"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="text"
                  value={receiptTest.storeAddress}
                  onChange={(e) =>
                    setReceiptTest((prev) => ({ ...prev, storeAddress: e.target.value }))
                  }
                  placeholder="Adresse magasin"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="text"
                  value={receiptTest.cashierName}
                  onChange={(e) =>
                    setReceiptTest((prev) => ({ ...prev, cashierName: e.target.value }))
                  }
                  placeholder="Nom caissier"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <select
                  value={receiptTest.paymentMethod}
                  onChange={(e) =>
                    setReceiptTest((prev) => ({ ...prev, paymentMethod: e.target.value }))
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="CARTE">Carte bancaire</option>
                  <option value="ESPECES">Espèces</option>
                  <option value="CHEQUE">Chèque</option>
                  <option value="VIREMENT">Virement</option>
                </select>

                <div className="mt-3 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Articles :
                  </h4>
                  {receiptTest.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const newItems = [...receiptTest.items];
                          newItems[index].name = e.target.value;
                          setReceiptTest((prev) => ({ ...prev, items: newItems }));
                        }}
                        placeholder="Nom article"
                        className="px-2 py-1 text-xs border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => {
                          const newItems = [...receiptTest.items];
                          newItems[index].price = parseFloat(e.target.value) || 0;
                          setReceiptTest((prev) => ({ ...prev, items: newItems }));
                        }}
                        placeholder="Prix"
                        className="px-2 py-1 text-xs border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...receiptTest.items];
                          newItems[index].quantity = parseInt(e.target.value) || 1;
                          setReceiptTest((prev) => ({ ...prev, items: newItems }));
                        }}
                        placeholder="Qté"
                        className="px-2 py-1 text-xs border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  ))}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setReceiptTest((prev) => ({
                          ...prev,
                          items: [
                            ...prev.items,
                            { name: `Article ${prev.items.length + 1}`, price: 0, quantity: 1 },
                          ],
                        }));
                      }}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      + Article
                    </button>
                    {receiptTest.items.length > 1 && (
                      <button
                        onClick={() => {
                          setReceiptTest((prev) => ({
                            ...prev,
                            items: prev.items.slice(0, -1),
                          }));
                        }}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        - Article
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
                  <strong>Info :</strong> Le ticket utilisera les paramètres de formatage définis
                  dans "Message simple" (largeur papier, police, etc.)
                </div>

                <button
                  onClick={handlePrintTestReceipt}
                  disabled={!isConnected}
                  className="w-full px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50"
                >
                  <Receipt className="w-4 h-4 mr-2 inline" />
                  Imprimer ticket
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleFeedPaper}
                disabled={!isConnected}
                className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
              >
                <ArrowDown className="w-4 h-4 mr-1 inline" />
                Avancer
              </button>
              <button
                onClick={handleCutPaper}
                disabled={!isConnected}
                className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
              >
                <Scissors className="w-4 h-4 mr-1 inline" />
                Couper
              </button>
            </div>
          </div>
        </div>

        {/* Notes d'information */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <h4 className="font-medium mb-2">Notes d'utilisation :</h4>
              <ul className="space-y-1 list-disc list-inside text-xs">
                <li>
                  <strong>Calibration :</strong> Imprime des lignes de différentes longueurs (20-60
                  caractères). Utilisez le numéro de la dernière ligne qui NE déborde PAS.
                </li>
                <li>
                  <strong>Caractères/ligne (défaut 30) :</strong> Contrôle la largeur du ticket. Si
                  les totaux débordent → Réduisez. Si trop d'espace → Augmentez.
                </li>
                <li>
                  <strong>Taille de police :</strong> Plus grande (12pt) = moins de caractères. Plus
                  petite (8pt) = plus de caractères.
                </li>
                <li>
                  <strong>Largeurs papier :</strong> 30mm, 58mm, 80mm, 110mm supportées
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Panneau d'aide calibration */}
        <div className="mt-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start">
            <Ruler className="w-5 h-5 text-orange-500 mr-3 mt-0.5" />
            <div className="text-sm text-orange-800 dark:text-orange-300">
              <h4 className="font-medium mb-2">🎯 Calibration rapide :</h4>
              <ol className="space-y-2 list-decimal list-inside text-xs">
                <li>
                  Cliquez sur <strong>"Calibration"</strong>
                </li>
                <li>Regardez le ticket : lignes numérotées 20, 25, 30, 35, 40, 45, 50, 55, 60</li>
                <li>
                  Les lignes trop longues <strong>reviennent à la ligne</strong> (débordement
                  visible)
                </li>
                <li>
                  Notez le <strong>dernier numéro qui reste sur une seule ligne</strong>
                </li>
                <li>
                  Entrez ce nombre dans <strong>"Caractères/ligne"</strong>
                </li>
              </ol>
              <div className="mt-3 p-2 bg-orange-100 dark:bg-orange-900/40 rounded text-xs">
                <strong>Exemple :</strong> Si les lignes 20-35 restent sur une ligne, mais 40+
                débordent → Utilisez <strong>35</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterConfigPage;
