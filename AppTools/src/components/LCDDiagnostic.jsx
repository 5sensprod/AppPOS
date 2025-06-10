// src/features/pos/components/LCDDiagnostic.jsx
import React, { useState } from 'react';
import {
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Wifi,
  WifiOff,
  Clock,
  Info,
} from 'lucide-react';

const LCDDiagnostic = ({
  lcdConnected,
  lcdError,
  diagnosticInfo,
  onReconnect,
  onReset,
  isTemporarilyDisabled,
  consecutiveErrors,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    if (isTemporarilyDisabled) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    if (lcdConnected) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusText = () => {
    if (isTemporarilyDisabled) {
      return 'Suspendu';
    }
    if (lcdConnected) {
      return 'Connecté';
    }
    return 'Déconnecté';
  };

  const getStatusColor = () => {
    if (isTemporarilyDisabled) {
      return 'border-orange-400 bg-orange-50 dark:bg-orange-900';
    }
    if (lcdConnected) {
      return 'border-green-400 bg-green-50 dark:bg-green-900';
    }
    return 'border-red-400 bg-red-50 dark:bg-red-900';
  };

  return (
    <div className={`mb-4 border rounded-lg p-4 ${getStatusColor()}`}>
      {/* Header compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Monitor className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="font-medium text-gray-900 dark:text-white">LCD {getStatusText()}</span>
            {consecutiveErrors > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({consecutiveErrors}/3 erreurs)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Actions rapides */}
          {isTemporarilyDisabled && (
            <button
              onClick={onReset}
              className="text-orange-600 hover:text-orange-800 text-sm underline flex items-center"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Réactiver
            </button>
          )}

          <button
            onClick={onReconnect}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Reconnecter
          </button>

          <button
            onClick={() => (window.location.href = '/settings/lcd')}
            className="text-gray-600 hover:text-gray-800 text-sm underline"
          >
            <Settings className="h-3 w-3 mr-1 inline" />
            Configurer
          </button>

          {/* Toggle diagnostic détaillé */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 ml-2"
          >
            <Info className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Message d'erreur principal */}
      {lcdError && <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">{lcdError}</div>}

      {/* Diagnostic détaillé (collapsible) */}
      {isExpanded && diagnosticInfo && (
        <div className="mt-4 space-y-3 text-sm border-t pt-3">
          {/* Dernière vérification */}
          {diagnosticInfo.lastCheck && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Dernière vérification:
              </span>
              <span className="font-mono text-gray-900 dark:text-white">
                {diagnosticInfo.lastCheck}
              </span>
            </div>
          )}

          {/* Informations de connexion */}
          {diagnosticInfo.display && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-2">
              <div className="font-medium text-gray-900 dark:text-white mb-1">Écran connecté:</div>
              <div className="space-y-1">
                <div>
                  Port: <span className="font-mono">{diagnosticInfo.display.path}</span>
                </div>
                <div>Type: {diagnosticInfo.display.type}</div>
                {diagnosticInfo.display.config && (
                  <div>
                    Baudrate: {diagnosticInfo.display.config.baudRate} | Bits:{' '}
                    {diagnosticInfo.display.config.dataBits} | Parité:{' '}
                    {diagnosticInfo.display.config.parity}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session info */}
          {diagnosticInfo.session && (
            <div className="bg-blue-50 dark:bg-blue-900 rounded p-2">
              <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Session active:
              </div>
              <div>
                Client: {diagnosticInfo.session.clientType} | Connecté:{' '}
                {new Date(diagnosticInfo.session.connectedAt).toLocaleTimeString('fr-FR')}
              </div>
            </div>
          )}

          {/* Dernière erreur */}
          {diagnosticInfo.lastError && (
            <div className="bg-red-50 dark:bg-red-900 rounded p-2">
              <div className="font-medium text-red-900 dark:text-red-100 mb-1">
                Dernière erreur ({diagnosticInfo.lastError.time}):
              </div>
              <div className="space-y-1">
                <div>Opération: {diagnosticInfo.lastError.operation}</div>
                <div>Type: {diagnosticInfo.lastError.type}</div>
                <div>Message: {diagnosticInfo.lastError.message}</div>
                <div className="text-xs italic">💡 {diagnosticInfo.lastError.suggestion}</div>
              </div>
            </div>
          )}

          {/* Ports disponibles */}
          {diagnosticInfo.availablePorts && (
            <div className="bg-yellow-50 dark:bg-yellow-900 rounded p-2">
              <div className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                Ports détectés ({diagnosticInfo.availablePorts.length}):
              </div>
              <div className="space-y-1">
                {diagnosticInfo.availablePorts.map((port, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-mono">{port.path}</span>
                    <span className="text-xs">
                      {port.available ? (
                        <span className="text-green-600 flex items-center">
                          <Wifi className="h-3 w-3 mr-1" />
                          Disponible
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center">
                          <WifiOff className="h-3 w-3 mr-1" />
                          Occupé ({port.usedBy})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connexions actives */}
          {diagnosticInfo.activeConnections && diagnosticInfo.activeConnections.length > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900 rounded p-2">
              <div className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                Connexions actives:
              </div>
              {diagnosticInfo.activeConnections.map((conn, index) => (
                <div key={index} className="text-xs">
                  {conn.port} - {conn.clientType} (Session: {conn.sessionId.slice(-8)})
                </div>
              ))}
            </div>
          )}

          {/* Tentatives de reconnexion */}
          {diagnosticInfo.attempts > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Tentatives de connexion: {diagnosticInfo.attempts}
            </div>
          )}

          {/* Dernière tentative de reconnexion */}
          {diagnosticInfo.reconnectionAttempt && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Dernière tentative auto-reconnexion: {diagnosticInfo.reconnectionAttempt}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LCDDiagnostic;
