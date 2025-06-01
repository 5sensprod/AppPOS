import React, { useState } from 'react';
import {
  Monitor,
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
  Trash2,
  Info,
} from 'lucide-react';
import { useLCD } from '../hooks/useLCD';

const LCDConfigPage = () => {
  // Utilisation du hook LCD
  const {
    ports,
    selectedPort,
    connectionStatus,
    scanning,
    config,
    scanPorts,
    connect,
    disconnect,
    setSelectedPort,
    updateConfig,
    writeMessage,
    clearDisplay,
    showPrice,
    showTotal,
    showWelcome,
    showThankYou,
    showError,
    runTest,
    isConnected,
    isLoading,
  } = useLCD();

  // États locaux pour l'interface
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testing, setTesting] = useState(false);

  // États des messages de test
  const [testMessage, setTestMessage] = useState({
    line1: 'Test LCD',
    line2: 'Message test',
  });

  // États des messages POS prédéfinis
  const [posMessages, setPosMessages] = useState({
    price: { item_name: 'Article Test', price: 19.99 },
    total: { total: 156.78 },
    error: { error_message: 'Erreur test' },
  });

  // Handlers optimisés
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
      await writeMessage(testMessage.line1, testMessage.line2);
    } catch (error) {
      console.error('Erreur envoi message:', error);
    }
  };

  const handleClearDisplay = async () => {
    try {
      await clearDisplay();
    } catch (error) {
      console.error('Erreur effacement:', error);
    }
  };

  const handleRunTest = async () => {
    setTesting(true);
    try {
      await runTest();
    } catch (error) {
      console.error('Erreur test:', error);
    } finally {
      setTesting(false);
    }
  };

  const handlePosMessage = async (type, data) => {
    try {
      switch (type) {
        case 'price':
          await showPrice(data.item_name, data.price);
          break;
        case 'total':
          await showTotal(data.total);
          break;
        case 'welcome':
          await showWelcome();
          break;
        case 'thankyou':
          await showThankYou();
          break;
        case 'error':
          await showError(data.error_message);
          break;
        default:
          console.warn('Type de message POS inconnu:', type);
      }
    } catch (error) {
      console.error(`Erreur message POS ${type}:`, error);
    }
  };

  const handleConfigChange = (field, value) => {
    try {
      updateConfig({ [field]: value });
    } catch (error) {
      console.error('Erreur mise à jour config:', error);
    }
  };

  // Composant StatusBadge (définition unique)
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
              <Monitor className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Configuration LCD POS
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Gérez votre écran d'affichage client
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
                onClick={scanPorts}
                disabled={scanning}
                className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
              >
                <Scan className={`w-4 h-4 mr-1 ${scanning ? 'animate-spin' : ''}`} />
                Scanner
              </button>
            </div>

            {/* Sélection du port */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Port série
              </label>
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isConnected}
              >
                <option value="">Sélectionner un port</option>
                {ports.map((port) => (
                  <option key={port.path} value={port.path}>
                    {port.path} - {port.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Configuration avancée */}
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
                        Baud Rate
                      </label>
                      <select
                        value={config.baudRate}
                        onChange={(e) => handleConfigChange('baudRate', parseInt(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                      >
                        <option value={9600}>9600</option>
                        <option value={19200}>19200</option>
                        <option value={38400}>38400</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Parité
                      </label>
                      <select
                        value={config.parity}
                        onChange={(e) => handleConfigChange('parity', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                      >
                        <option value="none">Aucune</option>
                        <option value="even">Paire</option>
                        <option value="odd">Impaire</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Boutons de connexion */}
            <div className="flex space-x-3">
              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  disabled={!selectedPort || isLoading}
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

            {/* Erreur de connexion */}
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

              {connectionStatus.port && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Port actuel</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {connectionStatus.port}
                  </span>
                </div>
              )}

              {connectionStatus.connectionTime && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Connecté à</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {connectionStatus.connectionTime}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Messages envoyés</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {connectionStatus.messagesCount}
                </span>
              </div>

              {connectionStatus.lastUpdate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Dernière activité
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {connectionStatus.lastUpdate}
                  </span>
                </div>
              )}
            </div>

            {/* Informations techniques */}
            {connectionStatus.config && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <div className="flex items-center mb-2">
                  <Info className="w-4 h-4 text-blue-500 mr-2" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Configuration active
                  </span>
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                  <div>Baud: {connectionStatus.config.baudRate}</div>
                  <div>Bits: {connectionStatus.config.dataBits}</div>
                  <div>Parité: {connectionStatus.config.parity}</div>
                  <div>
                    Lignes: {connectionStatus.config.lines} x{' '}
                    {connectionStatus.config.charactersPerLine} car.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panneau de test des messages */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Messages de test
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={handleClearDisplay}
                  disabled={!isConnected}
                  className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Effacer
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

            {/* Message personnalisé */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Message personnalisé
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ligne 1 (max 20 car.)
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={testMessage.line1}
                    onChange={(e) => setTestMessage((prev) => ({ ...prev, line1: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Première ligne..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ligne 2 (max 20 car.)
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={testMessage.line2}
                    onChange={(e) => setTestMessage((prev) => ({ ...prev, line2: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Deuxième ligne..."
                  />
                </div>
                <button
                  onClick={handleSendTestMessage}
                  disabled={!isConnected}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer message
                </button>
              </div>
            </div>

            {/* Messages POS prédéfinis */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Messages POS
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePosMessage('welcome')}
                  disabled={!isConnected}
                  className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50"
                >
                  Bienvenue
                </button>
                <button
                  onClick={() => handlePosMessage('thankyou')}
                  disabled={!isConnected}
                  className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
                >
                  Merci
                </button>
              </div>
            </div>
          </div>

          {/* Panneau des messages POS avancés */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Messages POS avancés
            </h2>

            {/* Prix */}
            <div className="mb-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                Affichage prix
              </h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={posMessages.price.item_name}
                  onChange={(e) =>
                    setPosMessages((prev) => ({
                      ...prev,
                      price: { ...prev.price, item_name: e.target.value },
                    }))
                  }
                  placeholder="Nom article"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="number"
                  step="0.01"
                  value={posMessages.price.price}
                  onChange={(e) =>
                    setPosMessages((prev) => ({
                      ...prev,
                      price: { ...prev.price, price: parseFloat(e.target.value) || 0 },
                    }))
                  }
                  placeholder="Prix"
                  className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button
                  onClick={() => handlePosMessage('price', posMessages.price)}
                  disabled={!isConnected}
                  className="px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 disabled:opacity-50"
                >
                  Afficher
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="mb-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Total</h3>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  value={posMessages.total.total}
                  onChange={(e) =>
                    setPosMessages((prev) => ({
                      ...prev,
                      total: { total: parseFloat(e.target.value) || 0 },
                    }))
                  }
                  placeholder="Montant total"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button
                  onClick={() => handlePosMessage('total', posMessages.total)}
                  disabled={!isConnected}
                  className="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 disabled:opacity-50"
                >
                  Afficher
                </button>
              </div>
            </div>

            {/* Erreur */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                Message d'erreur
              </h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={posMessages.error.error_message}
                  onChange={(e) =>
                    setPosMessages((prev) => ({
                      ...prev,
                      error: { error_message: e.target.value },
                    }))
                  }
                  placeholder="Message d'erreur"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button
                  onClick={() => handlePosMessage('error', posMessages.error)}
                  disabled={!isConnected}
                  className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
                >
                  Afficher
                </button>
              </div>
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
                <li>Maximum 2 lignes de 20 caractères chacune</li>
                <li>Les caractères accentués sont automatiquement convertis</li>
                <li>L'écran est effacé automatiquement avant chaque nouveau message</li>
                <li>Seuls les ports COM Windows sont supportés</li>
                <li>Connexion exclusive (un seul client à la fois)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LCDConfigPage;
